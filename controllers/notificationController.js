import Rental from '../models/Rental.js';
import HirePurchase from '../models/HirePurchase.js';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getSystemAlerts = asyncHandler(async (req, res) => {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdueRentals, rentalsEndingSoon, overdueInstallments, maintenanceDue, insuranceExpiring] = await Promise.all([
    Rental.find({ status: 'active', endDate: { $lt: now } }).populate('vehicle', 'make model registrationNumber').populate('customer', 'firstName lastName phone').lean(),
    Rental.find({ status: 'active', endDate: { $gte: now, $lte: in3Days } }).populate('vehicle', 'make model registrationNumber').populate('customer', 'firstName lastName phone').lean(),
    HirePurchase.find({ status: 'active', 'schedule': { $elemMatch: { status: 'pending', dueDate: { $lt: now } } } }).populate('vehicle', 'make model registrationNumber').populate('customer', 'firstName lastName phone').lean(),
    Maintenance.find({ nextServiceDate: { $lte: in7Days }, status: { $ne: 'completed' } }).populate('vehicle', 'make model registrationNumber').lean(),
    Vehicle.find({ insuranceExpiry: { $lte: in7Days }, status: { $ne: 'sold' } }).select('make model registrationNumber insuranceExpiry').lean(),
  ]);

  const alerts = [];
  overdueRentals.forEach(r => alerts.push({ type: 'overdue_rental', severity: 'critical', message: `Rental overdue: ${r.vehicle?.registrationNumber} — ${r.customer?.firstName} ${r.customer?.lastName}`, data: r }));
  rentalsEndingSoon.forEach(r => alerts.push({ type: 'rental_ending', severity: 'warning', message: `Rental ending soon: ${r.vehicle?.registrationNumber} — due ${new Date(r.endDate).toLocaleDateString()}`, data: r }));
  overdueInstallments.forEach(h => alerts.push({ type: 'overdue_installment', severity: 'critical', message: `HP installment overdue: ${h.vehicle?.registrationNumber} — ${h.customer?.firstName} ${h.customer?.lastName}`, data: h }));
  maintenanceDue.forEach(m => alerts.push({ type: 'maintenance_due', severity: 'warning', message: `Maintenance due: ${m.vehicle?.registrationNumber} — ${m.type}`, data: m }));
  insuranceExpiring.forEach(v => alerts.push({ type: 'insurance_expiring', severity: 'warning', message: `Insurance expiring: ${v.registrationNumber} — ${new Date(v.insuranceExpiry).toLocaleDateString()}`, data: v }));

  res.status(200).json({ success: true, count: alerts.length, alerts });
});

export { getSystemAlerts };

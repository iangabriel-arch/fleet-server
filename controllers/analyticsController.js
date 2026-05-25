import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
import Rental from '../models/Rental.js';
import HirePurchase from '../models/HirePurchase.js';
import Payment from '../models/Payment.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getDashboardSummary = asyncHandler(async (req, res) => {
  const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [vehicleStats, totalCustomers, activeRentals, activeHP, monthlyRevenue, overdueRentals] = await Promise.all([
    Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Customer.countDocuments(),
    Rental.countDocuments({ status: 'active' }),
    HirePurchase.countDocuments({ status: 'active' }),
    Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Rental.countDocuments({ status: 'active', endDate: { $lt: now } }),
  ]);
  const fleetSummary = { total: 0, available: 0, rented: 0, under_maintenance: 0, hire_purchase: 0, sold: 0 };
  vehicleStats.forEach(({ _id, count }) => { if (_id in fleetSummary) fleetSummary[_id] = count; fleetSummary.total += count; });
  res.status(200).json({ success: true, summary: { fleet: fleetSummary, totalCustomers, activeRentals, activeHirePurchases: activeHP, monthlyRevenue: monthlyRevenue[0]?.total || 0, overdueRentals } });
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;
  const startDate = new Date(); startDate.setMonth(startDate.getMonth() - parseInt(months));
  const revenue = await Payment.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: startDate } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
  res.status(200).json({ success: true, revenue });
});

const getVehicleUtilization = asyncHandler(async (req, res) => {
  const utilization = await Vehicle.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, avgDailyRate: { $avg: '$dailyRate' } } },
    { $sort: { count: -1 } },
  ]);
  const total = utilization.reduce((sum, s) => sum + s.count, 0);
  const activeStatuses = ['rented', 'hire_purchase', 'reserved'];
  const activeCount = utilization.filter(s => activeStatuses.includes(s._id)).reduce((sum, s) => sum + s.count, 0);
  const utilizationRate = total > 0 ? parseFloat(((activeCount / total) * 100).toFixed(1)) : 0;
  res.status(200).json({ success: true, utilizationRate, total, breakdown: utilization });
});

export { getDashboardSummary, getRevenueAnalytics, getVehicleUtilization };

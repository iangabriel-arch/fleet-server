import HirePurchase from '../models/HirePurchase.js';
import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const generateSchedule = (startDate, totalMonths, monthlyInstallment) => {
  const schedule = [];
  for (let i = 1; i <= totalMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    schedule.push({ installmentNumber: i, dueDate, amount: monthlyInstallment, status: 'pending', paidDate: null, paidAmount: 0 });
  }
  return schedule;
};

const getAllHirePurchases = asyncHandler(async (req, res) => {
  const { status, customerId, vehicleId, page = 1, limit = 15 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customer = customerId;
  if (vehicleId) filter.vehicle = vehicleId;
  const pageNum = Math.max(1, parseInt(page)); const limitNum = Math.min(100, Math.max(1, parseInt(limit))); const skip = (pageNum - 1) * limitNum;
  const [agreements, total] = await Promise.all([HirePurchase.find(filter).populate('vehicle', 'make model year registrationNumber sellingPrice').populate('customer', 'firstName lastName phone nationalId').populate('createdBy', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(), HirePurchase.countDocuments(filter)]);
  res.status(200).json({ success: true, total, page: pageNum, totalPages: Math.ceil(total / limitNum), count: agreements.length, agreements });
});

const getHirePurchaseById = asyncHandler(async (req, res) => {
  const agreement = await HirePurchase.findById(req.params.id).populate('vehicle', 'make model year registrationNumber sellingPrice images').populate('customer', 'firstName lastName phone email nationalId drivingLicense address').populate('createdBy', 'name role');
  if (!agreement) return res.status(404).json({ success: false, message: `No hire purchase agreement found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, agreement });
});

const createHirePurchase = asyncHandler(async (req, res) => {
  const { vehicle: vehicleId, customer: customerId, depositAmount, totalMonths, interestRate = 0, startDate } = req.body;
  const [vehicle, customer] = await Promise.all([Vehicle.findById(vehicleId), Customer.findById(customerId)]);
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
  if (vehicle.status !== 'available') return res.status(400).json({ success: false, message: `Vehicle is not available. Current status: ${vehicle.status}` });
  if (customer.isBlacklisted) return res.status(403).json({ success: false, message: `Customer is blacklisted: ${customer.blacklistReason}` });
  if (!vehicle.sellingPrice) return res.status(400).json({ success: false, message: 'Vehicle has no selling price set. Update the vehicle first.' });
  const principalAmount = vehicle.sellingPrice - depositAmount;
  if (principalAmount <= 0) return res.status(400).json({ success: false, message: 'Deposit amount cannot exceed or equal the vehicle price.' });
  const totalInterest = parseFloat(((principalAmount * (interestRate / 100) * totalMonths) / 12).toFixed(2));
  const totalRepayable = parseFloat((principalAmount + totalInterest).toFixed(2));
  const monthlyInstallment = parseFloat((totalRepayable / totalMonths).toFixed(2));
  const start = startDate ? new Date(startDate) : new Date();
  const schedule = generateSchedule(start, totalMonths, monthlyInstallment);
  const agreement = await HirePurchase.create({ vehicle: vehicleId, customer: customerId, vehiclePrice: vehicle.sellingPrice, depositAmount, principalAmount, interestRate, totalInterest, totalRepayable, monthlyInstallment, totalMonths, remainingBalance: totalRepayable, startDate: start, schedule, status: 'active', createdBy: req.user._id });
  await Vehicle.findByIdAndUpdate(vehicleId, { status: 'hire_purchase', currentHirePurchase: agreement._id });
  await Customer.findByIdAndUpdate(customerId, { $inc: { totalHirePurchases: 1, outstandingBalance: totalRepayable } });
  res.status(201).json({ success: true, message: 'Hire purchase agreement created successfully.', agreement });
});

const recordInstallmentPayment = asyncHandler(async (req, res) => {
  const { installmentNumber, paidAmount, paymentMethod = 'cash' } = req.body;
  const agreement = await HirePurchase.findById(req.params.id);
  if (!agreement) return res.status(404).json({ success: false, message: 'Agreement not found.' });
  if (agreement.status !== 'active') return res.status(400).json({ success: false, message: `Agreement is not active. Status: ${agreement.status}` });
  const installment = agreement.schedule.find(s => s.installmentNumber === installmentNumber);
  if (!installment) return res.status(404).json({ success: false, message: `Installment #${installmentNumber} not found.` });
  if (installment.status === 'paid') return res.status(400).json({ success: false, message: `Installment #${installmentNumber} is already paid.` });
  installment.status = 'paid'; installment.paidDate = new Date(); installment.paidAmount = paidAmount; installment.paymentMethod = paymentMethod;
  agreement.paidMonths += 1; agreement.totalPaid = parseFloat((agreement.totalPaid + paidAmount).toFixed(2)); agreement.remainingBalance = parseFloat((agreement.remainingBalance - paidAmount).toFixed(2));
  if (agreement.paidMonths >= agreement.totalMonths || agreement.remainingBalance <= 0) { agreement.status = 'completed'; agreement.completionDate = new Date(); await Vehicle.findByIdAndUpdate(agreement.vehicle, { status: 'sold', currentHirePurchase: null }); }
  await agreement.save();
  await Customer.findByIdAndUpdate(agreement.customer, { $inc: { outstandingBalance: -paidAmount } });
  res.status(200).json({ success: true, message: `Installment #${installmentNumber} payment recorded.`, agreement });
});

const repossessVehicle = asyncHandler(async (req, res) => {
  const agreement = await HirePurchase.findById(req.params.id);
  if (!agreement) return res.status(404).json({ success: false, message: 'Agreement not found.' });
  if (agreement.status !== 'active') return res.status(400).json({ success: false, message: 'Only active agreements can be repossessed.' });
  agreement.status = 'repossessed'; agreement.repossessionDate = new Date(); agreement.repossessionReason = req.body.reason || 'Payment default';
  await agreement.save();
  await Vehicle.findByIdAndUpdate(agreement.vehicle, { status: 'repossessed', currentHirePurchase: null });
  res.status(200).json({ success: true, message: 'Vehicle repossessed and agreement closed.', agreement });
});

export { getAllHirePurchases, getHirePurchaseById, createHirePurchase, recordInstallmentPayment, repossessVehicle };

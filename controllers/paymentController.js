import Payment from '../models/Payment.js';
import Rental from '../models/Rental.js';
import HirePurchase from '../models/HirePurchase.js';
import Customer from '../models/Customer.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getAllPayments = asyncHandler(async (req, res) => {
  const { type, status, customerId, startDate, endDate, page = 1, limit = 15 } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (customerId) filter.customer = customerId;
  if (startDate || endDate) { filter.createdAt = {}; if (startDate) filter.createdAt.$gte = new Date(startDate); if (endDate) filter.createdAt.$lte = new Date(endDate); }
  const pageNum = Math.max(1, parseInt(page)); const limitNum = Math.min(100, Math.max(1, parseInt(limit))); const skip = (pageNum - 1) * limitNum;
  const [payments, total] = await Promise.all([Payment.find(filter).populate('customer', 'firstName lastName phone').populate('rental', 'startDate endDate totalCost').populate('hirePurchase', 'vehiclePrice monthlyInstallment').populate('recordedBy', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(), Payment.countDocuments(filter)]);
  res.status(200).json({ success: true, total, page: pageNum, totalPages: Math.ceil(total / limitNum), count: payments.length, payments });
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('customer', 'firstName lastName phone email').populate('rental').populate('hirePurchase').populate('recordedBy', 'name role');
  if (!payment) return res.status(404).json({ success: false, message: `No payment found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, payment });
});

const recordPayment = asyncHandler(async (req, res) => {
  const { type, customer: customerId, rental: rentalId, hirePurchase: hpId, amount, method = 'cash', reference, notes } = req.body;
  if (!type || !customerId || !amount) return res.status(400).json({ success: false, message: 'type, customer, and amount are required.' });
  const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const payment = await Payment.create({ type, customer: customerId, rental: rentalId || null, hirePurchase: hpId || null, amount, method, reference, receiptNumber, status: 'completed', notes, recordedBy: req.user._id });
  res.status(201).json({ success: true, message: 'Payment recorded successfully.', payment });
});

const getPaymentStats = asyncHandler(async (req, res) => {
  const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalRevenue, monthlyRevenue, byType] = await Promise.all([
    Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);
  res.status(200).json({ success: true, stats: { totalRevenue: totalRevenue[0]?.total || 0, monthlyRevenue: monthlyRevenue[0]?.total || 0, byType } });
});

export { getAllPayments, getPaymentById, recordPayment, getPaymentStats };

import Customer from '../models/Customer.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getAllCustomers = asyncHandler(async (req, res) => {
  const { search, isBlacklisted, sortBy = 'createdAt', order = 'desc', page = 1, limit = 15 } = req.query;
  const filter = {};
  if (search) filter.$text = { $search: search };
  if (isBlacklisted !== undefined) filter.isBlacklisted = isBlacklisted === 'true';
  const pageNum = Math.max(1, parseInt(page)); const limitNum = Math.min(100, Math.max(1, parseInt(limit))); const skip = (pageNum - 1) * limitNum;
  const [customers, total] = await Promise.all([Customer.find(filter).populate('addedBy', 'name role').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(limitNum).lean({ virtuals: true }), Customer.countDocuments(filter)]);
  res.status(200).json({ success: true, total, page: pageNum, totalPages: Math.ceil(total / limitNum), count: customers.length, customers });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id).populate('addedBy', 'name role email');
  if (!customer) return res.status(404).json({ success: false, message: `No customer found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, customer });
});

const createCustomer = asyncHandler(async (req, res) => {
  delete req.body.totalRentals; delete req.body.totalHirePurchases; delete req.body.outstandingBalance; delete req.body.isBlacklisted;
  req.body.addedBy = req.user._id;
  const customer = await Customer.create(req.body);
  res.status(201).json({ success: true, message: 'Customer registered successfully.', customer });
});

const updateCustomer = asyncHandler(async (req, res) => {
  delete req.body.totalRentals; delete req.body.totalHirePurchases; delete req.body.outstandingBalance; delete req.body.addedBy;
  if (req.user.role !== 'admin') { delete req.body.isBlacklisted; delete req.body.blacklistReason; }
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) return res.status(404).json({ success: false, message: `No customer found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, message: 'Customer updated successfully.', customer });
});

const toggleBlacklist = asyncHandler(async (req, res) => {
  const { isBlacklisted, blacklistReason } = req.body;
  if (typeof isBlacklisted !== 'boolean') return res.status(400).json({ success: false, message: 'Please provide isBlacklisted as true or false.' });
  if (isBlacklisted && !blacklistReason) return res.status(400).json({ success: false, message: 'A reason is required when blacklisting a customer.' });
  const customer = await Customer.findByIdAndUpdate(req.params.id, { isBlacklisted, blacklistReason: isBlacklisted ? blacklistReason : null }, { new: true, runValidators: true });
  if (!customer) return res.status(404).json({ success: false, message: `No customer found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, message: `Customer ${customer.fullName} has been ${isBlacklisted ? 'blacklisted' : 'removed from blacklist'}.`, customer });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ success: false, message: `No customer found with ID: ${req.params.id}` });
  if (customer.totalRentals > 0 || customer.totalHirePurchases > 0) return res.status(400).json({ success: false, message: 'Cannot delete a customer with rental or hire purchase history. Blacklist them instead.' });
  await customer.deleteOne();
  res.status(200).json({ success: true, message: 'Customer record permanently deleted.' });
});

const getCustomerStats = asyncHandler(async (req, res) => {
  const [total, blacklisted, withBalance] = await Promise.all([Customer.countDocuments(), Customer.countDocuments({ isBlacklisted: true }), Customer.countDocuments({ outstandingBalance: { $gt: 0 } })]);
  const topDebtors = await Customer.find({ outstandingBalance: { $gt: 0 } }).sort({ outstandingBalance: -1 }).limit(5).select('firstName lastName phone outstandingBalance').lean({ virtuals: true });
  res.status(200).json({ success: true, stats: { total, blacklisted, withOutstandingBalance: withBalance, topDebtors } });
});

export { getAllCustomers, getCustomerById, createCustomer, updateCustomer, toggleBlacklist, deleteCustomer, getCustomerStats };

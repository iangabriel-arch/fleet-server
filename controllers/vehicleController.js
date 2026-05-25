import Vehicle from '../models/Vehicle.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getAllVehicles = asyncHandler(async (req, res) => {
  const { search, status, category, fuelType, transmission, minRate, maxRate, sortBy = 'createdAt', order = 'desc', page = 1, limit = 12 } = req.query;
  const filter = {};
  if (search) filter.$text = { $search: search };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (fuelType) filter.fuelType = fuelType;
  if (transmission) filter.transmission = transmission;
  if (minRate || maxRate) { filter.dailyRate = {}; if (minRate) filter.dailyRate.$gte = Number(minRate); if (maxRate) filter.dailyRate.$lte = Number(maxRate); }
  const pageNum = Math.max(1, parseInt(page)); const limitNum = Math.min(100, Math.max(1, parseInt(limit))); const skip = (pageNum - 1) * limitNum;
  const [vehicles, total] = await Promise.all([Vehicle.find(filter).populate('addedBy', 'name role').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(limitNum).lean({ virtuals: true }), Vehicle.countDocuments(filter)]);
  res.status(200).json({ success: true, total, page: pageNum, totalPages: Math.ceil(total / limitNum), count: vehicles.length, vehicles });
});

const getVehicleById = asyncHandler(async (req, res) => {
  let query = Vehicle.findById(req.params.id).populate('addedBy', 'name role email').populate('currentRental', 'startDate endDate status').populate('currentHirePurchase', 'monthlyInstallment remainingBalance status');
  if (req.user.role === 'admin') query = query.select('+purchasePrice');
  const vehicle = await query;
  if (!vehicle) return res.status(404).json({ success: false, message: `No vehicle found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, vehicle });
});

const createVehicle = asyncHandler(async (req, res) => {
  req.body.addedBy = req.user._id;
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json({ success: true, message: 'Vehicle added to fleet successfully.', vehicle });
});

const updateVehicle = asyncHandler(async (req, res) => {
  const protectedStatuses = ['rented', 'hire_purchase', 'sold'];
  if (req.body.status && protectedStatuses.includes(req.body.status)) return res.status(400).json({ success: false, message: `Status '${req.body.status}' can only be set through its dedicated workflow.` });
  if (req.user.role !== 'admin') { delete req.body.purchasePrice; delete req.body.sellingPrice; delete req.body.dailyRate; delete req.body.weeklyRate; delete req.body.monthlyRate; }
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!vehicle) return res.status(404).json({ success: false, message: `No vehicle found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, message: 'Vehicle updated successfully.', vehicle });
});

const updateVehicleStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Please provide a status value.' });
  if (req.user.role === 'maintenance' && !['available', 'under_maintenance'].includes(status)) return res.status(403).json({ success: false, message: 'Maintenance staff can only set status to available or under_maintenance.' });
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!vehicle) return res.status(404).json({ success: false, message: `No vehicle found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, message: `Vehicle status updated to '${status}'.`, vehicle });
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, message: `No vehicle found with ID: ${req.params.id}` });
  if (['rented', 'hire_purchase', 'reserved'].includes(vehicle.status)) return res.status(400).json({ success: false, message: `Cannot delete a vehicle with status '${vehicle.status}'. Resolve the active agreement first.` });
  if (!vehicle.currentRental && !vehicle.currentHirePurchase && vehicle.status === 'available') { await vehicle.deleteOne(); return res.status(200).json({ success: true, message: 'Vehicle permanently removed from fleet.' }); }
  vehicle.status = 'repossessed'; vehicle.notes = `[Archived ${new Date().toISOString()}] ${vehicle.notes || ''}`.trim(); await vehicle.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Vehicle archived successfully.', vehicle });
});

const getVehicleStats = asyncHandler(async (req, res) => {
  const stats = await Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const summary = { total: 0, available: 0, rented: 0, reserved: 0, under_maintenance: 0, hire_purchase: 0, sold: 0, repossessed: 0 };
  stats.forEach(({ _id, count }) => { if (_id in summary) summary[_id] = count; summary.total += count; });
  res.status(200).json({ success: true, stats: summary });
});

export { getAllVehicles, getVehicleById, createVehicle, updateVehicle, updateVehicleStatus, deleteVehicle, getVehicleStats };

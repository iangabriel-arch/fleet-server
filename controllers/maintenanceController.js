import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getAllMaintenance = asyncHandler(async (req, res) => {
  const { status, vehicleId, type, page = 1, limit = 15 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (vehicleId) filter.vehicle = vehicleId;
  if (type) filter.type = type;
  const pageNum = Math.max(1, parseInt(page)); const limitNum = Math.min(100, Math.max(1, parseInt(limit))); const skip = (pageNum - 1) * limitNum;
  const [records, total] = await Promise.all([Maintenance.find(filter).populate('vehicle', 'make model year registrationNumber').populate('createdBy', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(), Maintenance.countDocuments(filter)]);
  res.status(200).json({ success: true, total, page: pageNum, totalPages: Math.ceil(total / limitNum), count: records.length, records });
});

const getMaintenanceById = asyncHandler(async (req, res) => {
  const record = await Maintenance.findById(req.params.id).populate('vehicle', 'make model year registrationNumber mileage').populate('createdBy', 'name role');
  if (!record) return res.status(404).json({ success: false, message: `No maintenance record found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, record });
});

const createMaintenance = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.body.vehicle);
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
  req.body.createdBy = req.user._id;
  const record = await Maintenance.create(req.body);
  if (req.body.status === 'in_progress') await Vehicle.findByIdAndUpdate(req.body.vehicle, { status: 'under_maintenance' });
  res.status(201).json({ success: true, message: 'Maintenance record created.', record });
});

const updateMaintenance = asyncHandler(async (req, res) => {
  const record = await Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!record) return res.status(404).json({ success: false, message: `No maintenance record found with ID: ${req.params.id}` });
  if (req.body.status === 'completed') await Vehicle.findByIdAndUpdate(record.vehicle, { status: 'available', lastServiceDate: new Date(), nextServiceDate: req.body.nextServiceDate || null });
  res.status(200).json({ success: true, message: 'Maintenance record updated.', record });
});

const deleteMaintenance = asyncHandler(async (req, res) => {
  const record = await Maintenance.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: `No maintenance record found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, message: 'Maintenance record deleted.' });
});

const getDueMaintenance = asyncHandler(async (req, res) => {
  const upcoming = await Maintenance.find({ nextServiceDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, status: { $ne: 'completed' } }).populate('vehicle', 'make model year registrationNumber').lean();
  res.status(200).json({ success: true, count: upcoming.length, records: upcoming });
});

export { getAllMaintenance, getMaintenanceById, createMaintenance, updateMaintenance, deleteMaintenance, getDueMaintenance };

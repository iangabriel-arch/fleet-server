import Rental from '../models/Rental.js';
import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getAllRentals = asyncHandler(async (req, res) => {
  const { status, customerId, vehicleId, sortBy = 'createdAt', order = 'desc', page = 1, limit = 15 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customer = customerId;
  if (vehicleId) filter.vehicle = vehicleId;
  const pageNum = Math.max(1, parseInt(page)); const limitNum = Math.min(100, Math.max(1, parseInt(limit))); const skip = (pageNum - 1) * limitNum;
  const [rentals, total] = await Promise.all([Rental.find(filter).populate('vehicle', 'make model year registrationNumber dailyRate').populate('customer', 'firstName lastName phone nationalId').populate('createdBy', 'name role').sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(limitNum).lean(), Customer.countDocuments(filter)]);
  res.status(200).json({ success: true, total, page: pageNum, totalPages: Math.ceil(total / limitNum), count: rentals.length, rentals });
});

const getRentalById = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.id).populate('vehicle', 'make model year registrationNumber dailyRate weeklyRate monthlyRate').populate('customer', 'firstName lastName phone email nationalId drivingLicense').populate('createdBy', 'name role');
  if (!rental) return res.status(404).json({ success: false, message: `No rental found with ID: ${req.params.id}` });
  res.status(200).json({ success: true, rental });
});

const createRental = asyncHandler(async (req, res) => {
  const { vehicle: vehicleId, customer: customerId, startDate, endDate, depositAmount, notes } = req.body;
  const [vehicle, customer] = await Promise.all([Vehicle.findById(vehicleId), Customer.findById(customerId)]);
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
  if (vehicle.status !== 'available') return res.status(400).json({ success: false, message: `Vehicle is not available. Current status: ${vehicle.status}` });
  if (customer.isBlacklisted) return res.status(403).json({ success: false, message: `Customer is blacklisted: ${customer.blacklistReason}` });
  const start = new Date(startDate); const end = new Date(endDate);
  if (end <= start) return res.status(400).json({ success: false, message: 'End date must be after start date.' });
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const totalCost = parseFloat((days * vehicle.dailyRate).toFixed(2));
  const rental = await Rental.create({ vehicle: vehicleId, customer: customerId, startDate: start, endDate: end, days, dailyRate: vehicle.dailyRate, totalCost, depositAmount: depositAmount || 0, status: 'reserved', notes, createdBy: req.user._id });
  await Vehicle.findByIdAndUpdate(vehicleId, { status: 'reserved', currentRental: rental._id });
  await Customer.findByIdAndUpdate(customerId, { $inc: { totalRentals: 1 } });
  res.status(201).json({ success: true, message: 'Rental booking created successfully.', rental });
});

const pickupVehicle = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });
  if (rental.status !== 'reserved') return res.status(400).json({ success: false, message: `Cannot pick up. Rental status is '${rental.status}'.` });
  rental.status = 'active'; rental.actualStartDate = new Date();
  await rental.save();
  await Vehicle.findByIdAndUpdate(rental.vehicle, { status: 'rented' });
  res.status(200).json({ success: true, message: 'Vehicle picked up. Rental is now active.', rental });
});

const returnVehicle = asyncHandler(async (req, res) => {
  const { returnMileage, fuelLevel, damageCharge = 0, inspectionNotes } = req.body;
  const rental = await Rental.findById(req.params.id).populate('vehicle');
  if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });
  if (rental.status !== 'active') return res.status(400).json({ success: false, message: `Cannot return. Rental status is '${rental.status}'.` });
  const returnDate = new Date(); const expectedEnd = new Date(rental.endDate);
  let latePenalty = 0;
  if (returnDate > expectedEnd) { const lateDays = Math.ceil((returnDate - expectedEnd) / (1000 * 60 * 60 * 24)); latePenalty = parseFloat((lateDays * rental.dailyRate * 1.5).toFixed(2)); }
  rental.status = 'completed'; rental.actualEndDate = returnDate; rental.returnMileage = returnMileage; rental.fuelLevelOnReturn = fuelLevel; rental.damageCharge = damageCharge; rental.latePenalty = latePenalty; rental.inspectionNotes = inspectionNotes; rental.finalCost = parseFloat((rental.totalCost + damageCharge + latePenalty).toFixed(2));
  await rental.save();
  await Vehicle.findByIdAndUpdate(rental.vehicle._id, { status: 'available', currentRental: null, mileage: returnMileage || rental.vehicle.mileage });
  res.status(200).json({ success: true, message: 'Vehicle returned successfully.', rental });
});

const cancelRental = asyncHandler(async (req, res) => {
  const rental = await Rental.findById(req.params.id);
  if (!rental) return res.status(404).json({ success: false, message: 'Rental not found.' });
  if (!['reserved', 'active'].includes(rental.status)) return res.status(400).json({ success: false, message: `Cannot cancel a rental with status '${rental.status}'.` });
  rental.status = 'cancelled'; rental.cancellationReason = req.body.reason || 'Cancelled by staff';
  await rental.save();
  await Vehicle.findByIdAndUpdate(rental.vehicle, { status: 'available', currentRental: null });
  await Customer.findByIdAndUpdate(rental.customer, { $inc: { totalRentals: -1 } });
  res.status(200).json({ success: true, message: 'Rental cancelled successfully.', rental });
});

export { getAllRentals, getRentalById, createRental, pickupVehicle, returnVehicle, cancelRental };

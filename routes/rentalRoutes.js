import express from 'express';
import { getAllRentals, getRentalById, createRental, pickupVehicle, returnVehicle, cancelRental } from '../controllers/rentalController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getAllRentals).post(authorizeRoles('admin', 'rental_agent'), createRental);
router.route('/:id').get(getRentalById);
router.patch('/:id/pickup', authorizeRoles('admin', 'rental_agent'), pickupVehicle);
router.patch('/:id/return', authorizeRoles('admin', 'rental_agent'), returnVehicle);
router.patch('/:id/cancel', authorizeRoles('admin', 'rental_agent'), cancelRental);
export default router;

import express from 'express';
import { getAllVehicles, getVehicleById, createVehicle, updateVehicle, updateVehicleStatus, deleteVehicle, getVehicleStats } from '../controllers/vehicleController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/stats', getVehicleStats);
router.route('/').get(getAllVehicles).post(authorizeRoles('admin', 'rental_agent'), createVehicle);
router.route('/:id').get(getVehicleById).put(authorizeRoles('admin', 'rental_agent'), updateVehicle).delete(authorizeRoles('admin'), deleteVehicle);
router.patch('/:id/status', authorizeRoles('admin', 'rental_agent', 'maintenance'), updateVehicleStatus);
export default router;

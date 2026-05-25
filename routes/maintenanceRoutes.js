import express from 'express';
import { getAllMaintenance, getMaintenanceById, createMaintenance, updateMaintenance, deleteMaintenance, getDueMaintenance } from '../controllers/maintenanceController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/due', getDueMaintenance);
router.route('/').get(getAllMaintenance).post(authorizeRoles('admin', 'maintenance'), createMaintenance);
router.route('/:id').get(getMaintenanceById).put(authorizeRoles('admin', 'maintenance'), updateMaintenance).delete(authorizeRoles('admin'), deleteMaintenance);
export default router;

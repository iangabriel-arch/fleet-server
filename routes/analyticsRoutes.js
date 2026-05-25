import express from 'express';
import { getDashboardSummary, getRevenueAnalytics, getVehicleUtilization } from '../controllers/analyticsController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/', authorizeRoles('admin', 'finance'), getDashboardSummary);
router.get('/revenue', authorizeRoles('admin', 'finance'), getRevenueAnalytics);
router.get('/utilization', authorizeRoles('admin', 'finance'), getVehicleUtilization);
export default router;

import express from 'express';
import { getSystemAlerts } from '../controllers/notificationController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/alerts', authorizeRoles('admin', 'finance', 'rental_agent'), getSystemAlerts);
export default router;

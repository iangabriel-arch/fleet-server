import express from 'express';
import { getAllPayments, getPaymentById, recordPayment, getPaymentStats } from '../controllers/paymentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/stats', authorizeRoles('admin', 'finance'), getPaymentStats);
router.route('/').get(getAllPayments).post(authorizeRoles('admin', 'finance', 'rental_agent'), recordPayment);
router.route('/:id').get(getPaymentById);
export default router;

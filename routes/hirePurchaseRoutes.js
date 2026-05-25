import express from 'express';
import { getAllHirePurchases, getHirePurchaseById, createHirePurchase, recordInstallmentPayment, repossessVehicle } from '../controllers/hirePurchaseController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getAllHirePurchases).post(authorizeRoles('admin', 'finance'), createHirePurchase);
router.route('/:id').get(getHirePurchaseById);
router.patch('/:id/payment', authorizeRoles('admin', 'finance'), recordInstallmentPayment);
router.patch('/:id/repossess', authorizeRoles('admin'), repossessVehicle);
export default router;

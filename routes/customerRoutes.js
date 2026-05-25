import express from 'express';
import { getAllCustomers, getCustomerById, createCustomer, updateCustomer, toggleBlacklist, deleteCustomer, getCustomerStats } from '../controllers/customerController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/stats', authorizeRoles('admin', 'finance'), getCustomerStats);
router.route('/').get(getAllCustomers).post(authorizeRoles('admin', 'rental_agent', 'finance'), createCustomer);
router.route('/:id').get(getCustomerById).put(authorizeRoles('admin', 'rental_agent', 'finance'), updateCustomer).delete(authorizeRoles('admin'), deleteCustomer);
router.patch('/:id/blacklist', authorizeRoles('admin'), toggleBlacklist);
export default router;

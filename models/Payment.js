import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['rental', 'hire_purchase', 'deposit', 'damage', 'penalty', 'other'],
      required: true,
      index: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', default: null },
    hirePurchase: { type: mongoose.Schema.Types.ObjectId, ref: 'HirePurchase', default: null },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['cash', 'mpesa', 'bank_transfer', 'card', 'cheque'],
      default: 'cash',
    },
    reference: { type: String, trim: true, default: null },
    receiptNumber: { type: String, unique: true },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'refunded'],
      default: 'completed',
      index: true,
    },
    notes: { type: String, maxlength: 500 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ type: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

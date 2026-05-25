import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema(
  {
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    paidDate: { type: Date, default: null },
    paymentMethod: { type: String, default: null },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  },
  { _id: false }
);

const hirePurchaseSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    vehiclePrice: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    principalAmount: { type: Number, required: true },
    interestRate: { type: Number, default: 0 },
    totalInterest: { type: Number, default: 0 },
    totalRepayable: { type: Number, required: true },
    monthlyInstallment: { type: Number, required: true },
    totalMonths: { type: Number, required: true },
    paidMonths: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },
    startDate: { type: Date, required: true },
    completionDate: { type: Date, default: null },
    repossessionDate: { type: Date, default: null },
    repossessionReason: { type: String, default: null },
    schedule: [installmentSchema],
    status: {
      type: String,
      enum: ['active', 'completed', 'repossessed', 'cancelled'],
      default: 'active',
      index: true,
    },
    notes: { type: String, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

hirePurchaseSchema.index({ customer: 1, status: 1 });
hirePurchaseSchema.index({ vehicle: 1, status: 1 });

hirePurchaseSchema.virtual('progressPercent').get(function () {
  return this.totalMonths > 0
    ? parseFloat(((this.paidMonths / this.totalMonths) * 100).toFixed(1))
    : 0;
});

const HirePurchase = mongoose.model('HirePurchase', hirePurchaseSchema);
export default HirePurchase;

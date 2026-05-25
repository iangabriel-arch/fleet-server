import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    actualStartDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    days: { type: Number, required: true, min: 1 },
    dailyRate: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    finalCost: { type: Number, default: null },
    depositAmount: { type: Number, default: 0 },
    damageCharge: { type: Number, default: 0 },
    latePenalty: { type: Number, default: 0 },
    returnMileage: { type: Number, default: null },
    fuelLevelOnReturn: { type: String, enum: ['empty', 'quarter', 'half', 'three_quarter', 'full'], default: null },
    inspectionNotes: { type: String, default: null },
    cancellationReason: { type: String, default: null },
    status: {
      type: String,
      enum: ['reserved', 'active', 'completed', 'cancelled'],
      default: 'reserved',
      index: true,
    },
    notes: { type: String, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

rentalSchema.index({ vehicle: 1, status: 1 });
rentalSchema.index({ customer: 1, status: 1 });
rentalSchema.index({ endDate: 1, status: 1 });

rentalSchema.virtual('isOverdue').get(function () {
  return this.status === 'active' && new Date() > new Date(this.endDate);
});

const Rental = mongoose.model('Rental', rentalSchema);
export default Rental;

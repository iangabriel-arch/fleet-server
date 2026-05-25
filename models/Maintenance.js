import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: {
      type: String,
      enum: ['oil_change', 'tire_replacement', 'brake_service', 'engine_repair', 'body_repair', 'insurance_renewal', 'inspection', 'other'],
      required: true,
    },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed'],
      default: 'scheduled',
      index: true,
    },
    cost: { type: Number, default: 0, min: 0 },
    serviceDate: { type: Date, default: Date.now },
    nextServiceDate: { type: Date, default: null },
    nextServiceMileage: { type: Number, default: null },
    mileageAtService: { type: Number, default: null },
    serviceProvider: { type: String, trim: true, default: null },
    notes: { type: String, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

maintenanceSchema.index({ vehicle: 1, status: 1 });
maintenanceSchema.index({ nextServiceDate: 1 });

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
export default Maintenance;

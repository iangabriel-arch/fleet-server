import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    make: { type: String, required: [true, 'Vehicle make is required'], trim: true },
    model: { type: String, required: [true, 'Vehicle model is required'], trim: true },
    year: { type: Number, required: [true, 'Year is required'], min: [1990, 'Year must be 1990 or later'], max: [new Date().getFullYear() + 1, 'Year cannot be in the future'] },
    color: { type: String, trim: true },
    registrationNumber: { type: String, required: [true, 'Registration number is required'], unique: true, uppercase: true, trim: true },
    vin: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    category: { type: String, enum: ['sedan', 'suv', 'pickup', 'van', 'coupe', 'hatchback', 'bus', 'truck'], required: [true, 'Vehicle category is required'] },
    fuelType: { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid'], default: 'petrol' },
    transmission: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
    seatingCapacity: { type: Number, min: 1, max: 60, default: 5 },
    mileage: { type: Number, default: 0, min: 0 },
    engineSize: { type: String, trim: true },
    dailyRate: { type: Number, required: [true, 'Daily rental rate is required'], min: 0 },
    weeklyRate: { type: Number, min: 0 },
    monthlyRate: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    purchasePrice: { type: Number, min: 0, select: false },
    status: {
      type: String,
      enum: ['available', 'reserved', 'rented', 'under_maintenance', 'sold', 'hire_purchase', 'repossessed'],
      default: 'available',
    },
    images: [{ url: String, publicId: String, isPrimary: { type: Boolean, default: false } }],
    insuranceExpiry: Date,
    lastServiceDate: Date,
    nextServiceDate: Date,
    nextServiceMileage: Number,
    currentRental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', default: null },
    currentHirePurchase: { type: mongoose.Schema.Types.ObjectId, ref: 'HirePurchase', default: null },
    notes: { type: String, maxlength: 500 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Clean indexes — no duplicates
vehicleSchema.index({ status: 1, category: 1 });
vehicleSchema.index({ make: 'text', model: 'text', registrationNumber: 'text' });

vehicleSchema.pre('save', function (next) {
  if (this.isModified('dailyRate') && this.dailyRate > 0) {
    if (!this.weeklyRate)  this.weeklyRate  = parseFloat((this.dailyRate * 7  * 0.9).toFixed(2));
    if (!this.monthlyRate) this.monthlyRate = parseFloat((this.dailyRate * 30 * 0.8).toFixed(2));
  }
  next();
});

vehicleSchema.virtual('displayName').get(function () { return `${this.year} ${this.make} ${this.model}`; });
vehicleSchema.virtual('primaryImage').get(function () {
  if (!this.images || this.images.length === 0) return null;
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.images[0].url;
});
vehicleSchema.virtual('isAvailable').get(function () { return this.status === 'available'; });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;

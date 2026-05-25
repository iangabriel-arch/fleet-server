import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 50 },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 50 },
    email: { type: String, lowercase: true, trim: true, sparse: true, match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'] },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    alternatePhone: { type: String, trim: true },
    nationalId: { type: String, required: [true, 'National ID is required'], unique: true, trim: true },
    drivingLicense: { type: String, trim: true },
    drivingLicenseExpiry: Date,
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      county: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Kenya' },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true },
    },
    totalRentals: { type: Number, default: 0, min: 0 },
    totalHirePurchases: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, default: 0, min: 0 },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, trim: true, default: null },
    notes: { type: String, maxlength: 1000 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Clean indexes — no duplicates
customerSchema.index({ isBlacklisted: 1 });
customerSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phone: 'text', nationalId: 'text' });

customerSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });
customerSchema.virtual('licenseExpired').get(function () {
  if (!this.drivingLicenseExpiry) return null;
  return new Date() > new Date(this.drivingLicenseExpiry);
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;

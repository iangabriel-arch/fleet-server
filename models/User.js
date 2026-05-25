import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // ─── IDENTITY ────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in any query unless explicitly requested
    },

    // ─── ROLE ────────────────────────────────────────────────────────────────
    // Drives all permission checks across the entire system.
    // admin         → full access to everything
    // finance       → payments, HP contracts, reports
    // rental_agent  → bookings, customers, vehicle status
    // maintenance   → vehicle service records only
    role: {
      type: String,
      enum: {
        values: ['admin', 'finance', 'rental_agent', 'maintenance'],
        message: 'Role must be one of: admin, finance, rental_agent, maintenance',
      },
      default: 'rental_agent',
    },

    // ─── PROFILE ─────────────────────────────────────────────────────────────
    phone: {
      type: String,
      trim: true,
      default: null,
    },

    avatar: {
      type: String,    // Cloudinary URL (future)
      default: null,
    },

    // ─── ACCOUNT STATE ───────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      // Soft-disable accounts without deletion — suspended staff, leavers, etc.
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    // ─── PASSWORD RESET (future flow) ────────────────────────────────────────
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // auto-adds createdAt + updatedAt
  }
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ─── PRE-SAVE HOOK: Hash password ─────────────────────────────────────────────
// Runs before every .save(). Skips if password field wasn't touched —
// critical so profile updates don't re-hash an already-hashed value.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12); // 12 rounds = strong, still fast
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── INSTANCE METHOD: comparePassword ────────────────────────────────────────
// Usage: const isMatch = await user.comparePassword(req.body.password)
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ─── INSTANCE METHOD: toPublicJSON ───────────────────────────────────────────
// Safe user object to send to the client — strips all sensitive fields.
userSchema.methods.toPublicJSON = function () {
  return {
    _id:       this._id,
    name:      this.name,
    email:     this.email,
    role:      this.role,
    phone:     this.phone,
    avatar:    this.avatar,
    isActive:  this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

// ─── INSTANCE METHOD: getInitials ────────────────────────────────────────────
// Drives avatar fallback UI (e.g. "James Kamau" → "JK")
userSchema.methods.getInitials = function () {
  return this.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const User = mongoose.model('User', userSchema);
export default User;
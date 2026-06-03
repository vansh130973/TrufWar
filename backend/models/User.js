const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#F0B27A',
  '#82E0AA', '#F1948A', '#85C1E9', '#F8C471', '#A9DFBF',
  '#F0E6EF', '#D7BDE2', '#A3E4D7', '#FAD7A0', '#D5DBDB',
];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    color: {
      type: String,
      default: function () {
        return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
      },
    },
    avatar: {
      type: String,
      default: '',
    },
    totalDistance: {
      type: Number,
      default: 0, // in meters
    },
    territoriesOwned: {
      type: Number,
      default: 0,
    },
    territoriesCaptured: {
      type: Number,
      default: 0,
    },
    territoriesLost: {
      type: Number,
      default: 0,
    },
    lastRunDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Don't return password in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

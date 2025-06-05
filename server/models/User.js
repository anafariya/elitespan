// backend/models/User.js

const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema({
  phone: { type: String, required: false, trim: true },
  address: { type: String, required: false, trim: true },
  specialties: [{ type: String, trim: true }], // Added specialties as an array of strings
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'provider'],
    default: 'user',
    required: false,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: false,
  },
  contactInfo: {
    type: contactInfoSchema,
    required: false,
    default: {},
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  premiumExpiry: {
    type: Date,
    default: null,
  },
  isAdmin:{
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
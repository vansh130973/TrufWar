const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema(
  {
    gridKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Center lat/lng of the grid cell (for rendering)
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    previousOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    color: {
      type: String,
      default: '#888888',
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
    lastDefendedAt: {
      type: Date,
      default: Date.now,
    },
    decayState: {
      type: String,
      enum: ['fresh', 'decaying', 'neutral'],
      default: 'fresh',
    },
  },
  { timestamps: true }
);

// Compute corners of the 50x50m cell for polygon rendering
territorySchema.virtual('bounds').get(function () {
  const CELL_SIZE_DEG_LAT = 50 / 111000; // ~50m in degrees latitude
  const CELL_SIZE_DEG_LNG = 50 / (111000 * Math.cos((this.lat * Math.PI) / 180));
  return {
    sw: { lat: this.lat - CELL_SIZE_DEG_LAT / 2, lng: this.lng - CELL_SIZE_DEG_LNG / 2 },
    ne: { lat: this.lat + CELL_SIZE_DEG_LAT / 2, lng: this.lng + CELL_SIZE_DEG_LNG / 2 },
  };
});

territorySchema.set('toJSON', { virtuals: true });
territorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Territory', territorySchema);

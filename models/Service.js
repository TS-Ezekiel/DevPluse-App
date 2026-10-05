const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  currentStatus: { type: String, enum: ['UP', 'DOWN', 'UNKNOWN'], default: 'UNKNOWN' },
  lastResponseTime: { type: Number, default: 0 },
  lastChecked: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
const mongoose = require('mongoose');

const pingLogSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  responseTime: { type: Number, required: true },
  status: { type: String, enum: ['UP', 'DOWN'], required: true },
  statusCode: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PingLog', pingLogSchema);
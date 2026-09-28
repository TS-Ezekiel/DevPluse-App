const mongoose = require('mongoose');
const PingLog = require('../models/PingLog');

exports.getServiceLogs = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid Service ID format.' });
    }

    const logs = await PingLog.find({ serviceId: id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(logs.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ping logs: ' + err.message });
  }
};
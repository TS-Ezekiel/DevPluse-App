const Service = require('../models/Service');
const PingLog = require('../models/PingLog');

exports.getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services: ' + err.message });
  }
};

exports.addService = async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Both name and URL are required.' });
    }
    const newService = await Service.create({ name, url });
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    await PingLog.deleteMany({ serviceId: req.params.id });
    res.json({ message: 'Service removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service: ' + err.message });
  }
};
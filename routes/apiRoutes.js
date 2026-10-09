// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


// DELETE a service by ID
router.delete('/services/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;

    // Remove the service document
    const deletedService = await Service.findByIdAndDelete(serviceId);
    if (!deletedService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Delete associated ping logs
    await PingLog.deleteMany({ serviceId: serviceId });

    res.json({ message: 'Service and associated logs deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Grab models from mongoose (or require them directly if in separate files)
const Service = mongoose.model('Service');
const PingLog = mongoose.model('PingLog');


// ==========================================
// REST API ROUTES
// 
// ==========================================

const serviceController = require('../controllers/serviceController');
const pingController = require('../controllers/pingController');

// Service routes
router.get('/services', serviceController.getServices);
router.post('/services', serviceController.addService);
router.delete('/services/:id', serviceController.deleteService);

// Ping / Log routes
router.get('/services/:id/logs', pingController.getServiceLogs);

// GET /api/services - Fetch all monitored endpoints
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services: ' + err.message });
  }
});

// POST /api/services - Add a new endpoint to monitor
router.post('/services', async (req, res) => {
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
});

// GET /api/services/:id/logs - Get last 20 ping records for Chart.js
router.get('/services/:id/logs', async (req, res) => {
  try {
    const logs = await PingLog.find({ serviceId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(logs.reverse()); // Reverse to chronological order for line chart
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service logs: ' + err.message });
  }
});

// DELETE /api/services/:id - Remove an endpoint and its historical logs
router.delete('/services/:id', async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    await PingLog.deleteMany({ serviceId: req.params.id });
    res.json({ message: 'Service removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service: ' + err.message });
  }
});

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');

// 1. Import models first so Mongoose registers them
const Service = require('./models/Service');
const PingLog = require('./models/PingLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://devpulse_admin:DevPulse2026Pass@cluster0.yfoajs7.mongodb.net/devplus?appName=Cluster0@cluster0.abcde.mongodb.net/devpulse?retryWrites=true&w=majority';

// 2. Import API routes AFTER models are loaded
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 5500;
//const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devpulse';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', require('./routes/apiRoutes'));

// Express 5 catch-all route for frontend static files
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cron monitoring engine
function startMonitoringEngine() {
  console.log('⚡ [DevPulse Engine] Cron Engine Active (Running every 30s)');

  cron.schedule('*/30 * * * * *', async () => {
    try {
      const services = await Service.find();
      if (services.length === 0) return;

      for (const service of services) {
        const startTime = Date.now();
        let status = 'DOWN';
        let responseTime = 0;
        let statusCode = 0;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(service.url, { signal: controller.signal });
          clearTimeout(timeoutId);

          responseTime = Date.now() - startTime;
          statusCode = res.status;
          status = res.ok ? 'UP' : 'DOWN';
        } catch (err) {
          responseTime = Date.now() - startTime;
          status = 'DOWN';
          statusCode = 0;
        }

        service.currentStatus = status;
        service.lastResponseTime = responseTime;
        service.lastChecked = new Date();
        await service.save();

        await PingLog.create({
          serviceId: service._id,
          responseTime: responseTime,
          status: status,
          statusCode: statusCode
        });
      }
    } catch (err) {
      console.error('❌ [DevPulse Engine Error]:', err.message);
    }
  });
}

// Connect Database & Start Server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 DevPulse running at http://127.0.0.1:${PORT}`);
      startMonitoringEngine();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });
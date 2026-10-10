// cron/monitorJob.js
const cron = require('node-cron');
const Service = require('../models/Service');
const PingLog = require('../models/PingLog');

function startMonitoring() {
  // Cron expression: Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const services = await Service.find();

      for (const service of services) {
        const startTime = Date.now();
        let status = 'DOWN';
        let responseTime = 0;
        let statusCode = 0;

        try {
          // Set a timeout of 5 seconds per request
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
        }

        // 1. Update overall service status
        service.currentStatus = status;
        service.lastResponseTime = responseTime;
        service.lastChecked = new Date();
        await service.save();

        // 2. Record historical log entry for graphing
        await PingLog.create({
          serviceId: service._id,
          responseTime: responseTime,
          status: status,
          statusCode: statusCode
        });
      }
    } catch (error) {
      console.error('Monitoring job failed:', error);
    }
  });
}

module.exports = startMonitoring;
// seed.js
const mongoose = require('mongoose');
const Service = require('./models/Service');
const PingLog = require('./models/PingLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://devpulse_admin:DevPulse2026Pass@cluster0.yfoajs7.mongodb.net/devpulse?appName=Cluster0&retryWrites=true&w=majority';

const initialServices = [
  { name: 'Google Search', url: 'https://google.com' },
  { name: 'GitHub API', url: 'https://api.github.com' },
  { name: 'JSONPlaceholder (Mock API)', url: 'https://jsonplaceholder.typicode.com/posts/1' },
  { name: 'Non-Existent Service (Fail Test)', url: 'https://httpbin.org/status/500' }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing data
    await Service.deleteMany({});
    await PingLog.deleteMany({});
    console.log('🧹 Cleared existing services and ping logs.');

    // Insert new services
    const createdServices = await Service.insertMany(initialServices);
    console.log(`🌱 Created ${createdServices.length} test services.`);

    // Generate historical ping logs for each service (last 5 pings)
    const now = Date.now();
    const mockLogs = [];

    for (const service of createdServices) {
      for (let i = 5; i >= 1; i--) {
        const isFailTest = service.url.includes('status/500');
        const status = isFailTest ? 'DOWN' : 'UP';
        const statusCode = isFailTest ? 500 : 200;
        const responseTime = isFailTest ? 0 : Math.floor(Math.random() * 150) + 40; // 40ms - 190ms

        mockLogs.push({
          serviceId: service._id,
          responseTime: responseTime,
          status: status,
          statusCode: statusCode,
          createdAt: new Date(now - i * 30000) // 30-second intervals in the past
        });
      }
    }

    await PingLog.insertMany(mockLogs);
    console.log(`📊 Generated ${mockLogs.length} historical ping records.`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();
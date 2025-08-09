import mongoose from 'mongoose';
import User from './models/User.js';

const seedUsers = async () => {
  try {
    const users = [
      { name: 'Admin', email: 'admin@drugwell.com', password: 'admin123', role: 'Admin' },
      { name: 'Manager', email: 'manager@drugwell.com', password: 'manager123', role: 'Manager' },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`User ${userData.email} created.`);
      } else {
        console.log(`User ${userData.email} already exists.`);
      }
    }

    console.log('Seeding completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

mongoose.connect('mongodb://localhost:27017/pharmacy-chain', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
    seedUsers();
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

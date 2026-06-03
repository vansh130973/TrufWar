/**
 * TurfWar Seed Script
 * Creates demo users and sample territories around a default location.
 * Usage: node seed.js
 * Or with custom center: CENTER_LAT=28.6139 CENTER_LNG=77.2090 node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Territory = require('./models/Territory');
const Run = require('./models/Run');
const { latLngToGridKey } = require('./utils/grid');

const CENTER_LAT = parseFloat(process.env.CENTER_LAT) || 28.6139; // Delhi, India
const CENTER_LNG = parseFloat(process.env.CENTER_LNG) || 77.2090;

const DEMO_USERS = [
  { username: 'SpeedDemon', email: 'speed@demo.com', password: 'demo123', color: '#FF6B6B' },
  { username: 'UrbanRacer', email: 'urban@demo.com', password: 'demo123', color: '#4ECDC4' },
  { username: 'NightRunner', email: 'night@demo.com', password: 'demo123', color: '#45B7D1' },
  { username: 'TurfKing', email: 'turf@demo.com', password: 'demo123', color: '#FFEAA7' },
  { username: 'StreetHawk', email: 'street@demo.com', password: 'demo123', color: '#DDA0DD' },
];

function randomOffset(range = 0.01) {
  return (Math.random() - 0.5) * range;
}

function generateTerritoryCluster(centerLat, centerLng, user, count = 20) {
  const territories = [];
  const visited = new Set();

  // Random walk to simulate a run
  let lat = centerLat;
  let lng = centerLng;

  for (let i = 0; i < count; i++) {
    lat += randomOffset(0.0005);
    lng += randomOffset(0.0005);

    const gridKey = latLngToGridKey(lat, lng);
    if (visited.has(gridKey)) continue;
    visited.add(gridKey);

    const capturedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000);
    territories.push({
      gridKey,
      lat,
      lng,
      ownerId: user._id,
      color: user.color,
      capturedAt,
      lastDefendedAt: capturedAt,
      decayState: 'fresh',
    });
  }

  return territories;
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turfwar');
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Territory.deleteMany({});
    await Run.deleteMany({});

    // Create users
    console.log('Creating demo users...');
    const users = [];
    for (const userData of DEMO_USERS) {
      const user = await User.create(userData);
      users.push(user);
      console.log(`  Created user: ${user.username} (${user.email} / password: ${userData.password})`);
    }

    // Create territories for each user
    console.log('Creating sample territories...');
    let totalTerritories = 0;

    for (const user of users) {
      // Each user gets a cluster in a slightly different area
      const offsetLat = CENTER_LAT + randomOffset(0.008);
      const offsetLng = CENTER_LNG + randomOffset(0.008);
      const count = Math.floor(Math.random() * 20) + 10;

      const territories = generateTerritoryCluster(offsetLat, offsetLng, user, count);

      await Territory.insertMany(territories, { ordered: false }).catch(() => {});
      const actual = territories.length;

      await User.findByIdAndUpdate(user._id, {
        territoriesOwned: actual,
        totalDistance: Math.floor(Math.random() * 50000) + 5000,
        territoriesCaptured: actual + Math.floor(Math.random() * 10),
        lastRunDate: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000),
      });

      totalTerritories += actual;
      console.log(`  ${user.username}: ${actual} territories`);
    }

    console.log(`\n✅ Seed complete!`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Territories: ~${totalTerritories}`);
    console.log(`   Map center: ${CENTER_LAT}, ${CENTER_LNG}`);
    console.log(`\nDemo login credentials (all passwords: demo123):`);
    users.forEach((u) => console.log(`   ${u.email}`));

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

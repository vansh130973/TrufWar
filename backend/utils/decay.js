const Territory = require('../models/Territory');
const Notification = require('../models/Notification');
const User = require('../models/User');

const DECAY_WARNING_DAYS = 3;
const DECAY_NEUTRAL_DAYS = 7;

async function runDecayCheck(io) {
  try {
    const now = new Date();
    const warningThreshold = new Date(now - DECAY_WARNING_DAYS * 24 * 60 * 60 * 1000);
    const neutralThreshold = new Date(now - DECAY_NEUTRAL_DAYS * 24 * 60 * 60 * 1000);

    // Find territories that should become neutral
    const toNeutralize = await Territory.find({
      ownerId: { $ne: null },
      lastDefendedAt: { $lt: neutralThreshold },
      decayState: { $ne: 'neutral' },
    });

    for (const territory of toNeutralize) {
      const prevOwner = territory.ownerId;
      territory.previousOwnerId = prevOwner;
      territory.ownerId = null;
      territory.color = '#888888';
      territory.decayState = 'neutral';
      await territory.save();

      // Update owner's territory count
      await User.findByIdAndUpdate(prevOwner, {
        $inc: { territoriesOwned: -1, territoriesLost: 1 },
      });

      // Create notification
      const notif = await Notification.create({
        userId: prevOwner,
        type: 'territory_decayed',
        title: '⚠️ Territory Lost',
        message: 'A territory decayed and is now neutral — someone can claim it!',
        payload: { gridKey: territory.gridKey },
      });

      // Emit to owner's socket room
      if (io) {
        io.to(`user:${prevOwner}`).emit('territory-decayed', {
          notification: notif,
          territory: territory.toJSON(),
        });
        io.emit('territory-update', { territory: territory.toJSON() });
      }
    }

    // Find territories that should show decay warning
    const toWarn = await Territory.find({
      ownerId: { $ne: null },
      lastDefendedAt: { $lt: warningThreshold, $gte: neutralThreshold },
      decayState: 'fresh',
    });

    for (const territory of toWarn) {
      territory.decayState = 'decaying';
      await territory.save();

      // Check if owner already has a recent decay warning
      const recentWarning = await Notification.findOne({
        userId: territory.ownerId,
        type: 'decay_warning',
        createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
      });

      if (!recentWarning) {
        const notif = await Notification.create({
          userId: territory.ownerId,
          type: 'decay_warning',
          title: '🏃 Time to Run!',
          message: `Your territory is decaying. Run to defend it before it becomes neutral!`,
          payload: { gridKey: territory.gridKey },
        });

        if (io) {
          io.to(`user:${territory.ownerId}`).emit('territory-decayed', {
            notification: notif,
            territory: territory.toJSON(),
          });
        }
      }
    }

    if (toNeutralize.length > 0 || toWarn.length > 0) {
      console.log(`Decay job: ${toNeutralize.length} neutralized, ${toWarn.length} warned`);
    }
  } catch (err) {
    console.error('Decay job error:', err);
  }
}

function setupDecayJob(io) {
  // Run immediately on startup
  runDecayCheck(io);
  // Then every hour
  setInterval(() => runDecayCheck(io), 60 * 60 * 1000);
  console.log('⏰ Territory decay job scheduled (every hour)');
}

module.exports = { setupDecayJob, runDecayCheck };

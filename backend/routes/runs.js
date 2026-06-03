const express = require('express');
const Run = require('../models/Run');
const User = require('../models/User');
const Territory = require('../models/Territory');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { coordinatesToGridKeys, computeTotalDistance, gridKeyToLatLng } = require('../utils/grid');

const router = express.Router();

// POST /api/runs/start
router.post('/start', auth, async (req, res) => {
  try {
    // End any existing active run for this user
    await Run.updateMany(
      { userId: req.userId, status: 'active' },
      { status: 'completed', endTime: new Date() }
    );

    const run = await Run.create({
      userId: req.userId,
      coordinates: [],
      startTime: new Date(),
      status: 'active',
    });

    res.status(201).json({ run });
  } catch (err) {
    console.error('Start run error:', err);
    res.status(500).json({ error: 'Failed to start run' });
  }
});

// POST /api/runs/stop
router.post('/stop', auth, async (req, res) => {
  try {
    const { runId, coordinates } = req.body;

    if (!coordinates || coordinates.length < 2) {
      return res.status(400).json({ error: 'Not enough coordinates to save run' });
    }

    const run = await Run.findOne({ _id: runId, userId: req.userId, status: 'active' });
    if (!run) {
      return res.status(404).json({ error: 'Active run not found' });
    }

    const distance = computeTotalDistance(coordinates);
    const duration = Math.floor((new Date() - run.startTime) / 1000);

    // Get grid keys from run path
    const gridKeys = coordinatesToGridKeys(coordinates);

    // Process territory captures
    const captureResults = await processTerritoryCapture(
      gridKeys,
      req.user,
      req.io
    );

    // Update run
    run.coordinates = coordinates;
    run.distance = distance;
    run.duration = duration;
    run.endTime = new Date();
    run.status = 'completed';
    run.territoriesCaptured = captureResults.newlyCaptured;
    await run.save();

    // Update user stats
    await User.findByIdAndUpdate(req.userId, {
      $inc: {
        totalDistance: distance,
        territoriesOwned: captureResults.netGain,
        territoriesCaptured: captureResults.newlyCaptured,
        territoriesLost: 0,
      },
      lastRunDate: new Date(),
    });

    res.json({
      run,
      captureResults,
      distance: Math.round(distance),
      duration,
    });
  } catch (err) {
    console.error('Stop run error:', err);
    res.status(500).json({ error: 'Failed to save run' });
  }
});

// GET /api/runs/history/:userId
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const runs = await Run.find({ userId, status: 'completed' })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Run.countDocuments({ userId, status: 'completed' });

    res.json({
      runs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch run history' });
  }
});

// Helper: process territory captures after a run
async function processTerritoryCapture(gridKeys, user, io) {
  let newlyCaptured = 0;
  let netGain = 0;
  const capturedFrom = {};

  for (const gridKey of gridKeys) {
    const center = gridKeyToLatLng(gridKey);

    let territory = await Territory.findOne({ gridKey });

    if (!territory) {
      // Unclaimed territory — capture it
      territory = await Territory.create({
        gridKey,
        lat: center.lat,
        lng: center.lng,
        ownerId: user._id,
        color: user.color,
        capturedAt: new Date(),
        lastDefendedAt: new Date(),
        decayState: 'fresh',
      });
      newlyCaptured++;
      netGain++;

      if (io) {
        io.emit('territory-captured', { territory: territory.toJSON(), capturedBy: user.username });
      }
    } else if (territory.ownerId && territory.ownerId.toString() === user._id.toString()) {
      // Own territory — refresh decay timer
      territory.lastDefendedAt = new Date();
      territory.decayState = 'fresh';
      await territory.save();
    } else {
      // Enemy or neutral territory — capture it
      const previousOwnerId = territory.ownerId;

      territory.previousOwnerId = previousOwnerId;
      territory.ownerId = user._id;
      territory.color = user.color;
      territory.capturedAt = new Date();
      territory.lastDefendedAt = new Date();
      territory.decayState = 'fresh';
      await territory.save();

      newlyCaptured++;
      netGain++;

      if (previousOwnerId) {
        // Reduce previous owner's territory count
        await User.findByIdAndUpdate(previousOwnerId, {
          $inc: { territoriesOwned: -1, territoriesLost: 1 },
        });

        // Notify previous owner
        const notif = await Notification.create({
          userId: previousOwnerId,
          type: 'territory_captured',
          title: '🚨 Territory Captured!',
          message: `${user.username} captured your territory!`,
          payload: { gridKey, capturedBy: user.username, capturedByColor: user.color },
        });

        capturedFrom[previousOwnerId] = (capturedFrom[previousOwnerId] || 0) + 1;

        if (io) {
          io.to(`user:${previousOwnerId}`).emit('notification', { notification: notif });
        }
      }

      if (io) {
        io.emit('territory-captured', {
          territory: territory.toJSON(),
          capturedBy: user.username,
          capturedByColor: user.color,
        });
      }
    }
  }

  return { newlyCaptured, netGain, capturedFrom };
}

module.exports = router;

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const PointsHistory = require('../models/PointsHistory');

let version = 1; // Start with version 1

// Coerce nullish/empty/non-numeric values to 0 before writing to fields that
// are $inc'd elsewhere (an empty string or null stored here would crash a
// later $inc when awarding session wins).
const toNumberOrZero = (v) => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || Number.isNaN(n) ? 0 : n;
};

const NUMERIC_WIN_FIELDS = ['clWins', 'ulWins', 'totWins', 'sessionsAttended'];

const sanitizeWinFields = (body) => {
  for (const field of NUMERIC_WIN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      body[field] = toNumberOrZero(body[field]);
    }
  }
  return body;
};

// Version endpoint
router.get('/version', (req, res) => {
  res.json({ version });
});

// GET all players
router.get('/', async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// GET players sorted by CL wins
router.get('/cl', async (req, res) => {
  try {
    const players = await Player.find().sort({ clWins: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CL ranking' });
  }
});

// GET players sorted by UL wins
router.get('/ul', async (req, res) => {
  try {
    const players = await Player.find().sort({ ulWins: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch UL ranking' });
  }
});

// GET players sorted by Total wins (CL wins * 2 + UL wins)
router.get('/total', async (req, res) => {
  try {
    const players = await Player.find().sort({ totWins: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch total ranking' });
  }
});

// POST a new player
router.post('/', async (req, res) => {
  const { name, birthDate, profilePictureUrl, nationality, favoriteClub, favoritePlayer, clWins, ulWins, admin, description } = req.body;
  try {
    const player = new Player({ name, birthDate, profilePictureUrl, nationality, favoriteClub, favoritePlayer, clWins, ulWins, admin, description });
    await player.save();
    version++; // Update version on data change
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create player' });
  }
});

// DELETE a player by ID
router.delete('/:id', async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    version++; // Update version on data change
    res.json({ message: 'Player deleted successfully', player });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// PATCH update player fields
router.patch('/:id', async (req, res) => {
  try {
    const playerId = req.params.id;
    console.log('🔄 PATCH request received for player ID:', playerId);
    console.log('📝 Update data:', req.body);
    
    // Validate if the ID is a valid MongoDB ObjectId
    if (!playerId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Invalid ObjectId format:', playerId);
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    sanitizeWinFields(req.body);

    // Fetch pre-update win counts so a direct manual edit here can be logged
    // to Points History the same way a session-driven change is.
    const before = await Player.findById(playerId).select('clWins ulWins');

    const updated = await Player.findByIdAndUpdate(
      playerId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      console.log('❌ Player not found with ID:', playerId);
      return res.status(404).json({ error: 'Player not found' });
    }

    const manualHistoryEntries = [];
    if (before && Object.prototype.hasOwnProperty.call(req.body, 'clWins')) {
      const delta = updated.clWins - before.clWins;
      if (delta !== 0) {
        manualHistoryEntries.push({ playerId: updated._id, playerName: updated.name, winType: 'CL', delta, source: 'manual' });
      }
    }
    if (before && Object.prototype.hasOwnProperty.call(req.body, 'ulWins')) {
      const delta = updated.ulWins - before.ulWins;
      if (delta !== 0) {
        manualHistoryEntries.push({ playerId: updated._id, playerName: updated.name, winType: 'EL', delta, source: 'manual' });
      }
    }
    if (manualHistoryEntries.length > 0) {
      await PointsHistory.insertMany(manualHistoryEntries);
    }

    version++; // Update version on data change
    console.log('✅ Player updated successfully:', updated);
    res.json(updated);
  } catch (err) {
    console.error('❌ Error updating player:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: err.message 
      });
    }
    
    // Handle cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid player ID' });
    }
    
    res.status(500).json({ error: 'Failed to update player' });
  }
});

module.exports = router;

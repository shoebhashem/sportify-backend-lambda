const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

let version = 1; // Start with version 1

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

// POST a new player
router.post('/', async (req, res) => {
  const { name, birthDate, profilePictureUrl, nationality, favoriteClub, favoritePlayer, clWins, ulWins } = req.body;
  try {
    const player = new Player({ name, birthDate, profilePictureUrl, nationality, favoriteClub, favoritePlayer, clWins, ulWins });
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
    
    const updated = await Player.findByIdAndUpdate(
      playerId, 
      { $set: req.body }, 
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      console.log('❌ Player not found with ID:', playerId);
      return res.status(404).json({ error: 'Player not found' });
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

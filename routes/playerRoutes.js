const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// GET all players sorted by CL wins
router.get('/cl', async (req, res) => {
  try {
    const players = await Player.find().sort({ clWins: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CL ranking' });
  }
});

// GET all players sorted by UL wins
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
  const { name, nationality, favoriteClub, clWins, ulWins } = req.body;
  try {
    const player = new Player({ name, nationality, favoriteClub, clWins, ulWins });
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create player' });
  }
});

// PATCH update CL or UL wins
router.patch('/:id', async (req, res) => {
  const { clWins, ulWins } = req.body;
  try {
    const updated = await Player.findByIdAndUpdate(
      req.params.id,
      { ...(clWins !== undefined && { clWins }), ...(ulWins !== undefined && { ulWins }) },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update player' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// GET all players sorted by CL wins
router.get('/', async (req, res) => {
  const players = await Player.find().sort({ clWins: -1 });
  res.json(players);
});

// POST a new player
router.post('/', async (req, res) => {
  const { name, nationality, favoriteClub, clWins } = req.body;
  const player = new Player({ name, nationality, favoriteClub, clWins });
  await player.save();
  res.status(201).json(player);
});

// PATCH update CL wins
router.patch('/:id', async (req, res) => {
  const { clWins } = req.body;
  const updated = await Player.findByIdAndUpdate(req.params.id, { clWins }, { new: true });
  res.json(updated);
});

module.exports = router;

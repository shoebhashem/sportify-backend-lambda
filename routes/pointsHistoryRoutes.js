const express = require('express');
const router = express.Router();
const PointsHistory = require('../models/PointsHistory');

// GET all points history entries, newest first
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const skip = req.query.skip ? parseInt(req.query.skip, 10) : 0;

    let query = PointsHistory.find().sort({ createdAt: -1 }).skip(skip);
    if (limit) query = query.limit(limit);

    const entries = await query;
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch points history' });
  }
});

module.exports = router;

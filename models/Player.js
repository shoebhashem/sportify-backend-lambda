const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nationality: { type: String, required: true },
  favoriteClub: { type: String },
  clWins: { type: Number, default: 0 }
});

module.exports = mongoose.model('Player', playerSchema);

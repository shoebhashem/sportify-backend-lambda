const mongoose = require('mongoose');
/*
const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nationality: { type: String, required: true },
  favoriteClub: { type: String },
  clWins: { type: Number, default: 0 },
  ulWins: { type: Number, default: 0 }
}, {
  timestamps: true // ✅ Adds createdAt and updatedAt automatically
});*/

const playerSchema = new mongoose.Schema(
  {
    name: String,
    nationality: String,
    favoriteClub: String,
    clWins: Number,
    ulWins: Number,
  },
  { timestamps: true } 
);

module.exports = mongoose.model('Player', playerSchema);

const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    birthDate: { type: Date },
    profilePictureUrl: { type: String },
    nationality: { type: String, required: true },
    favoriteClub: { type: String },
    favoritePlayer: {type: String},
    clWins: { type: Number, default: 0 },
    ulWins: { type: Number, default: 0 },
    admin: { type: Boolean, default: false },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);

const mongoose = require('mongoose');

// One entry per CL/EL win change, logged whenever a player's clWins/ulWins
// counter is incremented or decremented — whether from a session edit or a
// manual override in the Players admin tab — so players can see how their
// points changed over time.
const pointsHistorySchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    playerName: { type: String, required: true }, // denormalized so history still reads correctly if the player is later renamed/deleted
    winType: { type: String, enum: ['CL', 'EL'], required: true },
    delta: { type: Number, required: true }, // e.g. +1, -1; manual overrides can be any integer delta
    source: { type: String, enum: ['session', 'manual'], required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }, // only set when source is 'session'
    sessionName: { type: String }, // denormalized session name/date for display
  },
  { timestamps: true }
);

module.exports = mongoose.model('PointsHistory', pointsHistorySchema);

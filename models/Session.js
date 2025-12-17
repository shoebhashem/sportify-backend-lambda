const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "2025-12-16"
    date: { type: Date, required: true, default: Date.now },
    
    // Regular players attending
    participants: [{
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      playerName: { type: String },
      team: { type: Number, default: null } // Team number assigned
    }],
    
    // Guest players for this session
    guestPlayers: [{
      name: { type: String, required: true },
      team: { type: Number, default: null } // Team number assigned
    }],
    
    // Generated teams
    teams: [{
      teamNumber: { type: Number, required: true },
      members: [{
        type: { type: String, enum: ['player', 'guest'] }, // player or guest
        id: { type: mongoose.Schema.Types.ObjectId }, // playerId or guestId
        name: { type: String }
      }]
    }],
    
    numberOfTeams: { type: Number, default: 0 },
    totalAttendees: { type: Number, default: 0 },
    
    // Match results (for future use)
    clWinnerTeam: { type: Number, default: null }, // CL winner team number
    ulWinnerTeam: { type: Number, default: null }  // UL winner team number (optional)
  },
  { timestamps: true }
);

// Pre-save hook to update totalAttendees
sessionSchema.pre('save', function(next) {
  this.totalAttendees = this.participants.length + this.guestPlayers.length;
  next();
});

module.exports = mongoose.model('Session', sessionSchema);

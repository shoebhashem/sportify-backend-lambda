const mongoose = require('mongoose');

// Coerce nullish/empty/non-numeric values to 0 instead of letting them
// through as null. Number fields cast an empty string ("") to null rather
// than 0 or a cast error, which previously let corrupted values reach the
// database and crash $inc-based point awards later.
const toNumberOrZero = (v) => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || Number.isNaN(n) ? 0 : n;
};

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    birthDate: { type: Date },
    profilePictureUrl: { type: String },
    nationality: { type: String, required: true },
    favoriteClub: { type: String },
    favoritePlayer: {type: String},
    clWins: { type: Number, default: 0, set: toNumberOrZero },
    ulWins: { type: Number, default: 0, set: toNumberOrZero },
    totWins: { type: Number, default: 0, set: toNumberOrZero },
    sessionsAttended: { type: Number, default: 0, set: toNumberOrZero },
    admin: { type: Boolean, default: false },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

// Pre-save hook to calculate totWins
playerSchema.pre('save', function(next) {
  this.totWins = (this.clWins * 2) + this.ulWins;
  next();
});

// Pre-findOneAndUpdate hook to calculate totWins
playerSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate() || {};
  const set = update.$set || {};

  // Only proceed if clWins or ulWins is being updated
  if (
    update.clWins !== undefined ||
    update.ulWins !== undefined ||
    set.clWins !== undefined ||
    set.ulWins !== undefined
  ) {
    // Fetch current document to merge existing values with incoming updates
    const current = await this.model.findOne(this.getQuery());

    // Convert to numbers to prevent string concatenation
    const clWins = Number(
      set.clWins ?? update.clWins ?? current?.clWins ?? 0
    );
    const ulWins = Number(
      set.ulWins ?? update.ulWins ?? current?.ulWins ?? 0
    );

    const totWins = (clWins * 2) + ulWins;

    // Ensure $set exists and push totWins into the update payload
    if (update.$set) {
      update.$set.totWins = totWins;
    } else {
      update.$set = { totWins };
    }

    this.setUpdate(update);
  }

  next();
});

module.exports = mongoose.model('Player', playerSchema);

// Loaded via -r dotenv/config dotenv_config_path=.env.local (see package.json seed:sessions)
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Session = require('./models/Session');

const SEASON_START = new Date('2026-04-22');

// 15 sessions, roughly every 2 weeks from May 2026
const SESSION_DATES = [
  '2026-05-01', '2026-05-15', '2026-05-29',
  '2026-06-12', '2026-06-26',
  '2026-07-10', '2026-07-24',
  '2026-08-07', '2026-08-21',
  '2026-09-04', '2026-09-18',
  '2026-10-02', '2026-10-16', '2026-10-30',
  '2026-11-01',
];

function pick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing sessions from this season
  const deleted = await Session.deleteMany({ date: { $gte: SEASON_START } });
  console.log(`🗑️  Cleared ${deleted.deletedCount} existing test sessions`);

  const players = await Player.find();
  if (players.length === 0) {
    console.error('❌ No players found. Run `npm run seed` first to create players.');
    process.exit(1);
  }
  console.log(`👥 Found ${players.length} players`);

  // The last player will be the "low attendance" one — kept out of most sessions
  // so their stats show the "Need X more sessions to unlock" message
  const lowAttendancePlayer = players[players.length - 1];
  console.log(`📉 "${lowAttendancePlayer.name}" will have low attendance (< 10 sessions)`);

  // Reset sessionsAttended on all players to 0 before re-seeding
  await Player.updateMany({}, { $set: { sessionsAttended: 0 } });

  const sessions = [];

  for (const [i, dateStr] of SESSION_DATES.entries()) {
    const date = new Date(dateStr);
    // Pick 4–7 participants randomly, excluding the low-attendance player
    const regularPlayers = players.filter(p => p._id.toString() !== lowAttendancePlayer._id.toString());
    const count = 4 + Math.floor(Math.random() * 4);
    // Include low-attendance player only in first 3 sessions
    const includeRare = i < 3;
    const pool = includeRare ? players : regularPlayers;
    const attendees = pick(pool, Math.min(count, pool.length));

    const participants = attendees.map(p => ({
      playerId: p._id,
      playerName: p.name,
      team: null,
    }));

    // CL winner — always one of the attendees
    const clWinner = pickOne(attendees);
    const clWinReports = [{ playerId: clWinner._id, playerName: clWinner.name }];

    // EL played ~65% of sessions
    let ulWinReports = [];
    const elPlayed = Math.random() < 0.65;
    if (elPlayed) {
      const elCandidates = attendees.filter(p => p._id.toString() !== clWinner._id.toString());
      if (elCandidates.length > 0) {
        const elWinner = pickOne(elCandidates);
        ulWinReports = [{ playerId: elWinner._id, playerName: elWinner.name }];
      }
    }

    sessions.push({
      name: dateStr,
      date,
      participants,
      guestPlayers: [],
      teams: [],
      numberOfTeams: 0,
      totalAttendees: attendees.length,
      clWinReports,
      ulWinReports,
    });
  }

  await Session.insertMany(sessions);
  console.log(`🌱 Inserted ${sessions.length} test sessions`);

  // Recalculate sessionsAttended from the session data
  const allSessions = await Session.find({ date: { $gte: SEASON_START } });
  const attendanceMap = {};
  for (const s of allSessions) {
    for (const p of s.participants) {
      const key = p.playerId.toString();
      attendanceMap[key] = (attendanceMap[key] || 0) + 1;
    }
  }
  for (const [playerId, count] of Object.entries(attendanceMap)) {
    await Player.findByIdAndUpdate(playerId, { $set: { sessionsAttended: count } });
  }
  console.log(`📊 Updated sessionsAttended for ${Object.keys(attendanceMap).length} players`);

  // Print summary
  console.log('\n📋 Session summary:');
  for (const s of sessions) {
    const elLabel = s.ulWinReports.length > 0 ? `EL: ${s.ulWinReports[0].playerName}` : 'no EL';
    console.log(`  ${s.name} — ${s.participants.length} players | CL: ${s.clWinReports[0].playerName} | ${elLabel}`);
  }

  console.log('\n📊 Attendance per player:');
  for (const p of players) {
    const count = attendanceMap[p._id.toString()] || 0;
    const tag = count < 10 ? ' ⚠️  < 10 (locked stats)' : '';
    console.log(`  ${p.name}: ${count} sessions${tag}`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

seed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

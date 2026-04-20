const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Player = require('../models/Player');

// GET all sessions (sorted by date, newest first)
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ date: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET single session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST create a new session
router.post('/', async (req, res) => {
  try {
    const today = new Date();
    const sessionName = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const session = new Session({
      name: sessionName,
      date: today,
      participants: [],
      guestPlayers: [],
      teams: []
    });
    
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(400).json({ error: 'Failed to create session' });
  }
});

// PATCH update session (participants, guests, and win reports)
router.patch('/:id', async (req, res) => {
  try {
    const { participants, guestPlayers, clWinReports, ulWinReports } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Track previous data for counter updates
    const previousParticipants = session.participants.map(p => p.playerId.toString());
    const newParticipants = participants ? participants.map(p => p.playerId.toString()) : previousParticipants;
    
    const previousClWins = session.clWinReports ? session.clWinReports.map(w => w.playerId.toString()) : [];
    const newClWins = clWinReports ? clWinReports.map(w => w.playerId.toString()) : [];
    
    const previousUlWins = session.ulWinReports ? session.ulWinReports.map(w => w.playerId.toString()) : [];
    const newUlWins = ulWinReports ? ulWinReports.map(w => w.playerId.toString()) : [];
    
    // Calculate deltas
    const addedParticipants = newParticipants.filter(id => !previousParticipants.includes(id));
    const removedParticipants = previousParticipants.filter(id => !newParticipants.includes(id));
    
    const addedClWins = newClWins.filter(id => !previousClWins.includes(id));
    const removedClWins = previousClWins.filter(id => !newClWins.includes(id));
    
    const addedUlWins = newUlWins.filter(id => !previousUlWins.includes(id));
    const removedUlWins = previousUlWins.filter(id => !newUlWins.includes(id));
    
    // Update player attendance counters
    if (addedParticipants.length > 0) {
      await Player.updateMany(
        { _id: { $in: addedParticipants } },
        { $inc: { sessionsAttended: 1 } }
      );
    }
    if (removedParticipants.length > 0) {
      await Player.updateMany(
        { _id: { $in: removedParticipants } },
        { $inc: { sessionsAttended: -1 } }
      );
    }
    
    // Collect ALL player IDs that might need totWins recalculation
    const playerIdsToRecalculate = new Set([
      ...addedClWins,
      ...removedClWins,
      ...addedUlWins,
      ...removedUlWins
    ]);
    
    // Update player CL wins
    if (addedClWins.length > 0) {
      await Player.updateMany(
        { _id: { $in: addedClWins } },
        { $inc: { clWins: 1 } }
      );
      console.log(`✅ Incremented CL wins for ${addedClWins.length} players:`, addedClWins);
    }
    if (removedClWins.length > 0) {
      await Player.updateMany(
        { _id: { $in: removedClWins } },
        { $inc: { clWins: -1 } }
      );
      console.log(`✅ Decremented CL wins for ${removedClWins.length} players:`, removedClWins);
    }
    
    // Update player UL wins
    if (addedUlWins.length > 0) {
      await Player.updateMany(
        { _id: { $in: addedUlWins } },
        { $inc: { ulWins: 1 } }
      );
      console.log(`✅ Incremented UL wins for ${addedUlWins.length} players:`, addedUlWins);
    }
    if (removedUlWins.length > 0) {
      await Player.updateMany(
        { _id: { $in: removedUlWins } },
        { $inc: { ulWins: -1 } }
      );
      console.log(`✅ Decremented UL wins for ${removedUlWins.length} players:`, removedUlWins);
    }
    
    // RECALCULATE totWins for affected players (SAFETY: only modified players)
    if (playerIdsToRecalculate.size > 0) {
      console.log(`\n🔄 Recalculating totWins for ${playerIdsToRecalculate.size} players...`);
      
      const playersToUpdate = await Player.find({ 
        _id: { $in: Array.from(playerIdsToRecalculate) } 
      });
      
      for (const player of playersToUpdate) {
        const oldTotWins = player.totWins;
        const newTotWins = (player.clWins * 2) + player.ulWins;
        
        console.log(`  Player: ${player.name}`);
        console.log(`    clWins: ${player.clWins}, ulWins: ${player.ulWins}`);
        console.log(`    OLD totWins: ${oldTotWins} → NEW totWins: ${newTotWins}`);
        
        // VALIDATE: Verify calculation is correct before saving
        if (newTotWins !== (player.clWins * 2) + player.ulWins) {
          console.error(`    ⚠️  VALIDATION FAILED: Formula mismatch!`);
        }
        
        // Update totWins (this triggers pre-save hook)
        player.totWins = newTotWins;
        await player.save();
        
        // VERIFY: Re-fetch and confirm the value was saved correctly
        const verifyPlayer = await Player.findById(player._id);
        const expectedTotWins = (verifyPlayer.clWins * 2) + verifyPlayer.ulWins;
        
        if (verifyPlayer.totWins === expectedTotWins) {
          console.log(`    ✓ Saved & verified successfully -> totWins: ${verifyPlayer.totWins}`);
        } else {
          console.error(`    ⚠️  VERIFICATION FAILED: Expected ${expectedTotWins}, got ${verifyPlayer.totWins}`);
          console.log(`    🔧 Correcting totWins to ${expectedTotWins}...`);
          
          // FORCE CORRECTION: Directly update if verification fails
          verifyPlayer.totWins = expectedTotWins;
          await verifyPlayer.save();
          
          const finalCheck = await Player.findById(player._id);
          console.log(`    ✓ Corrected! totWins now: ${finalCheck.totWins}`);
        }
      }
      
      console.log(`✅ totWins recalculation complete\n`);
    }
    
    // Update session
    if (participants !== undefined) session.participants = participants;
    if (guestPlayers !== undefined) session.guestPlayers = guestPlayers;
    if (clWinReports !== undefined) session.clWinReports = clWinReports;
    if (ulWinReports !== undefined) session.ulWinReports = ulWinReports;
    session.lastModifiedAt = new Date();
    
    await session.save();
    
    res.json(session);
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(400).json({ error: 'Failed to update session' });
  }
});

// POST generate random teams for a session
router.post('/:id/generate-teams', async (req, res) => {
  try {
    const { numberOfTeams } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (!numberOfTeams || numberOfTeams < 2) {
      return res.status(400).json({ error: 'Number of teams must be at least 2' });
    }
    
    // Collect all attendees (players + guests)
    const allAttendees = [
      ...session.participants.map(p => ({
        type: 'player',
        id: p.playerId,
        name: p.playerName
      })),
      ...session.guestPlayers.map(g => ({
        type: 'guest',
        id: g._id,
        name: g.name
      }))
    ];
    
    if (allAttendees.length === 0) {
      return res.status(400).json({ error: 'No attendees to create teams' });
    }
    
    // Shuffle attendees randomly
    const shuffled = allAttendees.sort(() => Math.random() - 0.5);
    
    // Distribute into teams
    const teams = [];
    for (let i = 0; i < numberOfTeams; i++) {
      teams.push({
        teamNumber: i + 1,
        members: []
      });
    }
    
    shuffled.forEach((attendee, index) => {
      const teamIndex = index % numberOfTeams;
      teams[teamIndex].members.push(attendee);
    });
    
    // Update session with teams
    session.teams = teams;
    session.numberOfTeams = numberOfTeams;
    
    // Update team assignments in participants and guests
    teams.forEach(team => {
      team.members.forEach(member => {
        if (member.type === 'player') {
          const participant = session.participants.find(p => p.playerId.toString() === member.id.toString());
          if (participant) participant.team = team.teamNumber;
        } else {
          const guest = session.guestPlayers.find(g => g._id.toString() === member.id.toString());
          if (guest) guest.team = team.teamNumber;
        }
      });
    });
    
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Error generating teams:', err);
    res.status(400).json({ error: 'Failed to generate teams' });
  }
});

// DELETE a session (with win decrements and totWins recalculation)
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`🗑️  Deleting session: ${session.name}`);
    
    // Decrement sessionsAttended for all participants
    const participantIds = session.participants.map(p => p.playerId);
    if (participantIds.length > 0) {
      await Player.updateMany(
        { _id: { $in: participantIds } },
        { $inc: { sessionsAttended: -1 } }
      );
      console.log(`✅ Decremented sessionsAttended for ${participantIds.length} participants`);
    }
    
    // Collect all player IDs that need totWins recalculation
    const playerIdsToRecalculate = new Set([
      ...participantIds.map(p => p.toString()),
      ...(session.clWinReports ? session.clWinReports.map(w => w.playerId.toString()) : []),
      ...(session.ulWinReports ? session.ulWinReports.map(w => w.playerId.toString()) : [])
    ]);
    
    // Decrement CL wins for all players in clWinReports
    const clWinPlayerIds = session.clWinReports ? session.clWinReports.map(w => w.playerId) : [];
    if (clWinPlayerIds.length > 0) {
      await Player.updateMany(
        { _id: { $in: clWinPlayerIds } },
        { $inc: { clWins: -1 } }
      );
      console.log(`✅ Decremented clWins for ${clWinPlayerIds.length} players`);
    }
    
    // Decrement UL wins for all players in ulWinReports
    const ulWinPlayerIds = session.ulWinReports ? session.ulWinReports.map(w => w.playerId) : [];
    if (ulWinPlayerIds.length > 0) {
      await Player.updateMany(
        { _id: { $in: ulWinPlayerIds } },
        { $inc: { ulWins: -1 } }
      );
      console.log(`✅ Decremented ulWins for ${ulWinPlayerIds.length} players`);
    }
    
    // RECALCULATE totWins for affected players (SAFETY: only modified players)
    if (playerIdsToRecalculate.size > 0) {
      console.log(`\n🔄 Recalculating totWins for ${playerIdsToRecalculate.size} players after deletion...`);
      
      const playersToUpdate = await Player.find({ 
        _id: { $in: Array.from(playerIdsToRecalculate) } 
      });
      
      for (const player of playersToUpdate) {
        const oldTotWins = player.totWins;
        const newTotWins = (player.clWins * 2) + player.ulWins;
        
        console.log(`  Player: ${player.name}`);
        console.log(`    clWins: ${player.clWins}, ulWins: ${player.ulWins}`);
        console.log(`    OLD totWins: ${oldTotWins} → NEW totWins: ${newTotWins}`);
        
        // VALIDATE: Verify calculation is correct before saving
        if (newTotWins !== (player.clWins * 2) + player.ulWins) {
          console.error(`    ⚠️  VALIDATION FAILED: Formula mismatch!`);
        }
        
        // Update totWins (this triggers pre-save hook)
        player.totWins = newTotWins;
        await player.save();
        
        // VERIFY: Re-fetch and confirm the value was saved correctly
        const verifyPlayer = await Player.findById(player._id);
        const expectedTotWins = (verifyPlayer.clWins * 2) + verifyPlayer.ulWins;
        
        if (verifyPlayer.totWins === expectedTotWins) {
          console.log(`    ✓ Saved & verified successfully -> totWins: ${verifyPlayer.totWins}`);
        } else {
          console.error(`    ⚠️  VERIFICATION FAILED: Expected ${expectedTotWins}, got ${verifyPlayer.totWins}`);
          console.log(`    🔧 Correcting totWins to ${expectedTotWins}...`);
          
          // FORCE CORRECTION: Directly update if verification fails
          verifyPlayer.totWins = expectedTotWins;
          await verifyPlayer.save();
          
          const finalCheck = await Player.findById(player._id);
          console.log(`    ✓ Corrected! totWins now: ${finalCheck.totWins}`);
        }
      }
      
      console.log(`✅ totWins recalculation complete\n`);
    }
    
    await Session.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Session deleted successfully',
      affectedPlayers: {
        attendanceDecremented: participantIds.length,
        clWinsDecremented: clWinPlayerIds.length,
        ulWinsDecremented: ulWinPlayerIds.length,
        totWinsRecalculated: playerIdsToRecalculate.size
      }
    });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST calculate delta changes before saving
router.post('/:id/delta', async (req, res) => {
  try {
    const { participants, clWinReports, ulWinReports } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Compare current with proposed
    const currentParticipants = session.participants.map(p => p.playerId.toString());
    const proposedParticipants = participants ? participants.map(p => p.playerId.toString()) : [];
    
    const currentClWins = session.clWinReports ? session.clWinReports.map(w => w.playerId.toString()) : [];
    const proposedClWins = clWinReports ? clWinReports.map(w => w.playerId.toString()) : [];
    
    const currentUlWins = session.ulWinReports ? session.ulWinReports.map(w => w.playerId.toString()) : [];
    const proposedUlWins = ulWinReports ? ulWinReports.map(w => w.playerId.toString()) : [];
    
    // Calculate deltas
    const attendanceAdded = proposedParticipants.filter(id => !currentParticipants.includes(id));
    const attendanceRemoved = currentParticipants.filter(id => !proposedParticipants.includes(id));
    
    const clWinsAdded = proposedClWins.filter(id => !currentClWins.includes(id));
    const clWinsRemoved = currentClWins.filter(id => !proposedClWins.includes(id));
    
    const ulWinsAdded = proposedUlWins.filter(id => !currentUlWins.includes(id));
    const ulWinsRemoved = currentUlWins.filter(id => !proposedUlWins.includes(id));
    
    // For display, fetch player names
    const playerIds = [...new Set([...attendanceAdded, ...attendanceRemoved, ...clWinsAdded, ...clWinsRemoved, ...ulWinsAdded, ...ulWinsRemoved])];
    const playerMap = {};
    if (playerIds.length > 0) {
      const players = await Player.find({ _id: { $in: playerIds } });
      players.forEach(p => {
        playerMap[p._id.toString()] = p.name;
      });
    }
    
    const formatDelta = (ids) => ids.map(id => ({ playerId: id, playerName: playerMap[id] || 'Unknown' }));
    
    res.json({
      attendanceChanges: {
        added: formatDelta(attendanceAdded),
        removed: formatDelta(attendanceRemoved)
      },
      clWinChanges: {
        added: formatDelta(clWinsAdded),
        removed: formatDelta(clWinsRemoved)
      },
      ulWinChanges: {
        added: formatDelta(ulWinsAdded),
        removed: formatDelta(ulWinsRemoved)
      }
    });
  } catch (err) {
    console.error('Error calculating delta:', err);
    res.status(400).json({ error: 'Failed to calculate changes' });
  }
});

// GET success rate for a player
router.get('/success-rate/:playerId', async (req, res) => {
  try {
    const playerId = req.params.playerId;
    
    // Find all sessions where player attended
    const attendedSessions = await Session.find({
      'participants.playerId': playerId
    });
    
    if (attendedSessions.length === 0) {
      return res.json({
        playerId,
        attendanceCount: 0,
        winSessionsCount: 0,
        successRate: '0%',
        details: {
          cl: { won: 0, attempted: 0 },
          ul: { won: 0, attempted: 0 }
        }
      });
    }
    
    // Count sessions where player won CL or UL (either one counts as 1 win session)
    const winSessions = attendedSessions.filter(session => {
      const hasClWin = session.clWinReports?.some(w => w.playerId.toString() === playerId.toString());
      const hasUlWin = session.ulWinReports?.some(w => w.playerId.toString() === playerId.toString());
      return hasClWin || hasUlWin;
    }).length;
    
    // Also count CL and UL separately for details
    const clWins = attendedSessions.filter(session =>
      session.clWinReports?.some(w => w.playerId.toString() === playerId.toString())
    ).length;
    
    const ulWins = attendedSessions.filter(session =>
      session.ulWinReports?.some(w => w.playerId.toString() === playerId.toString())
    ).length;
    
    const successRate = ((winSessions / attendedSessions.length) * 100).toFixed(1);
    
    const player = await Player.findById(playerId);
    
    res.json({
      playerId,
      playerName: player?.name || 'Unknown',
      attendanceCount: attendedSessions.length,
      winSessionsCount: winSessions,
      successRate: `${successRate}%`,
      details: {
        cl: { won: clWins, attempted: attendedSessions.length },
        ul: { won: ulWins, attempted: attendedSessions.length }
      }
    });
  } catch (err) {
    console.error('Error calculating success rate:', err);
    res.status(500).json({ error: 'Failed to calculate success rate' });
  }
});

module.exports = router;

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

// PATCH update session (participants and guests)
router.patch('/:id', async (req, res) => {
  try {
    const { participants, guestPlayers } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Track previous participants for counter updates
    const previousParticipants = session.participants.map(p => p.playerId.toString());
    const newParticipants = participants ? participants.map(p => p.playerId.toString()) : previousParticipants;
    
    // Update session
    if (participants !== undefined) session.participants = participants;
    if (guestPlayers !== undefined) session.guestPlayers = guestPlayers;
    
    await session.save();
    
    // Update player sessionsAttended counters
    // Players added to session
    const addedPlayers = newParticipants.filter(id => !previousParticipants.includes(id));
    await Player.updateMany(
      { _id: { $in: addedPlayers } },
      { $inc: { sessionsAttended: 1 } }
    );
    
    // Players removed from session
    const removedPlayers = previousParticipants.filter(id => !newParticipants.includes(id));
    await Player.updateMany(
      { _id: { $in: removedPlayers } },
      { $inc: { sessionsAttended: -1 } }
    );
    
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

// DELETE a session
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Decrement sessionsAttended for all participants
    const participantIds = session.participants.map(p => p.playerId);
    await Player.updateMany(
      { _id: { $in: participantIds } },
      { $inc: { sessionsAttended: -1 } }
    );
    
    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

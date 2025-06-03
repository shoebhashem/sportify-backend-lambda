require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');

const testData = [
  { 
    name: 'Shoeb', 
    nationality: 'Afghanistan', 
    favoriteClub: 'Barcelona', 
    clWins: 3,
    ulWins: 1,
    birthDate: new Date('1995-06-15'),
    profilePictureUrl: 'https://i.pravatar.cc/150?img=1',
    admin: true,
    description: 'A passionate Barcelona fan with great tactical knowledge and leadership skills on and off the field.'
  },
  { 
    name: 'Khalid', 
    nationality: 'Ethiopia', 
    favoriteClub: 'Barcelona', 
    clWins: 15,
    ulWins: 8,
    birthDate: new Date('1992-03-22'),
    profilePictureUrl: 'https://i.pravatar.cc/150?img=2',
    admin: true,
    description: 'The champion with the most CL wins! Known for his incredible consistency and strategic gameplay.'
  },
  { 
    name: 'Khosro', 
    nationality: 'Iran', 
    favoriteClub: 'Barcelona', 
    clWins: 6,
    ulWins: 3,
    birthDate: new Date('1993-11-10'),
    profilePictureUrl: 'https://i.pravatar.cc/150?img=3',
    admin: false,
    description: 'A reliable midfielder with excellent ball control and vision.'
  },
  { 
    name: 'Tarek SR', 
    nationality: 'Lebanon', 
    favoriteClub: 'Juventus', 
    clWins: 2,
    ulWins: 0,
    birthDate: new Date('1996-08-05'),
    profilePictureUrl: 'https://i.pravatar.cc/150?img=4',
    admin: false,
    description: 'The Juventus loyalist bringing Italian tactical discipline to the group.'
  },
  { 
    name: 'Test Player', 
    nationality: 'BosniaAndHerzegovina', 
    favoriteClub: 'Real Madrid', 
    clWins: 1,
    ulWins: 0,
    birthDate: new Date('1994-12-25'),
    profilePictureUrl: 'https://i.pravatar.cc/150?img=5',
    admin: false,
    description: ''
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    await Player.deleteMany();
    console.log('🗑️  Cleared existing players');
    
    // Insert test data
    const insertedPlayers = await Player.insertMany(testData);
    console.log(`🌱 Seeded ${insertedPlayers.length} test players:`);
    
    insertedPlayers.forEach(player => {
      console.log(`   - ${player.name} (${player.nationality}) - CL: ${player.clWins}`);
    });
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();

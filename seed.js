require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');

const initialData = [
  { name: 'Shoeb', nationality: 'Afghanistan', favoriteClub: 'Barcelona', clWins: 3 },
  { name: 'Khalid', nationality: 'Etiopien', favoriteClub: 'Barcelona', clWins: 15 },
  { name: 'Khosro', nationality: 'Iran', favoriteClub: 'Barcelona', clWins: 6 },
  { name: 'Tarek Sr', nationality: 'Libanon', favoriteClub: 'Juventus', clWins: 2 },
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    await Player.deleteMany();
    await Player.insertMany(initialData);
    console.log('Seed data inserted');
    mongoose.disconnect();
  })
  .catch(err => console.log(err));

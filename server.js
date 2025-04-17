const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const playerRoutes = require('./routes/playerRoutes');
app.use('/api/players', playerRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

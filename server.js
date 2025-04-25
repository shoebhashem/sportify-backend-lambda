const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Define allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://ec2.publicvm.com', 'https://gbgfotboll.netlify.app']
  : ['http://localhost:5173']; // Replace with your local frontend URL

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
  

const playerRoutes = require('./routes/playerRoutes');
app.use('/api/players', playerRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

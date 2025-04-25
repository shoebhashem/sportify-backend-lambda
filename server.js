const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  'https://gbgfotboll.netlify.app',
  'http://localhost:5173',
  'https://www.gbgfotboll.netlify.app' // just in case Netlify routes through www
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 Incoming Origin:', origin);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
const playerRoutes = require('./routes/playerRoutes');
app.use('/api/players', playerRoutes);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

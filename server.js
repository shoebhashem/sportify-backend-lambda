const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Load .env.local in development, .env in production
const envFile = process.env.NODE_ENV === 'development' ? '.env.local' : '.env';
require('dotenv').config({ path: envFile });

const app = express();

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
const sessionRoutes = require('./routes/sessionRoutes');
const pointsHistoryRoutes = require('./routes/pointsHistoryRoutes');
app.use('/api/players', playerRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/points-history', pointsHistoryRoutes);

// Export the app for Lambda (remove app.listen for Lambda)
module.exports = app;

// For local development, you can still run the server
if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

// Define allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://ec2.publicvm.com', 'https://gbgfotboll.netlify.app']
  : ['http://localhost:5173']; // Replace with your local frontend URL

// ✅ Updated CORS options with logging and fallback handling
const corsOptions = {
  origin: function (origin, callback) {
    console.log("🌐 Incoming Origin:", origin);

    // Allow requests with no origin (like curl or same-origin requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("🚫 Blocked by CORS:", origin);
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

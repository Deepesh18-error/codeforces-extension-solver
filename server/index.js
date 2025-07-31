// File: server/index.js (FINAL, CORRECTED VERSION)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');

// Import our router
const apiRoutes = require('./routes/solveRoutes'); // Rename for clarity

const app = express();

// --- MIDDLEWARE SETUP ---
app.use(cors(corsOptions));
app.use(express.json());

// --- API ENDPOINTS / ROUTES ---

// A simple test route to make sure the server is alive
app.get('/', (req, res) => {
  res.send('Backend Server is alive!');
});

// Use the apiRoutes for any request that starts with /api
// This is the key change.
app.use('/api', apiRoutes);

// --- START THE SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
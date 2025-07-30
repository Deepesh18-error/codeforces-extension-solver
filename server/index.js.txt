// File: server/index.js (The new, cleaner version)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');

// Import our new router
const solveRoutes = require('./routes/solveRoutes');

const app = express();

// --- MIDDLEWARE SETUP ---
app.use(cors(corsOptions));
app.use(express.json());

// --- API ENDPOINTS / ROUTES ---

// A simple test route to make sure the server is alive
app.get('/', (req, res) => {
  res.send('Backend Server is alive!');
});

// Use the solveRoutes for any request to /api/solve
app.use('/api/solve', solveRoutes);

// --- START THE SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// File: server/routes/solveRoutes.js

const express = require('express');
const router = express.Router();

// This route will correspond to POST /api/solve
router.post('/', (req, res) => {
  console.log('--- Request received at /api/solve ---');

  // --- Data Validation Logic ---
  const problemData = req.body;
  if (!problemData || !problemData.title || !problemData.statement) {
    console.error('Validation Failed: Missing required fields.');
    return res.status(400).json({ error: 'Invalid request body. Missing title or statement.' });
  }

  console.log('Received Problem Title:', problemData.title);

  // --- Dummy Response Logic ---
  const dummySolution = {
    solution: `// This is a placeholder solution from the PHASE 2 SERVER!\n// Problem: ${problemData.title}\n\nint main() {\n    return 0;\n}`
  };

  res.status(200).json(dummySolution);
});

// We could add other related routes here, like GET /api/solve/history, etc.

module.exports = router;
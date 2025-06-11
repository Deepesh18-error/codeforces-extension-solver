// File: server/routes/solveRoutes.js

const express = require('express');
const router = express.Router();
const { getAiSolution } = require('../services/aiService'); // <-- Import our new AI service

// This route will correspond to POST /api/solve
// It needs to be 'async' now because we are waiting for the AI.
router.post('/', async (req, res) => {
  console.log('--- Request received at /api/solve ---');

  // --- Data Validation Logic ---
  const problemData = req.body;
  if (!problemData || !problemData.title || !problemData.statement) {
    console.error('Validation Failed: Missing required fields.');
    return res.status(400).json({ error: 'Invalid request body. Missing title or statement.' });
  }

  console.log('Received Problem Title:', problemData.title);

  // --- AI LOGIC (The new part) ---
  // Replace the dummy logic with a call to our AI service.
  try {
    const solutionCode = await getAiSolution(problemData);
    
    // The AI service has been called, and we have a solution.
    // Now we package it in the standard response format.
    const responsePayload = {
      solution: solutionCode
    };

    res.status(200).json(responsePayload);

  } catch (error) {
    // This will catch any unexpected errors from the aiService itself.
    console.error("Error in /api/solve handler:", error);
    res.status(500).json({ error: "An internal server error occurred while contacting the AI service." });
  }
});

module.exports = router;
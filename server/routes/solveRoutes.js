// File: server/routes/solveRoutes.js (FINAL, REFINED & CONFIRMED)

const express = require('express');
const router = express.Router();
const { getAiSolution } = require('../services/aiService');

// This route handles all POST requests to /api/solve from the extension.
router.post('/', async (req, res) => {
  console.log('--- Request received at /api/solve ---');

  // 1. Validate the incoming request body to ensure it has the required data.
  const problemData = req.body;
  if (!problemData || !problemData.title || !problemData.statement) {
    console.error('Validation Failed: Request body is missing title or statement.');
    // If validation fails, send a "400 Bad Request" response and stop.
    return res.status(400).json({ error: 'Invalid request body. Missing title or statement.' });
  }

  console.log(`Received request for problem: "${problemData.title}"`);

  // 2. Call the AI service inside a try...catch block.
  // This is the server's safety net that prevents it from crashing if the AI call fails.
  try {
    // We await the solution from our resilient aiService.
    const solutionCode = await getAiSolution(problemData);
    
    // If successful, package the solution into the standard JSON response format.
    const responsePayload = {
      solution: solutionCode
    };

    console.log('--- Successfully generated solution. Sending 200 OK response. ---');
    res.status(200).json(responsePayload);

  } catch (error) {
    // This block executes ONLY if getAiSolution throws an error.
    console.error("--- Error in /api/solve handler. The AI service failed. Sending 500 Internal Server Error. ---");
    console.error("Error details from AI Service:", error.message);

    // Send a structured error message back to the Chrome extension.
    res.status(500).json({ 
      error: "An internal server error occurred on the server while contacting the AI.",
      details: error.message // This includes the specific reason (e.g., model not found, safety block).
    });
  }
});

module.exports = router;
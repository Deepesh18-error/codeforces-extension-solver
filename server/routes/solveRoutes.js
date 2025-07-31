// File: server/routes/solveRoutes.js (FINAL, REFINED & CONFIRMED for Debugging)

const express = require('express');
const router = express.Router();
const { getAiSolution } = require('../services/aiService');
// --- Import the new prompt builder function ---
const { buildOptimalPrompt, buildDebugPrompt } = require('../services/promptBuilder');

// --- ROUTE 1: /api/solve (for initial problem solving) ---
router.post('/solve', async (req, res) => {
  console.log('--- Request received at /api/solve ---');

  const problemData = req.body;
  if (!problemData || !problemData.title || !problemData.statement) {
    console.error('Validation Failed: Request body is missing title or statement.');
    return res.status(400).json({ error: 'Invalid request body. Missing title or statement.' });
  }

  console.log(`Received request for problem: "${problemData.title}"`);

  try {
    // 1. Build the initial prompt
    const prompt = buildOptimalPrompt(problemData);
    // 2. Get the solution using the generic service
    const solutionCode = await getAiSolution(prompt);
    
    const responsePayload = { solution: solutionCode };
    console.log('--- Successfully generated initial solution. Sending 200 OK response. ---');
    res.status(200).json(responsePayload);

  } catch (error) {
    console.error("--- Error in /api/solve handler:", error.message);
    res.status(500).json({ 
      error: "An internal server error occurred while contacting the AI.",
      details: error.message
    });
  }
});


// --- NEW ROUTE 2: /api/debug (for debugging a failed solution) ---
router.post('/debug', async (req, res) => {
    console.log('--- Request received at /api/debug ---');

    // 1. Validate the incoming debug context
    const debugContext = req.body;
    if (!debugContext || !debugContext.problem || !debugContext.failedAttempt?.code || !debugContext.failedAttempt?.failureDetails) {
        console.error('Validation Failed: Debug context is missing required fields.');
        return res.status(400).json({ error: 'Invalid request body. Missing debug context.' });
    }

    console.log(`Received debug request for problem: "${debugContext.problem.title}"`);

    try {
        // 2. Build the specialized debug prompt
        const prompt = buildDebugPrompt(debugContext);

        // --- START OF NEW LOGGING ---
        console.log("==========================================================");
        console.log("            SENDING DEBUG PROMPT TO AI                    ");
        console.log("==========================================================");
        console.log(prompt);
        console.log("==========================================================");
        // --- END OF NEW LOGGING ---

        // 3. Get the solution using the same generic service
        const solutionCode = await getAiSolution(prompt);

        const responsePayload = { solution: solutionCode };
        console.log('--- Successfully generated debugged solution. Sending 200 OK response. ---');
        res.status(200).json(responsePayload);

    } catch (error) {
        // ... (error handling is the same)
    }
});



module.exports = router;
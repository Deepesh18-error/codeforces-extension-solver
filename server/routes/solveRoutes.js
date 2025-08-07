const express = require('express');
const router = express.Router();
const { getAiSolution } = require('../services/aiService');
const { buildOptimalPrompt, buildDebugPrompt } = require('../services/promptBuilder');
const { performance } = require('perf_hooks'); // Import the performance module

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
    const prompt = buildOptimalPrompt(problemData);
    
    // --- START TIMER ---
    const startTime = performance.now();

    const solutionCode = await getAiSolution(prompt);

    const endTime = performance.now();
    const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`AI Latency: Model took ${durationInSeconds} seconds to respond.`);
    
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


// --- ROUTE 2: /api/debug (for debugging a failed solution) ---
router.post('/debug', async (req, res) => {
    console.log('--- Request received at /api/debug ---');

    const debugContext = req.body;
    if (!debugContext || !debugContext.problem || !debugContext.failedAttempt?.code) {
        console.error('Validation Failed: Debug context is missing required fields.');
        return res.status(400).json({ error: 'Invalid request body. Missing debug context.' });
    }

    console.log(`Received debug request for problem: "${debugContext.problem.title}"`);

    try {
        const prompt = buildDebugPrompt(debugContext);

        console.log("==========================================================");
        console.log("            SENDING DEBUG PROMPT TO AI                    ");
        console.log("==========================================================");
        console.log(prompt);
        console.log("==========================================================");

        // --- START TIMER ---
        const startTime = performance.now();

        const solutionCode = await getAiSolution(prompt);

        const endTime = performance.now();
        const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`AI Latency: Model took ${durationInSeconds} seconds to respond.`);

        const responsePayload = { solution: solutionCode };
        console.log('--- Successfully generated debugged solution. Sending 200 OK response. ---');
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error("--- FATAL ERROR in /api/debug handler ---");
        console.error("This likely means the data sent from the extension was malformed.");
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
        res.status(500).json({ 
            error: "An internal server error occurred while building the debug prompt.",
            details: error.message
        });
    }
});

module.exports = router;
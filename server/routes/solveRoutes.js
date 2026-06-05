const express = require('express');
const router = express.Router();
const { getAiSolution } = require('../services/aiService');
const { buildOptimalPrompt, buildDebugPrompt } = require('../services/promptBuilder');
const { performance } = require('perf_hooks');

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
    
    const startTime = performance.now();

    const solutionCode = await getAiSolution(prompt);

    const endTime = performance.now();
    const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Generation latency: ${durationInSeconds}s.`);
    
    const responsePayload = { solution: solutionCode };
    console.log('--- Successfully generated initial solution. Sending 200 OK response. ---');
    res.status(200).json(responsePayload);

  } catch (error) {
    console.error("--- Error in /api/solve handler:", error.message);
    res.status(500).json({ 
      error: "An internal server error occurred while generating the solution.",
      details: error.message
    });
  }
});


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
        console.log("            DEBUG PROMPT                                  ");
        console.log("==========================================================");
        console.log(prompt);
        console.log("==========================================================");

        const startTime = performance.now();

        const solutionCode = await getAiSolution(prompt);

        const endTime = performance.now();
        const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`Generation latency: ${durationInSeconds}s.`);

        const responsePayload = { solution: solutionCode };
        console.log('--- Successfully generated debugged solution. Sending 200 OK response. ---');
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error("--- Error in /api/debug handler ---");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        res.status(500).json({ 
            error: "An internal server error occurred while generating the corrected solution.",
            details: error.message
        });
    }
});

module.exports = router;

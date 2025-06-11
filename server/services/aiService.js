// File: server/services/aiService.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildOptimalPrompt } = require('./promptBuilder');
const { parseCodeFromResponse } = require('./responseParser');

// Initialize the Google AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * The main service function. It orchestrates the entire process of getting a solution.
 * @param {object} problemData - The scraped data from the extension.
 * @returns {Promise<string>} A promise that resolves with the final, clean AI-generated code.
 */
async function getAiSolution(problemData) {
  // 1. Build the optimal prompt using our dedicated builder.
  const prompt = buildOptimalPrompt(problemData);

  // ==========================================================
  //  DEBUG LOG: This shows you the exact data being sent to the AI.
  // ==========================================================
  console.log("--- FULL PROMPT BEING SENT TO GEMINI ---");
  console.log(prompt);
  console.log("----------------------------------------");
  // ==========================================================

  // 2. Call the AI library's function.
  const modelName = "gemini-2.5-flash-preview-05-20"; // Using the model you requested
  console.log(`AI_Service: Using Google Gemini model: ${modelName}`);
  console.log("AI_Service: Sending request to Google Gemini...");

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawSolution = response.text();
    
    console.log("AI_Service: Response received from Google Gemini.");

    // 3. Get the code back by refining and cleaning it with our dedicated parser.
    const cleanSolution = parseCodeFromResponse(rawSolution);
    return cleanSolution;

  } catch (error) {
    console.error("AI_Service: Error calling Google Gemini API:", error);
    // Return a user-friendly error message formatted as a comment in the code
    return `// Error: Could not get a solution from the AI.\n// Reason: ${error.message}`;
  }
}

module.exports = { getAiSolution };
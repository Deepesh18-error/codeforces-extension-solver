// File: server/services/aiService.js (FINAL - Corrected Model Name)

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
  // The entire function is wrapped in a try...catch to handle any unexpected errors,
  // especially from the API call.
  try {
    // 1. Build the optimal prompt.
    const prompt = buildOptimalPrompt(problemData);
    console.log("AI_Service: Prompt built successfully.");

    // 2. Call the AI library's function.
    // --- THIS IS THE ONLY LINE THAT HAS BEEN CHANGED ---
    const modelName = "gemini-1.5-flash-latest"; // Using a stable, recommended model name.
    
    console.log(`AI_Service: Using Google Gemini model: ${modelName}`);
    console.log("AI_Service: Sending request to Google Gemini...");
    
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // This critical check handles cases where Gemini blocks the response for safety.
    if (!response || !response.text()) {
        const finishReason = response?.promptFeedback?.blockReason || 'No content';
        const safetyRatings = response?.candidates?.[0]?.safetyRatings || 'N/A';
        console.error(`AI_Service: Gemini response was empty or blocked. Reason: ${finishReason}`);
        console.error(`AI_Service: Safety Ratings: ${JSON.stringify(safetyRatings)}`);
        // We throw a specific error that the route handler can catch.
        throw new Error(`The AI service returned an empty or blocked response. Reason: ${finishReason}`);
    }
    
    const rawSolution = response.text();
    console.log("AI_Service: Response received from Google Gemini.");

    // 3. Get the code back by refining and cleaning it.
    const cleanSolution = parseCodeFromResponse(rawSolution);
    return cleanSolution;

  } catch (error) {
    // This block catches errors from the API call (e.g., network issues, invalid API key)
    // or the custom error we threw above for safety blocks.
    console.error("AI_Service: An error occurred within getAiSolution:", error.message);
    
    // Re-throw the error so the calling function (solveRoutes.js) knows something went wrong.
    throw error;
  }
}

module.exports = { getAiSolution };
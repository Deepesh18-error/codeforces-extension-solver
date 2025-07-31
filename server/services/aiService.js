// File: server/services/aiService.js (FINAL, REFINED FOR REUSABILITY)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parseCodeFromResponse } = require('./responseParser');

// Initialize the Google AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * The main service function. It takes a pre-built prompt, sends it to the Gemini API,
 * and returns the cleaned code solution.
 * @param {string} prompt - The fully-formed prompt to send to the AI.
 * @returns {Promise<string>} A promise that resolves with the final, clean AI-generated code.
 */
async function getAiSolution(prompt) {
  // The entire function is wrapped in a try...catch to handle any unexpected errors.
  try {
    // This function no longer builds the prompt. It receives it as an argument.
    const modelName = "gemini-1.5-flash-latest";
    
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

    // Get the code back by refining and cleaning it.
    const cleanSolution = parseCodeFromResponse(rawSolution);
    return cleanSolution;

  } catch (error) {
    // This block catches errors from the API call (e.g., network issues, invalid API key)
    // or the custom error we threw above for safety blocks.
    console.error("AI_Service: An error occurred within getAiSolution:", error.message);
    
    // Re-throw the error so the calling function (the route handler) knows something went wrong.
    throw error;
  }
}

module.exports = { getAiSolution };
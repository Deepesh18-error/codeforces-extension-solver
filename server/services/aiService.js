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
  try {
      
    // gemini-1.5-flash-latest , gemini-2.5-flash-preview-05-20

    const modelName = "gemini-2.5-flash-preview-05-20";
    
    console.log(`AI_Service: Using Google Gemini model: ${modelName}`);
    console.log("AI_Service: Sending request to Google Gemini...");
    
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text()) {
        const finishReason = response?.promptFeedback?.blockReason || 'No content';
        const safetyRatings = response?.candidates?.[0]?.safetyRatings || 'N/A';
        console.error(`AI_Service: Gemini response was empty or blocked. Reason: ${finishReason}`);
        console.error(`AI_Service: Safety Ratings: ${JSON.stringify(safetyRatings)}`);
        throw new Error(`The AI service returned an empty or blocked response. Reason: ${finishReason}`);
    }
    
    const rawSolution = response.text();
    
    
    console.log("==========================================================");
    console.log("            RAW RESPONSE FROM GEMINI API                  ");
    console.log("==========================================================");
    console.log(rawSolution);
    console.log("==========================================================");
  

    const cleanSolution = parseCodeFromResponse(rawSolution);

    console.log("==========================================================");
    console.log("            PARSED SOLUTION (after cleaning)              ");
    console.log("==========================================================");
    console.log(`--- Start of Parsed Code (Length: ${cleanSolution.length}) ---`);
    console.log(cleanSolution);
    console.log("--- End of Parsed Code ---");
    if (cleanSolution.length === 0) {
        console.warn("\nAI_Service: WARNING - The parsed solution is an EMPTY STRING. This is likely causing the empty editor issue.\n");
    }
    console.log("==========================================================");
  

    return cleanSolution;

  } catch (error) {
    console.error("AI_Service: An error occurred within getAiSolution:", error.message);
    throw error;
  }
}

module.exports = { getAiSolution };



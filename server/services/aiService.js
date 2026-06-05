const { GoogleGenAI } = require('@google/genai');
const { parseCodeFromResponse } = require('./responseParser');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getModelCandidates = () => {
  const configuredModels = process.env.GEMINI_MODEL || process.env.GEMINI_MODELS;
  if (configuredModels) {
    return configuredModels
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
  }

  return [
    "gemini-3.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash"
  ];
};

const isRetryableModelError = (error) => {
  const message = error?.message || '';
  return message.includes('[404 Not Found]') ||
         message.includes('not found') ||
         message.includes('is not supported for generateContent') ||
         message.includes('[403 Forbidden]') ||
         message.includes('[429 Too Many Requests]');
};

async function getAiSolution(prompt) {
  const modelCandidates = getModelCandidates();
  let lastError = null;

  for (const modelName of modelCandidates) {
    console.log(`Gemini service: using model ${modelName}`);
    console.log("Gemini service: sending generation request.");

    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const rawSolution = response?.text;
      if (!rawSolution) {
        throw new Error('The generation service returned an empty response.');
      }

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
        console.warn("\nGemini service: parsed solution is empty.\n");
      }
      console.log("==========================================================");

      return cleanSolution;
    } catch (error) {
      lastError = error;
      console.error(`Gemini service: model ${modelName} failed:`, error.message);

      if (!isRetryableModelError(error)) {
        break;
      }

      console.warn("Gemini service: trying the next configured model.");
    }
  }

  throw lastError || new Error("No Gemini models were configured.");
}

module.exports = { getAiSolution };



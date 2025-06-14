// File: server/services/promptBuilder.js

/**
 * Builds a high-quality, optimal prompt to send to the Gemini model,
 * incorporating role-playing, constraints, the problem statement, and formatting rules.
 * @param {object} problemData - The scraped data from the extension.
 * @returns {string} The fully-formed prompt string.
 */
function buildOptimalPrompt(problemData) {
  // 1. Role Playing: Prime the AI to act as an expert.
  const rolePlaying = "You are a world-class competitive programmer and an expert C++ algorithmist. You are known for writing clean, efficient, and correct code.";

  // 2. The Task & Constraints: Give clear, direct instructions.
  const taskAndConstraints = "Your task is to solve the following programming problem. The solution must be a single, complete, runnable C++ program that reads from standard input and writes to standard output.";
  
  // 3. Formatting Instructions: This is crucial for easy parsing.
  const formatting = "Your response MUST contain ONLY the C++ code. Do not include any introductory text, explanations, analysis, or concluding remarks. The entire response should be the raw source code, optionally inside a ```cpp markdown block.";

  // 4. Assembling the context from the problem data.
  const problemContext = `
--- PROBLEM TITLE ---
${problemData.title}

--- PROBLEM STATEMENT ---
${problemData.statement}

--- SAMPLE CASES ---
${problemData.samples.map((sample, index) => `
Sample Input ${index + 1}:
${sample.input}
Sample Output ${index + 1}:
${sample.output}`).join('\n')}
`;

  // Combine all parts into the final prompt.
  const finalPrompt = `
${rolePlaying}

${taskAndConstraints}

${formatting}
${problemContext}
--- YOUR C++ SOLUTION CODE ---
`;

  return finalPrompt.trim();
}

module.exports = { buildOptimalPrompt };
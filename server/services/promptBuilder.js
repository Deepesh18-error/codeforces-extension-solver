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

// CORRECTED FUNCTION
// REPLACED FUNCTION in promptBuilder.js

function buildDebugPrompt(debugContext) {
  const { problem, failedAttempt } = debugContext;
  const { code, failureDetails } = failedAttempt;

  const rolePlaying = "You are an expert C++ competitive programmer and a master debugger. Your primary skill is finding subtle bugs in code and fixing them.";

  // --- IMPROVED INSTRUCTIONS ---
  const taskAndConstraints = "CRITICAL MISSION: Your previous C++ solution, provided below, FAILED on a hidden test case. I have provided you with the exact test case data. Your task is to meticulously analyze WHY your code failed and provide a CORRECTED, different solution. DO NOT provide the same code again. You must identify the logical error and fix it. Your response MUST contain ONLY the corrected C++ code, and nothing else.";
  
  let checkerLogContext = '';
  if (failureDetails.checkerLog && failureDetails.checkerLog.trim() && failureDetails.checkerLog !== '[Not Available]') {
      checkerLogContext = `
--- CHECKER LOG (This is a huge clue!) ---
${failureDetails.checkerLog}
`;
  }

  const context = `
--- ORIGINAL PROBLEM STATEMENT ---
Title: ${problem.title}
${problem.statement}

--- YOUR PREVIOUS FAILED CODE (THIS CODE IS WRONG) ---
\`\`\`cpp
${code}
\`\`\`

--- FAILED TEST CASE ANALYSIS (Your code failed with this data) ---
Input:
${failureDetails.input}

Your Code's Incorrect Output:
${failureDetails.output}

Expected Correct Answer:
${failureDetails.answer}
${checkerLogContext}
--- YOUR NEW, CORRECTED, AND COMPLETE C++ SOLUTION ---
`;

  return `
${rolePlaying}

${taskAndConstraints}
${context}
  `.trim();
}

// UPDATE module.exports
module.exports = { buildOptimalPrompt, buildDebugPrompt };

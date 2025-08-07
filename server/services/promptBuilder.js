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

  const finalPrompt = `
${rolePlaying}

${taskAndConstraints}

${formatting}
${problemContext}
--- YOUR C++ SOLUTION CODE ---
`;

  return finalPrompt.trim();
}


function buildDebugPrompt(debugContext) {
  const { problem, failedAttempt } = debugContext;
  const { code, failureDetails } = failedAttempt;

  const rolePlaying = "You are a world-class competitive programmer and an expert debugger. You methodically analyze failures to devise robust, correct solutions.";


  const taskAndConstraints = `
--- YOUR MISSION ---

Your previous solution was based on a flawed premise:

This entire line of reasoning has been proven incorrect. Your task is to act as an expert debugger and follow these steps precisely:

1.  **ANALYZE THE FAILURE:** Your primary task is to deeply analyze the provided "Debugging Data". Understand *exactly* why the previous code failed on that specific input by comparing your incorrect output to the expected answer.

2.  **ABANDON THE FAILED LOGIC:** Based on your analysis, you must completely **abandon the flawed logic** of the previous attempt. Do not try to patch it or make small changes. It is fundamentally wrong.

3.  **DESIGN A NEW ALGORITHM:** Formulate a **fundamentally new and correct algorithm** that properly handles the problem's constraints and the specific edge case revealed by the failed test.

4.  **IMPLEMENT THE SOLUTION:** Write the complete, runnable C++ code for your new solution. Your entire response must be **ONLY the C++ code** inside a markdown block. Do not include any explanations, apologies, or conversational text.
`;

  
  let checkerLogContext = '';
  if (failureDetails.checkerLog && failureDetails.checkerLog.trim() && failureDetails.checkerLog !== '[Not Available]') {
      checkerLogContext = `
--- CHECKER LOG (This is a huge clue!) ---
${failureDetails.checkerLog}
`;
  }

  const context = `
--- ORIGINAL PROBLEM DEFINITION ---
Title: ${problem.title}
${problem.statement}

--- FAILED EXPERIMENT (The Previous Incorrect Code) ---
The following code is based on a flawed premise and should NOT be reused.
\`\`\`cpp
${code}
\`\`\`

--- DEBUGGING DATA (Your Primary Focus) ---
This data reveals the flaw in the previous attempt.

${checkerLogContext}

[BATCH INPUT THAT CAUSED FAILURE]
${failureDetails.input}

[YOUR PROGRAM's INCORRECT BATCH OUTPUT]
${failureDetails.output}

[THE JUDGE's CORRECT BATCH ANSWER]
${failureDetails.answer}

--- YOUR NEW, CORRECT C++ SOLUTION (Based on a New Algorithm) ---
`;

  // 5. Assemble the final prompt.
  return `
${rolePlaying}

${taskAndConstraints}

${context}
  `.trim();
}

module.exports = { buildOptimalPrompt, buildDebugPrompt };
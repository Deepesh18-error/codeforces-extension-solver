// File: server/services/responseParser.js

/**
 * Cleans the raw text response from the AI to extract only the C++ code block.
 * It intelligently handles markdown blocks and other conversational text.
 * @param {string} rawResponse - The text response from the Gemini API.
 * @returns {string} The cleaned, pure C++ code.
 */
function parseCodeFromResponse(rawResponse) {
  if (!rawResponse) {
    return "// Error: Received an empty or null response from the AI.";
  }

  // Priority 1: Look for a C++ markdown block (```cpp ... ```)
  const cppBlockMatch = rawResponse.match(/```cpp([\s\S]*?)```/);
  if (cppBlockMatch && cppBlockMatch[1]) {
    return cppBlockMatch[1].trim();
  }

  // Priority 2: Look for a generic markdown block (``` ... ```)
  const genericBlockMatch = rawResponse.match(/```([\s\S]*?)```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    // Sometimes a generic block might still have a language hint on the first line.
    // e.g., ```c++\n#include...
    const code = genericBlockMatch[1];
    return code.replace(/^(cpp|c\+\+)\s*\n/, '').trim(); // Remove the language hint if it exists
  }

  // Priority 3: If no markdown block is found, assume the entire response is code.
  // This is a fallback in case the AI doesn't follow formatting instructions perfectly.
  return rawResponse.trim();
}

module.exports = { parseCodeFromResponse };
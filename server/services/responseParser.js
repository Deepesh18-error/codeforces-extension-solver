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

 
  const cppBlockMatch = rawResponse.match(/```cpp([\s\S]*?)```/);
  if (cppBlockMatch && cppBlockMatch[1]) {
    return cppBlockMatch[1].trim();
  }

  const genericBlockMatch = rawResponse.match(/```([\s\S]*?)```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
   
    const code = genericBlockMatch[1];
    return code.replace(/^(cpp|c\+\+)\s*\n/, '').trim(); 
  }

  return rawResponse.trim();
}

module.exports = { parseCodeFromResponse };
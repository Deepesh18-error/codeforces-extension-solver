function parseCodeFromResponse(rawResponse) {
  if (!rawResponse) {
    return "// Error: Received an empty response from the generator.";
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

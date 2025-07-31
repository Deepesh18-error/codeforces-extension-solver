// File: extension/background.js (DEFINITIVE, FULLY CORRECTED VERSION)

console.log("--- Background Script (HQ) is online. ---");

/**
 * Fetches the INITIAL AI solution from the backend server.
 * @param {object} problemData - The problem data scraped from the page.
 */
async function getSolutionAndStoreIt(problemData) {
  const serverUrl = 'http://localhost:3000/api/solve';
  console.log(`HQ: Contacting server at ${serverUrl} to solve "${problemData.title}"...`);
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(problemData)
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.solution) {
      console.log("HQ: Initial solution received. Storing for pasting and for debug context.");
      // For the first solution, we set BOTH storage keys. This was the critical fix.
      chrome.storage.local.set({ 
          solutionToPaste: data.solution,
          debugging_context_lastCode: data.solution 
      });
    } else {
      throw new Error("Server response did not contain a 'solution' key.");
    }
  } catch (error) {
    console.error('HQ: Fetch to backend for initial solve failed:', error);
    chrome.storage.local.set({ solutionToPaste: `// Error: Failed to get solution.\n// Reason: ${error.message}` });
  }
}

/**
 * Fetches a DEBUGGED AI solution from the backend and stores it for pasting.
 * @param {object} debugContext - The full context including problem, failed code, and failure details.
 */
async function getDebuggedSolution(debugContext) {
  const serverUrl = 'http://localhost:3000/api/debug'; // The new endpoint
  console.log(`HQ: Contacting server at ${serverUrl} to debug the problem...`);
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debugContext)
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.solution) {
      console.log("HQ: Debugged solution received. Storing for pasting and updating debug context.");
      // For a debugged solution, we update BOTH keys again.
      chrome.storage.local.set({ 
          solutionToPaste: data.solution,
          debugging_context_lastCode: data.solution 
      });
    } else {
      throw new Error("Server response did not contain a 'solution' key.");
    }
  } catch (error) {
    console.error('HQ: Fetch to backend for debug failed:', error);
    chrome.storage.local.set({ solutionToPaste: `// Error: Failed to get debugged solution.\n// Reason: ${error.message}` });
  }
}

// ==========================================================
//  Main Message Listener (UPDATED to handle all message types)
// ==========================================================
chrome.runtime.onMessage.addListener((message, sender) => {
    
    // Handler for the original "Solve" request
    if (message.type === 'getSolutionAndPrepareToPaste') {
        
        console.log("HQ: Received 'Solve' mission. Will fetch solution in the background.");
        getSolutionAndStoreIt(message.data);

        if (message.submitUrl) {
            console.log("HQ: Navigating user's tab to a specific URL provided by content script.");
            chrome.tabs.update(sender.tab.id, { url: message.submitUrl });
        } else {
            console.log("HQ: No submitUrl provided. Navigation handled by content script.");
        }
        return; // Good practice to return after handling a message
    }

    // Handler for the new "Debug" request
    if (message.type === 'requestDebugSolution') {
        console.log("HQ: Received 'Debug' mission. Will contact server with failure context.");
        getDebuggedSolution(message.data);
        return; // Good practice to return after handling a message
    }
});
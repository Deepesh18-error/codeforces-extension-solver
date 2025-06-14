// File: extension/background.js (FINAL ARCHITECTURE - Updated for flexible navigation)

console.log("--- Background Script (HQ) is online. ---");

/**
 * Fetches the AI solution from the backend server and, upon success,
 * stores the solution code in chrome.storage.local for the content script to pick up.
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
      console.log("HQ: Solution received. Storing it for the content script to paste.");
      // Key step: Save the final code to storage. The content script is listening for this.
      chrome.storage.local.set({ solutionToPaste: data.solution });
    } else {
      throw new Error("Server response did not contain a 'solution' key.");
    }
  } catch (error) {
    console.error('HQ: Fetch to backend or storage failed:', error);
    // If anything fails, we still store an error message so the user sees the problem.
    chrome.storage.local.set({ solutionToPaste: `// Error: Failed to get solution.\n// Reason: ${error.message}` });
  }
}

// ==========================================================
//  Main Message Listener (UPDATED to handle conditional navigation)
// ==========================================================
chrome.runtime.onMessage.addListener((message, sender) => {
    // This is the ONLY message type we expect from the problem page.
    if (message.type === 'getSolutionAndPrepareToPaste') {
        
        // 1. Start the AI fetch process. This runs for both workflows.
        console.log("HQ: Received mission. Will fetch solution in the background.");
        getSolutionAndStoreIt(message.data);

        // 2. Conditionally navigate the user's tab.
        // This ONLY runs if the content script provided a URL (i.e., the "Contest" workflow).
        if (message.submitUrl) {
            console.log("HQ: Navigating user's tab to a specific URL provided by content script.");
            chrome.tabs.update(sender.tab.id, { url: message.submitUrl });
        } else {
            // For the "Problemset" workflow, the content script handles the navigation by clicking a link,
            // so the background script does nothing here.
            console.log("HQ: No submitUrl provided. Navigation is being handled by the content script.");
        }
    }
});
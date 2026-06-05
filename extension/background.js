console.log("[Codeforces Solver] Background service worker started.");

const SOLVE_ERROR_KEY = 'solverGenerationError';

const parseErrorResponse = async (response) => {
  try {
    const data = await response.json();
    return data.details || data.error || `Server responded with status: ${response.status}`;
  } catch (_) {
    return `Server responded with status: ${response.status}`;
  }
};

const clearPendingGenerationState = () => {
  chrome.storage.local.remove(['solutionToPaste', SOLVE_ERROR_KEY]);
};

const storeGenerationError = (message) => {
  chrome.storage.local.remove('solutionToPaste', () => {
    chrome.storage.local.set({
      [SOLVE_ERROR_KEY]: {
        message,
        timestamp: Date.now()
      }
    });
  });
};

async function getSolutionAndStoreIt(problemData) {
  const serverUrl = 'http://localhost:3000/api/solve';
  console.log(`[Codeforces Solver] Requesting solution for "${problemData.title}".`);
  clearPendingGenerationState();

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(problemData)
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const data = await response.json();
    console.log("[Codeforces Solver] Solve response received.");
    if (data && typeof data.solution === 'string') {
        console.log(`[Codeforces Solver] Storing solution (${data.solution.length} characters).`);
        chrome.storage.local.set({ 
            solutionToPaste: data.solution,
            debugging_context_lastCode: data.solution 
        }, () => {
            console.log("[Codeforces Solver] Solution stored.");
        });
    } else {
        console.error("[Codeforces Solver] Server response did not include a valid solution string.");
        console.log(`Type: ${typeof data.solution}, Value:`, data.solution);
        throw new Error("Server response did not contain a valid 'solution' string.");
    }

  } catch (error) {
    console.error('[Codeforces Solver] Solve request failed:', error);
    storeGenerationError(`Failed to generate solution. ${error.message}`);
  }
}

async function getDebuggedSolution(debugContext) {
  const serverUrl = 'http://localhost:3000/api/debug'; 
  console.log(`[Codeforces Solver] Requesting corrected solution for "${debugContext.problem?.title ?? 'unknown problem'}".`);
  clearPendingGenerationState();

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debugContext)
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const data = await response.json();

    console.log("[Codeforces Solver] Retry response received.");
    if (data && typeof data.solution === 'string') {
        console.log(`[Codeforces Solver] Storing corrected solution (${data.solution.length} characters).`);
        chrome.storage.local.set({ 
            solutionToPaste: data.solution,
            debugging_context_lastCode: data.solution 
        }, () => {
            console.log("[Codeforces Solver] Corrected solution stored.");
        });
    } else {
        console.error("[Codeforces Solver] Server response did not include a valid corrected solution string.");
        console.log(`Type: ${typeof data.solution}, Value:`, data.solution);
        throw new Error("Server response did not contain a valid 'solution' string.");
    }

  } catch (error) {
    console.error('[Codeforces Solver] Retry request failed:', error);
    storeGenerationError(`Failed to generate corrected solution. ${error.message}`);
  }
}


chrome.runtime.onMessage.addListener((message, sender) => {
    
  
    if (message.type === 'getSolutionAndPrepareToPaste') {
        
        console.log("[Codeforces Solver] Solve request received from content script.");
        getSolutionAndStoreIt(message.data);

        if (message.submitUrl) {
            console.log("[Codeforces Solver] Opening submit page.");
            chrome.tabs.update(sender.tab.id, { url: message.submitUrl });
        } else {
            console.log("[Codeforces Solver] Submit navigation is handled by the current page.");
        }
        return; 
    }


    if (message.type === 'requestDebugSolution') {
        console.log("[Codeforces Solver] Retry request received from content script.");
        getDebuggedSolution(message.data);
        return; 
    }
});

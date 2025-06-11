/**
 * Codeforces AI Solver - Content Script
 *
 * This script is the "Undercover Agent" that operates directly on the
 * Codeforces problem pages. Its mission is as follows:
 *

 *
 * Mission 2: Execute on Command.
 *   - When the button is clicked, it provides user feedback (e.g., "Solving...").
 *   - It then scrapes all necessary data from the page: title, statement, and sample tests.
 *
 * Mission 3: Report to HQ.
 *   - It packages the scraped data into a clean object.
 *   - It sends this data object to the background script (HQ) for processing.
 *
 * Mission 4: Await Orders and Act.
 *   - It listens for a response message from the background script.
 *   - When a solution is received, it finds the submission text area and pastes the code.
 *   - It then resets the button to its original state.
 */


 /* Mission 1: Infiltrate and Observe.
 *   - On page load, it waits for the problem header to appear.
 *   - It then injects the "Solve with AI" button into the page.
*/
( function() {

  const waitForElement = (selector, callback) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        callback(element);
      }
    }, 100); // Check every 100ms
  };

  // The main function to inject our button.
  const injectSolveButton = (targetElement) => {
    // Prevent injecting the button more than once.
    if (document.getElementById('ai-solve-button')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'ai-solve-button';
    button.textContent = 'Solve with AI';

    // Basic styling to make the button stand out.
    Object.assign(button.style, {
      backgroundColor: '#4CAF50', // A nice green
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginLeft: '15px',
      fontSize: '14px',
      fontWeight: 'bold'
    });
    
    // Add hover effect
    button.onmouseover = () => button.style.backgroundColor = '#45a049';
    button.onmouseout = () => button.style.backgroundColor = '#4CAF50';

    // --- Mission 2: Attach listener for the "Execute on Command" step ---
    button.addEventListener('click', handleSolveButtonClick);

    // The new, correct line that puts the button AFTER
    targetElement.insertAdjacentElement('afterend', button);
    
  };

  // Start the injection process by waiting for the problem title header.
  waitForElement('div.header > div.title', injectSolveButton);

})();


// --- Mission 2 & 3: Execute on Command and Report to HQ ---

const handleSolveButtonClick = async (event) => {
  const button = event.target;
  
  // Provide immediate user feedback and prevent multiple clicks.
  button.textContent = 'Analyzing Problem...';
  button.disabled = true;
  button.style.backgroundColor = '#f39c12'; // An orange for "in-progress"

  try {
    const problemData = scrapeProblemData();
    
    if (!problemData) {
        throw new Error("Failed to scrape problem data. Selectors might have changed.");
    }
    
    console.log("--- Scraped Problem Data (Reporting to HQ) ---");
    console.log(problemData);
    // In handleSolveButtonClick, after logging the main object:
    console.log("--- Sample Test Cases ---");
    console.table(problemData.samples); 

    // --- Mission 3: Report to HQ (background.js) ---
    chrome.runtime.sendMessage({
      type: 'solveProblem',
      data: problemData
    });

  } catch (error) {
    console.error("Codeforces AI Solver: Error during scraping.", error);
    button.textContent = 'Error!';
    button.style.backgroundColor = '#e74c3c'; // A red for error
    // Re-enable after a few seconds so the user can try again.
    setTimeout(() => {
        resetButtonState(button);
    }, 3000);
  }
};

const scrapeProblemData = () => {
    try {
        // The new, more specific line
        const header = document.querySelector('div.header > div.title > h2');
        // Example title: "A. Watermelon". We want to remove the "A. " part.
        const title = header.innerText.replace(/^[A-Z1-9]+\.\s*/, '').trim();

        const problemStatementEl = document.querySelector('.problem-statement > div:nth-child(2)');
        const statement = problemStatementEl.innerHTML; // Use innerHTML to keep formatting

        const samples = [];
        const sampleTests = document.querySelectorAll('.sample-test');
        
        sampleTests.forEach(test => {
            const input = test.querySelector('.input pre').innerText;
            const output = test.querySelector('.output pre').innerText;
            samples.push({ input, output });
        });

        if (samples.length === 0) {
            console.warn("Codeforces AI Solver: No sample tests found.");
        }

        return { title, statement, samples };
    } catch (error) {
        console.error("Error finding elements on page:", error);
        return null;
    }
};

// --- Mission 4: Await Orders and Act ---

const pasteSolution = (code) => {
  // Codeforces uses the ACE editor. The actual textarea is often hidden and used by the editor's JS.
  // The most reliable way is often to target the textarea used by ACE.
  const submissionTextarea = document.querySelector('textarea.ace_text-input');
  
  if (submissionTextarea) {
    submissionTextarea.value = code;
    
    // To make sure the ACE editor visually updates, we need to dispatch an input event.
    // This simulates the user typing and makes the editor "aware" of the change.
    const event = new Event('input', { bubbles: true, cancelable: true });
    submissionTextarea.dispatchEvent(event);
    
    console.log("--- Solution Pasted Successfully ---");
  } else {
    console.error("Codeforces AI Solver: Could not find the submission textarea.");
    // As a fallback, we could copy to clipboard, but this is a cleaner failure.
    alert("AI Solver: Could not find the submission box. Please paste the code manually.");
  }
};

const resetButtonState = (button) => {
    if (!button) button = document.getElementById('ai-solve-button');
    if (button) {
        button.textContent = 'Solve with AI';
        button.disabled = false;
        button.style.backgroundColor = '#4CAF50';
    }
}

// Listen for the final response from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'solutionResponse') {
    console.log("--- Orders received from HQ. Pasting solution. ---");
    pasteSolution(message.code);
    resetButtonState(); // Reset the button after the job is done.
  }
});
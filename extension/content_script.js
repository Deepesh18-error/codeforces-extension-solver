
// File: extension/content_script.js (FINAL, with Robust URL Handling)
(() => {
    console.log(`[AI SOLVER] Script INJECTED on ${window.location.href}`);

    // ==========================================================
    //  HELPER FUNCTIONS
    // ==========================================================

    const TRACKING_CLASS = 'cf-highlighter-tracking';
    const ACCEPTED_CLASS = 'cf-highlighter-accepted';
    const REJECTED_CLASS = 'cf-highlighter-rejected';
    const ANALYZING_TEXT_SPAN_CLASS = 'cf-highlighter-status-indicator';
    const COPY_BUTTON_CLASS = 'cf-highlighter-copy-btn';
    // --- (add these with your other constants) ---
    const RETRY_BUTTON_ID = 'ai-debugger-retry-btn';
    const RETRY_BUTTON_CLASS = 'cf-debugger-retry-btn';
    const WRAPPER_CLASS = 'ai-solver-table-wrapper';
    // ADD this helper function
    function getLoggedInUser() {
        const profileLink = document.querySelector('#header .lang-chooser a[href^="/profile/"]');
        return profileLink ? profileLink.textContent.trim() : null;
    }

    const injectPasterScript = () => {
        if (document.getElementById('ai-solver-paster-script')) return;
        const script = document.createElement('script');
        script.id = 'ai-solver-paster-script';
        script.src = chrome.runtime.getURL('injector.js');
        (document.head || document.documentElement).appendChild(script);
        console.log('[AI SOLVER] Paster script has been injected into the page.');
    };

    const waitForElement = (selector, callback, timeout = 15000) => {
        let intervalId = null;
        const failSafe = setTimeout(() => {
            clearInterval(intervalId);
            console.warn(`[AI SOLVER] FAILED: waitForElement timed out after ${timeout / 1000}s for '${selector}'`);
        }, timeout);

        intervalId = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(intervalId);
                clearTimeout(failSafe);
                callback(el);
            }
        }, 100);
    };


    //  LOGIC FOR PROBLEM PAGE

    const scrapeProblemData = () => {
        try {
            const titleEl = document.querySelector(".problem-statement .title") ||
                            document.querySelector(".problem-frames-wrapper .title") ||
                            document.querySelector("div.header > div.title");

            const statementEl = document.querySelector(".problem-statement > div:nth-child(2)");

            if (!titleEl || !statementEl) {
                console.error("[AI SOLVER] Scraper: Missing title or statement.");
                return null;
            }

            const title = titleEl.innerText.replace(/^[A-Z1-9]+\.\s*/, "").trim();
            const statement = statementEl.innerHTML;

            const samples = Array.from(document.querySelectorAll(".sample-test")).map((test) => {
                const inEl = test.querySelector(".input pre");
                const outEl = test.querySelector(".output pre");
                return inEl && outEl ? { input: inEl.innerText, output: outEl.innerText } : null;
            }).filter(Boolean);

            return { title, statement, samples };
        } catch (err) {
            console.error("[AI SOLVER] Error during scraping:", err);
            return null;
        }
    };

    const injectSolveButton = (targetElement) => {
        if (document.getElementById("ai-solve-button")) return;

        const btn = document.createElement("button");
        btn.id = "ai-solve-button";
        btn.textContent = "Solve with AI";
        Object.assign(btn.style, {
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginLeft: "15px",
        });

        btn.addEventListener("click", handleSolveButtonClick);
        targetElement.insertAdjacentElement("afterend", btn);
    };


    //  CLICK HANDLER FOR SOLVE BUTTON

    const handleSolveButtonClick = () => {
        console.log('[AI SOLVER] Solve button clicked.');
        const data = scrapeProblemData();

        if (!data) {
            alert('AI Solver: Failed to scrape problem data.');
            return;
        }

        // --- PHASE 2 ACTION: Store the initial problem context for potential debugging. ---
        chrome.storage.local.set({ debugging_context_problem: data });

        const url = window.location.href;

        // --- Workflow 1: Contest or Gym Problem ---
        if (url.includes('/contest/') || url.includes('/gym/')) {
            const match = url.match(/\/(contest|gym)\/(\d+)\/problem\/([A-Z]\d*)/);
            if (match) {
                const [_, type, contestId, problemIndex] = match;
                const submitUrl = `https://codeforces.com/${type}/${contestId}/submit?submittedProblemIndex=${problemIndex}`;
                console.log(`[AI SOLVER] Contest/Gym workflow detected. Navigating to: ${submitUrl}`);
                chrome.runtime.sendMessage({
                    type: 'getSolutionAndPrepareToPaste',
                    data: data,
                    submitUrl: submitUrl,
                });
                return;
            }
        }

        // --- Workflow 2: Problemset Problem ---
        if (url.includes('/problemset/problem/')) {
            const submitLink = document.querySelector('a[href$="/submit"], a[href^="submit"]');
            if (submitLink) {
                console.log("[AI SOLVER] Problemset workflow detected. Clicking page's submit link.");
                chrome.runtime.sendMessage({ type: 'getSolutionAndPrepareToPaste', data: data });
                submitLink.click();
                return;
            } else {
                alert("AI Solver: Could not find the 'Submit' link on the page for this problemset problem.");
                return;
            }
        }

        // --- Fallback Error ---
        alert('AI Solver: Could not recognize the URL format (not a contest, gym, or problemset page).');
    };

        // NEW FUNCTION for Phase 1
// REPLACED FUNCTION - WITH TASK A IMPLEMENTED

const handleRetryClick = (submissionId, failedData) => {
    console.log(`[AI SOLVER] Retry clicked for submission #${submissionId}.`);
    const retryButton = document.getElementById(RETRY_BUTTON_ID);
    if (retryButton) {
        retryButton.style.display = 'none'; // Hide on click
    }

    console.log('[AI SOLVER] Phase 3, Step 1: Gathering all context...');
    console.log('[AI SOLVER] Gathered: The "Why" (Fresh failure data)', failedData);

    chrome.storage.local.get(['debugging_context_problem', 'debugging_context_lastCode'], (result) => {
        if (!result.debugging_context_problem || !result.debugging_context_lastCode) {
            console.error('[AI SOLVER] ABORT: Could not find required context for debugging.');
            alert('AI Solver Error: Could not find the required context for debugging. Please solve from the problem page again.');
            return;
        }

        console.log('[AI SOLVER] Gathered: The "What" (Original problem data)', result.debugging_context_problem);
        console.log('[AI SOLVER] Gathered: The "How" (Last failed code)', result.debugging_context_lastCode);

        const debugContextPayload = {
            problem: result.debugging_context_problem,
            failedAttempt: {
                code: result.debugging_context_lastCode,
                failureDetails: failedData
            }
        };

        console.log('[AI SOLVER] SUCCESS: Complete debug package assembled.', debugContextPayload);
        
        // --- START OF TASK A IMPLEMENTATION ---
        // Send the complete debug package to the background script with the new mission type.
        console.log('[AI SOLVER] Task A: Sending debug mission to background script...');
        chrome.runtime.sendMessage({ type: 'requestDebugSolution', data: debugContextPayload });
        // --- END OF TASK A IMPLEMENTATION ---


        // --- FUTURE LOGIC (Task B: Navigation) WILL GO HERE ---
        alert('TASK A COMPLETE: Debug request sent to background. Navigation (Task B) is next.');

        window.history.back(); // for coming back to the status page
    });
};
    //  LOGIC FOR SUBMIT AND STATUS PAGES

    const initSubmitPageLogic = () => {
        console.log("[AI SOLVER] Submit page detected. Initializing logic for pasting and submission tracking.");
        injectPasterScript();

        const dispatchPasteEvent = (solution) => {
            if (!solution || typeof solution !== 'string') return;
            console.log('[AI SOLVER] Dispatching event with solution to the injected script.');
            window.dispatchEvent(new CustomEvent('pasteSolutionIntoCodeforcesEditor', {
                detail: { code: solution }
            }));

            console.log('[AI SOLVER] Storing pasted code as the last known attempt for debugging.');
            chrome.storage.local.set({ debugging_context_lastCode: solution });
            
            chrome.storage.local.remove('solutionToPaste');

            waitForElement('input[type="submit"][value="Submit"]', (submitButton) => {
            console.log('[AI SOLVER] Found submit button. Submitting automatically...');
            submitButton.click();
            }, 5000);
        };

        chrome.storage.local.get('solutionToPaste', (result) => {
            if (result && result.solutionToPaste) {
                dispatchPasteEvent(result.solutionToPaste);
            }
        });

        const storageListener = (changes, namespace) => {
            if (namespace === 'local' && changes.solutionToPaste) {
                console.log("[AI SOLVER] Listener detected a solution has arrived.");
                dispatchPasteEvent(changes.solutionToPaste.newValue);
                chrome.storage.onChanged.removeListener(storageListener);
            }
        };

        chrome.storage.onChanged.addListener(storageListener);

        console.log("[AI SOLVER] Setting up submission tracker.");
        waitForElement('input[type="submit"][value="Submit"]', (submitButton) => {
            console.log("[AI SOLVER] Found the final 'Submit' button. Attaching click listener.");
            submitButton.addEventListener('click', () => {
                console.log("[AI SOLVER] 'Submit' button clicked! Setting 'isAwaitingVerdict' flag in storage.");
                chrome.storage.local.set({
                    isAwaitingVerdict: true,
                    submissionTimestamp: Date.now()
                });
            });
        });
    };

    // REPLACE your current initStatusPageLogic with this correct version

// REPLACED FUNCTION
//  START OF THE FINAL CORRECTED FUNCTION


// REPLACED FUNCTION
// REPLACED FUNCTION
const initStatusPageLogic = () => {
    console.log('[AI SOLVER] Status page detected. Waiting for main page content to load...');
    
    waitForElement('div#pageContent', () => {
        console.log('[AI SOLVER] Main page content loaded. Now waiting for the submission table...');

        waitForElement('.status-frame-datatable', (tableElement) => {
            console.log('[AI SOLVER] SUCCESS: Submission table found! Initializing core logic.');

            // --- START OF NEW WRAPPER LOGIC ---
            let wrapper = tableElement.closest(`.${WRAPPER_CLASS}`);
            if (!wrapper) {
                console.log('[AI SOLVER] Wrapping submission table to create positioning context.');
                wrapper = document.createElement('div');
                wrapper.className = WRAPPER_CLASS;
                tableElement.parentNode.insertBefore(wrapper, tableElement);
                wrapper.appendChild(tableElement);
            }

            if (!document.getElementById(RETRY_BUTTON_ID)) {
                const retryButton = document.createElement('button');
                retryButton.id = RETRY_BUTTON_ID;
                retryButton.className = RETRY_BUTTON_CLASS;
                retryButton.textContent = 'Retry with AI';
                wrapper.appendChild(retryButton); // Append to the new wrapper
                console.log('[AI SOLVER] Global "Retry" button created and appended to wrapper.');
            }
            // --- END OF NEW WRAPPER LOGIC ---

            const startMonitoringById = (submissionId) => {
                console.log(`[AI SOLVER] Now monitoring AI submission ID #${submissionId}`);
                initVerdictHighlighter(submissionId, tableElement); 
            };

            chrome.storage.local.get(['isAwaitingVerdict'], (result) => {
                if (result && result.isAwaitingVerdict) {
                    // ... (rest of the function is the same)
                    console.log('[AI SOLVER] "isAwaitingVerdict" flag is true.');
                    chrome.storage.local.remove('isAwaitingVerdict');

                    const firstRow = tableElement.querySelector('tbody tr[data-submission-id]');
                    if (firstRow) {
                        const newSubmissionId = firstRow.getAttribute('data-submission-id');
                        startMonitoringById(newSubmissionId);
                    } else {
                        console.warn('[AI SOLVER] Awaiting verdict, but no submission rows found.');
                    }
                } else {
                    console.log('[AI SOLVER] No pending AI submission. Initializing general highlighter.');
                    initVerdictHighlighter(null, tableElement);
                }
            });
        });
    });
};

//  END OF THE FINAL, BULLETPROOF FUNCTION



    const initVerdictHighlighter = (submissionIdToTrack = null) => {
    // If we passed a specific ID, we use it. Otherwise, targetSubmissionID is null and the old logic runs.
    let targetSubmissionID = submissionIdToTrack; 
    
    // If we are already tracking a specific ID, we can log it and skip the initial detection phase.
    if(targetSubmissionID) {
         console.log(`[AI SOLVER] Highlighter has been given a specific ID to track: #${targetSubmissionID}`);
         // We can immediately apply the tracking style
         const row = document.querySelector(`tr[data-submission-id="${targetSubmissionID}"]`);
         if (row) row.classList.add(TRACKING_CLASS);
    } else {
        console.log('[AI SOLVER] Advanced Verdict Highlighter module initialized (general mode).');
    }

    let mutationTimeout = null;

    // ... onMutation and handleVerdictCheck remain the same ...
    const onMutation = () => {
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(handleVerdictCheck, 100);
    };
    
    const handleVerdictCheck = () => {
        if (targetSubmissionID === null) checkForNewSubmission();
        else monitorTrackedSubmission();
    };
    
  const checkForNewSubmission = () => {
    const topRow = document.querySelector('.datatable tbody tr[data-submission-id]'); // CHANGED: More robust selector
    if (!topRow) return;
    const submissionId = topRow.getAttribute('data-submission-id');
    const verdictCell = topRow.querySelector('.status-verdict-cell');
    if (!submissionId || !verdictCell) return;
    const verdictText = verdictCell.textContent.trim();
    const isLive = verdictText.includes('In queue') || verdictText.includes('Running');
    if (isLive) {
      targetSubmissionID = submissionId;
      topRow.classList.add(TRACKING_CLASS); // Use the new black border style
      console.log(`[CF Highlighter] Phase 1: New submission detected. Now watching ID: ${targetSubmissionID}`);
    }
  };
    
    // REPLACED FUNCTION
const resetState = () => { 
    targetSubmissionID = null; 
    
    // --- ADD THIS LINE ---
    const retryButton = document.getElementById(RETRY_BUTTON_ID);
    if (retryButton) {
        retryButton.style.display = 'none';
    }
};
    
    const monitorTrackedSubmission = () => {
        const trackedRow = document.querySelector(`tr[data-submission-id="${targetSubmissionID}"]`);
        if (!trackedRow) {
            resetState();
            return;
        }

        const verdictCell = trackedRow.querySelector('.status-verdict-cell');
        if (!verdictCell) return;

        const verdictSpan = verdictCell.querySelector('span[waiting]');
        const verdictText = verdictCell.textContent.trim();
        const isFinal = (verdictSpan && verdictSpan.getAttribute('waiting') === 'false') ||
                        (verdictText && !verdictText.includes('Running') && !verdictText.includes('In queue'));

        if (isFinal) {
            console.log(`[AI SOLVER] Highlighter: Final verdict for #${targetSubmissionID}: "${verdictText}"`);
            trackedRow.classList.remove(TRACKING_CLASS);

            if (verdictText.toLowerCase().includes('accepted')) {
                trackedRow.classList.add(ACCEPTED_CLASS);
            } else {
                trackedRow.classList.add(REJECTED_CLASS);

                let isUserSubmission = false;
                

                // <<< FIX #1: This check is now universal for all "My Submissions" pages.

                const onMySubmissionsPage = window.location.href.includes('my=on') || window.location.pathname.endsWith('/my');

                if (onMySubmissionsPage) {
                    console.log("[AI SOLVER] On 'My Submissions' page. Assuming submission belongs to user.");
                    isUserSubmission = true;
                } else {
                    const loggedInUser = getLoggedInUser();
                    

                    // <<< FIX #2: Using the correct selector to find the author's name.

                    const authorElement = trackedRow.querySelector('td.status-party-cell a');
                    
                    const submissionAuthor = authorElement ? authorElement.textContent.trim() : null;
                    
                    console.log(`[AI SOLVER] On general status page. Comparing loggedInUser='${loggedInUser}' with submissionAuthor='${submissionAuthor}'`);
                    if (loggedInUser && submissionAuthor && loggedInUser === submissionAuthor) {
                        isUserSubmission = true;
                    }
                }

                // Now, we check the final boolean result.
                if (isUserSubmission) {
                    console.log(`[AI SOLVER] User ownership confirmed. Proceeding to scrape.`);
                    const isActionable = verdictText.toLowerCase().includes('wrong answer') || verdictText.toLowerCase().includes('time limit exceeded');
                    const match = verdictText.match(/on test (\d+)/);

                    if (isActionable && match) {
                        const failedTestNumber = match[1];
                        const statusSpan = document.createElement('span');
                        statusSpan.className = ANALYZING_TEXT_SPAN_CLASS;
                        statusSpan.textContent = ' (Analyzing...)';
                        verdictCell.appendChild(statusSpan);
                        startPhase2_DataAcquisition(targetSubmissionID, failedTestNumber);
                    }
                } else {
                    console.log(`[AI SOLVER] Scraper not activated. Submission does not belong to logged-in user.`);
                }
            }
            resetState();
        }
    };


    
    const startPhase2_DataAcquisition = async (submissionId, failedTestNumber) => {
        try {
            const csrfToken = document.querySelector('.csrf-token')?.dataset?.csrf;
            if (!csrfToken) throw new Error("CSRF token not found.");
            
            const url = `https://codeforces.com/data/submitSource`;
            const formData = new FormData();
            formData.append('submissionId', submissionId);
            formData.append('csrf_token', csrfToken);
            
            const response = await fetch(url, { method: 'POST', credentials: 'include', body: formData });
            if (!response.ok) throw new Error(`Network response was not ok. Status: ${response.status}`);
            
            const resultJson = await response.json();
            const scrapedData = startPhase3_ExtractFromJson(resultJson, failedTestNumber);
            startPhase4_FinalUIUpdate(submissionId, { success: true, data: scrapedData });
        } catch (error) {
            startPhase4_FinalUIUpdate(submissionId, { success: false, error: error });
        }
    };
    
    const startPhase3_ExtractFromJson = (json, failedTestNumber) => {
        const inputKey = `input#${failedTestNumber}`;
        const outputKey = `output#${failedTestNumber}`;
        const answerKey = `answer#${failedTestNumber}`;
        const checkerLogKey = `checkerStdoutAndStderr#${failedTestNumber}`;
        return {
            input: json[inputKey]?.trim() ?? '[Not Available]',
            output: json[outputKey]?.trim() ?? '[Not Available]',
            answer: json[answerKey]?.trim() ?? '[Not Available]',
            checkerLog: json[checkerLogKey]?.trim() ?? '[Not Available]',
        };
    };
    
    // REPLACED FUNCTION
// REPLACED FUNCTION - WITH CORRECTED POSITIONING LOGIC

// REPLACED FUNCTION - FINAL, CORRECTED VERSION
const startPhase4_FinalUIUpdate = (submissionId, result) => {
    const row = document.querySelector(`tr[data-submission-id="${submissionId}"]`);
    if (!row) return;

    const verdictCell = row.querySelector('.status-verdict-cell');
    if (!verdictCell) return;
    
    const analyzingSpan = verdictCell.querySelector(`.${ANALYZING_TEXT_SPAN_CLASS}`);
    if (analyzingSpan) analyzingSpan.remove();
    
    if (result.success) {
        console.table(result.data); // This is the scraped data we need to pass

        // "Copy Input" button logic (no changes here)...
        const copyButton = document.createElement('button');
        copyButton.className = COPY_BUTTON_CLASS;
        copyButton.textContent = 'Copy Input';
        copyButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(result.data.input).then(() => {
                copyButton.textContent = 'Copied!';
            }).catch(err => {
                console.error('[AI SOLVER] Could not copy text: ', err);
                copyButton.textContent = 'Copy Failed';
            });
        });
        verdictCell.appendChild(copyButton);

        const retryButton = document.getElementById(RETRY_BUTTON_ID);
        const wrapper = row.closest(`.${WRAPPER_CLASS}`);

        if (retryButton && wrapper) {
            // Positioning logic (no changes here)...
            retryButton.style.visibility = 'hidden';
            retryButton.style.display = 'block';
            const buttonWidth = retryButton.offsetWidth;
            const buttonHeight = retryButton.offsetHeight;
            const rowRect = row.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            const topPosition = (rowRect.top - wrapperRect.top) + (rowRect.height / 2) - (buttonHeight / 2);
            const leftMargin = 15;
            const leftPosition = -(buttonWidth + leftMargin);
            retryButton.style.top = `${topPosition}px`;
            retryButton.style.left = `${leftPosition}px`;
            retryButton.style.visibility = 'visible';
            
            // --- THE KEY CHANGE IS HERE ---
            // We pass the scraped data (result.data) directly to the click handler.
            retryButton.onclick = () => handleRetryClick(submissionId, result.data);
        }
    } else {
        console.error('[AI SOLVER] Scrape failed.', result.error);
        const errorSpan = document.createElement('span');
        errorSpan.className = `${ANALYZING_TEXT_SPAN_CLASS} error`;
        errorSpan.textContent = ' (Failed)';
        verdictCell.appendChild(errorSpan);
    }
};


    // <<< FIX #3: A more robust selector for finding the table body.

    const tableBody = document.querySelector('.datatable tbody');
    if (!tableBody) {
        console.error('[AI SOLVER] Could not find the submission table body. Extension will not run.');
        return;
    }
    const observer = new MutationObserver(onMutation);
    const observerConfig = {
        childList: true,
        subtree: true,
        characterData: true
    };
    observer.observe(tableBody, observerConfig);

    handleVerdictCheck();
    console.log('[AI SOLVER] Extension loaded and actively monitoring submissions.');
};

    //  MAIN SCRIPT ROUTER

// --- AFTER THE FIX ---
const main = () => {
    const url = window.location.href;

    if (url.includes('/submit')) {
        initSubmitPageLogic();
    } else if (url.includes('/status') || url.includes('/my')) {
        // Only call initStatusPageLogic. It is now the single point of entry
        // for all status page functionality.
        initStatusPageLogic(); 
    } else if (document.querySelector('.problem-statement')) {
        waitForElement(
            ".problem-statement .title, .problem-frames-wrapper .title, div.header > div.title",
            injectSolveButton
        );
    }
};

    // Kick things off
    main();
})();
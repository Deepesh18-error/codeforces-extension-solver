(() => {
    console.log(`[AI SOLVER] Script INJECTED on ${window.location.href}`);



    const TRACKING_CLASS = 'cf-highlighter-tracking';
    const ACCEPTED_CLASS = 'cf-highlighter-accepted';
    const REJECTED_CLASS = 'cf-highlighter-rejected';
    const ANALYZING_TEXT_SPAN_CLASS = 'cf-highlighter-status-indicator';
    const COPY_BUTTON_CLASS = 'cf-highlighter-copy-btn';
    const RETRY_BUTTON_ID = 'ai-debugger-retry-btn';
    const RETRY_BUTTON_CLASS = 'cf-debugger-retry-btn';
    const WRAPPER_CLASS = 'ai-solver-table-wrapper';
    
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


    const scrapeProblemData = () => {
    try {
        console.log("[AI SOLVER] Starting problem data scrape...");

        const titleEl = document.querySelector(".problem-statement .title") ||
                        document.querySelector(".problem-frames-wrapper .title") ||
                        document.querySelector("div.header > div.title");

        const statementEl = document.querySelector(".problem-statement > div:nth-child(2)");

        if (!titleEl || !statementEl) {
            console.error("[AI SOLVER] Scraper CRITICAL FAIL: Missing title or statement element.");
            return null;
        }

        const title = titleEl.innerText.replace(/^[A-Z1-9]+\.\s*/, "").trim();
        

        const statement = statementEl.innerText;

        console.log(`[AI SOLVER] Scraped Title: "${title}"`);
        console.log(`[AI SOLVER] Scraped Statement Length (Text-Only): ${statement.length}`);


        const samples = Array.from(document.querySelectorAll(".sample-test")).map((test) => {
            const inEl = test.querySelector(".input pre");
            const outEl = test.querySelector(".output pre");
            if (inEl && outEl) {
                return { input: inEl.innerText, output: outEl.innerText };
            }
            return null;
        }).filter(Boolean);

        console.log(`[AI SOLVER] Scraped ${samples.length} sample cases.`);
        
        return { title, statement, samples };
    } catch (err) {
        console.error("[AI SOLVER] An exception occurred during scraping:", err);
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


    const handleSolveButtonClick = () => {
        console.log('[AI SOLVER] Solve button clicked.');
        const data = scrapeProblemData();

        if (!data) {
            alert('AI Solver: Failed to scrape problem data.');
            return;
        }

        chrome.storage.local.set({ debugging_context_problem: data });

        const url = window.location.href;

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
        
        // Send the complete debug package to the background script with the new mission type.
        console.log('[AI SOLVER] Task A: Sending debug mission to background script...');
        chrome.runtime.sendMessage({ type: 'requestDebugSolution', data: debugContextPayload });

        alert('TASK A COMPLETE: Debug request sent to background. Navigation (Task B) is next.');

        window.history.back(); // for coming back to the status page
    });
};
    //  LOGIC FOR SUBMIT AND STATUS PAGES


const initSubmitPageLogic = () => {
    console.log("[AI SOLVER] Submit page detected. Initializing logic with DEEP LOGGING.");
    injectPasterScript();

    const dispatchPasteEvent = (solution) => {
            
            console.log("%c--- CONTENT SCRIPT: Paste Workflow Analysis ---", "color: #e67e22; font-weight: bold;");

            
            console.log("[Step A - Input Check] The dispatchPasteEvent function was called.");
            if (typeof solution === 'string') {
                console.log(`[Step A] The 'solution' variable is a STRING with length ${solution.length}.`);
                console.log("[Step A] Data Sample:", solution.substring(0, 150) + "...");
            } else {
                console.error(`[Step A] FATAL ERROR: The 'solution' variable is NOT a string. Type: ${typeof solution}. Aborting paste.`);
                console.log("%c-------------------------------------------------", "color: #e67e22;");
                return; // Abort if it's not a string
            }

            
            if (!solution) { 
                console.warn("[Step B - Guard Clause Check] Your original check `!solution` is TRUE. This is likely because the solution is an empty string ''. The function will now abort as per your original code.");
                 console.log("%c-------------------------------------------------", "color: #e67e22;");
                return;
            } else {
                 console.log("[Step B - Guard Clause Check] Your original check `!solution` is FALSE. The solution is a non-empty string. Proceeding.");
            }
            
            // the "bridge"
            console.log("[Step C - Bridge Crossing] Attempting to dispatch the CustomEvent to the main page world (for injector.js to catch)...");
            try {
                window.dispatchEvent(new CustomEvent('pasteSolutionIntoCodeforcesEditor', {
                    detail: { code: solution }
                }));
                console.log("[Step C] SUCCESS: The CustomEvent was dispatched from the content script without error.");
            } catch (e) {
                console.error("[Step C] FATAL ERROR: Failed to dispatch the CustomEvent. This is a critical failure in the bridge.", e);
                console.log("%c-------------------------------------------------", "color: #e67e22;");
                return;
            }


        
        console.log('[AI SOLVER] Storing pasted code as the last known attempt for debugging.');
        chrome.storage.local.set({ debugging_context_lastCode: solution });
        chrome.storage.local.remove('solutionToPaste');
        waitForElement('input[type="submit"][value="Submit"]', (submitButton) => {
            console.log('[AI SOLVER] Found submit button. Submitting automatically...');
            submitButton.click();
        }, 5000);
    };

    // Add logging to the retrieval logic
    chrome.storage.local.get('solutionToPaste', (result) => {
        console.log("[AI SOLVER] Initial check of chrome.storage on page load.");
        if (result && typeof result.solutionToPaste === 'string') {
            console.log("Found solution in storage immediately. Calling dispatchPasteEvent.");
            dispatchPasteEvent(result.solutionToPaste);
        } else {
            console.log("No solution found in storage on initial check. Waiting for listener.");
        }
    });

    const storageListener = (changes, namespace) => {
        if (namespace === 'local' && changes.solutionToPaste) {
            console.log("[AI SOLVER] Storage listener fired! A new solution has arrived.");
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

   
const initStatusPageLogic = () => {
    console.log('[AI SOLVER] Status page detected. Waiting for main page content to load...');
    
    waitForElement('div#pageContent', () => {
        console.log('[AI SOLVER] Main page content loaded. Now waiting for the submission table...');

        waitForElement('.status-frame-datatable', (tableElement) => {
            console.log('[AI SOLVER] SUCCESS: Submission table found! Initializing core logic.');

            
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
            

            const startMonitoringById = (submissionId) => {
                console.log(`[AI SOLVER] Now monitoring AI submission ID #${submissionId}`);
                initVerdictHighlighter(submissionId, tableElement); 
            };

            chrome.storage.local.get(['isAwaitingVerdict'], (result) => {
                if (result && result.isAwaitingVerdict) {
                   
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

    
    const onMutation = () => {
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(handleVerdictCheck, 100);
    };
    
    const handleVerdictCheck = () => {
        if (targetSubmissionID === null) checkForNewSubmission();
        else monitorTrackedSubmission();
    };
    
  const checkForNewSubmission = () => {
    const topRow = document.querySelector('.datatable tbody tr[data-submission-id]'); 
    if (!topRow) return;
    const submissionId = topRow.getAttribute('data-submission-id');
    const verdictCell = topRow.querySelector('.status-verdict-cell');
    if (!submissionId || !verdictCell) return;
    const verdictText = verdictCell.textContent.trim();
    const isLive = verdictText.includes('In queue') || verdictText.includes('Running');
    if (isLive) {
      targetSubmissionID = submissionId;
      topRow.classList.add(TRACKING_CLASS); //  new black border style
      console.log(`[CF Highlighter] Phase 1: New submission detected. Now watching ID: ${targetSubmissionID}`);
    }
  };
    
const resetState = () => { 
    targetSubmissionID = null; 
    
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
                

                const onMySubmissionsPage = window.location.href.includes('my=on') || window.location.pathname.endsWith('/my');

                if (onMySubmissionsPage) {
                    console.log("[AI SOLVER] On 'My Submissions' page. Assuming submission belongs to user.");
                    isUserSubmission = true;
                } else {
                    const loggedInUser = getLoggedInUser();

                    const authorElement = trackedRow.querySelector('td.status-party-cell a');
                    
                    const submissionAuthor = authorElement ? authorElement.textContent.trim() : null;
                    
                    console.log(`[AI SOLVER] On general status page. Comparing loggedInUser='${loggedInUser}' with submissionAuthor='${submissionAuthor}'`);
                    if (loggedInUser && submissionAuthor && loggedInUser === submissionAuthor) {
                        isUserSubmission = true;
                    }
                }

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

    // Strategy 1: Check for batch keys first (handles contest-style "Wrong answer" verdicts).
    // These keys directly correspond to what we saw in the debug screenshot.
    if (json.input && json.answer && json.checkerLog) {
        console.log("[AI SOLVER] Scraper: Detected batch test case format.");
        return {
            input: json.input?.trim() ?? '[Not Available]',
            output: json.output?.trim() ?? '[Not Available]',
            answer: json.answer?.trim() ?? '[Not Available]',
            checkerLog: json.checkerLog?.trim() ?? '[Not Available]',
            testNumber: failedTestNumber // Pass the test number for the prompt
        };
    }

    // Strategy 2: Fallback to the original single test case format (for other verdicts like TLE).
    console.log("[AI SOLVER] Scraper: No batch keys found, falling back to single test case format.");
    const inputKey = `input#${failedTestNumber}`;
    const outputKey = `output#${failedTestNumber}`;
    const answerKey = `answer#${failedTestNumber}`;
    const checkerLogKey = `checkerStdoutAndStderr#${failedTestNumber}`;
    
    return {
        input: json[inputKey]?.trim() ?? '[Not Available]',
        output: json[outputKey]?.trim() ?? '[Not Available]',
        answer: json[answerKey]?.trim() ?? '[Not Available]',
        checkerLog: json[checkerLogKey]?.trim() ?? '[Not Available]',
        testNumber: failedTestNumber
    };
};
    
const startPhase4_FinalUIUpdate = (submissionId, result) => {
    const row = document.querySelector(`tr[data-submission-id="${submissionId}"]`);
    if (!row) return;

    const verdictCell = row.querySelector('.status-verdict-cell');
    if (!verdictCell) return;
    
    const analyzingSpan = verdictCell.querySelector(`.${ANALYZING_TEXT_SPAN_CLASS}`);
    if (analyzingSpan) analyzingSpan.remove();
    
    if (result.success) {
        console.table(result.data); // This is the scraped data we need to pass

        // "Copy Input" button logic 
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
            // Positioning logic 
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
const main = () => {
    const url = window.location.href;

    if (url.includes('/submit')) {
        initSubmitPageLogic();
    } else if (url.includes('/status') || url.includes('/my')) {
        // Only call initStatusPageLogic. It is now the single point of entry
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
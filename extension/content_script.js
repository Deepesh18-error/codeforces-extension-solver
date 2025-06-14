// File: extension/content_script.js (FINAL, with Robust URL Handling)
(() => {
    console.log(`[AI SOLVER] Script INJECTED on ${window.location.href}`);

    // ==========================================================
    //  HELPER FUNCTIONS
    // ==========================================================
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

    // ==========================================================
    //  LOGIC FOR PROBLEM PAGE
    // ==========================================================
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

    // ==========================================================
    //  CLICK HANDLER FOR SOLVE BUTTON
    // ==========================================================
    const handleSolveButtonClick = () => {
        console.log('[AI SOLVER] Solve button clicked.');
        const data = scrapeProblemData();

        if (!data) {
            alert('AI Solver: Failed to scrape problem data.');
            return;
        }

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

    // ==========================================================
    //  LOGIC FOR SUBMIT AND STATUS PAGES
    // ==========================================================
    const initSubmitPageLogic = () => {
        console.log("[AI SOLVER] Submit page detected. Initializing logic for pasting and submission tracking.");
        injectPasterScript();

        const dispatchPasteEvent = (solution) => {
            if (!solution || typeof solution !== 'string') return;
            console.log('[AI SOLVER] Dispatching event with solution to the injected script.');
            window.dispatchEvent(new CustomEvent('pasteSolutionIntoCodeforcesEditor', {
                detail: { code: solution }
            }));
            chrome.storage.local.remove('solutionToPaste');
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

    const initStatusPageLogic = () => {
        console.log('[AI SOLVER] Status page detected. Checking for pending submission.');
        chrome.storage.local.get('isAwaitingVerdict', (result) => {
            if (result && result.isAwaitingVerdict) {
                console.log('[AI SOLVER] "isAwaitingVerdict" flag is true. Searching for the new submission...');
                waitForElement('.datatable', (table) => {
                    const firstRow = table.querySelector('tr[data-submission-id]');
                    if (firstRow) {
                        const submissionId = firstRow.getAttribute('data-submission-id');
                        console.log(`[AI SOLVER] Found submission row. Submission ID: ${submissionId}`);
                        chrome.storage.local.set({
                            lastSubmissionId: submissionId,
                            isAwaitingVerdict: false,
                        }, () => {
                            console.log('[AI SOLVER] Stored submission ID and reset flag.');
                        });
                    } else {
                        console.error('[AI SOLVER] FAILED: No submission row found.');
                        chrome.storage.local.set({ isAwaitingVerdict: false });
                    }
                });
            } else {
                console.log('[AI SOLVER] "isAwaitingVerdict" flag is false or not set.');
            }
        });
    };

    // ==========================================================
    //  MAIN SCRIPT ROUTER
    // ==========================================================
    const main = () => {
        const url = window.location.href;

        if (url.includes('/submit')) {
            initSubmitPageLogic();
        } else if (url.includes('/status') || url.includes('/my')) {
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


console.log('[INJECTED SCRIPT] Hello from the main page world! Listening for paste event.');

window.addEventListener('pasteSolutionIntoCodeforcesEditor', (event) => {

    console.log("%c--- INJECTED SCRIPT: EVENT RECEIVED ---", "color: #007bff; font-weight: bold;");
    console.log("[Step 7] 'pasteSolutionIntoCodeforcesEditor' event was caught!");

    if (!event || !event.detail) {
        console.error("[Step 8] FATAL: Event has no 'detail' object. Payload was likely dropped. Aborting.");
        console.log("%c------------------------------------------", "color: #007bff;");
        return;
    }
    console.log("[Step 8] Event has a 'detail' object:", event.detail);

    const codeToPaste = event.detail.code;

    if (typeof codeToPaste !== 'string') {
        console.error("[Step 9] FATAL: event.detail.code is not a string. Aborting.", `Type: ${typeof codeToPaste}`);
        console.log("%c------------------------------------------", "color: #007bff;");
        return;
    }
    console.log(`[Step 9] event.detail.code is a valid string. Length: ${codeToPaste.length}.`);
    
    console.log("[Step 10] Attempting to paste into ACE editor...");
    try {
        const editor = window.ace.edit('editor');
        if (editor) {
            editor.setValue(codeToPaste, 1);
            editor.clearSelection();
            console.log('[Step 11] SUCCESS: Pasted code via ACE API.');
        } else {
             console.error('[Step 11] FAILED: Could not get ACE editor instance.');
        }
    } catch (e) {
        console.error('[Step 11] FAILED: Error while calling ACE API:', e);
    }
    console.log("%c------------------------------------------", "color: #007bff;");
});
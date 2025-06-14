// File: extension/injector.js
// This script runs in the page's own context, not the isolated content script world.
// It has direct access to the page's 'window' object, including the 'ace' editor.

window.addEventListener('pasteSolutionIntoCodeforcesEditor', (event) => {
    const codeToPaste = event.detail.code;
    if (!codeToPaste) return;

    try {
        // This is the command that MUST run in the page's context.
        const editor = window.ace.edit('editor');
        if (editor) {
            editor.setValue(codeToPaste, 1); // 1 moves cursor to end
            editor.clearSelection();
            console.log('[INJECTED SCRIPT] Successfully pasted code via ACE API.');
        } else {
             console.error('[INJECTED SCRIPT] Could not get ACE editor instance.');
        }
    } catch (e) {
        console.error('[INJECTED SCRIPT] Error while pasting:', e);
    }
});
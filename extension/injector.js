
console.log('[Codeforces Solver] Editor bridge ready.');

window.addEventListener('pasteSolutionIntoCodeforcesEditor', (event) => {
    console.log('[Codeforces Solver] Paste event received.');

    if (!event || !event.detail) {
        console.error('[Codeforces Solver] Paste event did not include a payload.');
        return;
    }

    const codeToPaste = event.detail.code;

    if (typeof codeToPaste !== 'string') {
        console.error('[Codeforces Solver] Paste payload is not a string.', `Type: ${typeof codeToPaste}`);
        return;
    }
    console.log(`[Codeforces Solver] Pasting ${codeToPaste.length} characters into Ace editor.`);
    
    try {
        const editor = window.ace.edit('editor');
        if (editor) {
            editor.setValue(codeToPaste, 1);
            editor.clearSelection();
            console.log('[Codeforces Solver] Editor updated.');
        } else {
             console.error('[Codeforces Solver] Ace editor instance was not found.');
        }
    } catch (e) {
        console.error('[Codeforces Solver] Ace editor update failed:', e);
    }
});

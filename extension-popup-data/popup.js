document.addEventListener('DOMContentLoaded', function() {

    const noteInput = document.getElementById('note-input');
    const addNoteButton = document.getElementById('add-note');
    const notesList = document.getElementById('notes-list');

    // Load user email and notes from storage
    chrome.storage.local.get(['userEmail', 'notes'], function(result) {
        if (result.userEmail) {
            userEmailDiv.textContent = `Logged in as: ${result.userEmail}`;
        } else {
            userEmailDiv.textContent = 'User is not logged in.';
        }

        if (result.notes) {
            result.notes.forEach(note => {
                addNoteToList(note);
            });
        }
    });

    // Add note to storage and display
    addNoteButton.addEventListener('click', function() {
        const noteText = noteInput.innerText.trim();
        if (noteText) {
            chrome.storage.local.get('notes', function(result) {
                const notes = result.notes || [];
                notes.push(noteText);
                chrome.storage.local.set({ notes: notes }, function() {
                    addNoteToList(noteText);
                    noteInput.innerText = ''; // Clear input
                });
            });
        }
    });

    function addNoteToList(noteText) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note';
        noteDiv.textContent = noteText;
        notesList.appendChild(noteDiv);
    }
});

//chrome.storage.local.get('notes')
//Returns Promise {<pending>}[[Prototype]]: Promise[[PromiseState]]: "fulfilled"[[PromiseResult]]: Objectnotes: Array(3)0: "this is note"1: "this in note2"2: "note3"length: 3[[Prototype]]: Array(0)[[Prototype]]: Object
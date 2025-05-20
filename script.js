let currentCardIndex = 0;
let cards = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all flashcards with click handlers
    document.querySelectorAll('.flashcard').forEach(card => {
        card.addEventListener('click', handleCardFlip);
    });

    // Add event listeners for Enter key in textareas
    document.getElementById('question').addEventListener('keydown', handleEnter);
    document.getElementById('answer').addEventListener('keydown', handleEnter);

    // Updated button handlers
    document.getElementById('addMoreBtn').addEventListener('click', createCard);
    document.getElementById('doneBtn').addEventListener('click', showExportOptions);
});

function handleCardFlip(e) {
    // Only flip if clicking on the card itself, not its children
    if (e.target.closest('.flashcard')) {
        const card = e.currentTarget;
        card.classList.toggle('flipped');
    }
}

function createCard() {
    const newCard = {
        question: document.getElementById('question').value,
        answer: document.getElementById('answer').value,
        frontImage: document.getElementById('frontImagePreview').src,
        backImage: document.getElementById('backImagePreview').src
    };
    
    cards.push(newCard);
    resetForm();
    updateCardsList();
}

function showExportOptions() {
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    modal.innerHTML = `
        <div class="export-content">
            <h3>Export Flashcards</h3>
            <button onclick="exportAsPDF()">Download PDF</button>
            <button onclick="exportAsJSON()">Export as Code</button>
            <button onclick="this.parentElement.parentElement.remove()">Cancel</button>
            <div class="import-section">
                <input type="file" id="importFile" accept=".json" hidden>
                <button onclick="document.getElementById('importFile').click()">
                    Upload Existing Cards
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('importFile').addEventListener('change', handleFileImport);
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            cards = JSON.parse(event.target.result);
            updateCardsList();
            enterRevisionMode();
        };
        reader.readAsText(file);
    }
}

function exportAsJSON() {
    const dataStr = JSON.stringify(cards);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Remaining functions with proper card flipping implementation
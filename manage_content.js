document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available: setLoading, displayMessage, etc.

    // --- Page-Specific DOM Elements ---
    const searchManageBtn = document.getElementById('searchManageBtn');
    const manageSearchResults = document.getElementById('manageSearchResults');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const manageMessage = document.getElementById('manageMessage');
    
    let selectedMoviesForDeletion = new Set();

    // The 'adminReady' event is dispatched from core.js after the user is verified.
    document.addEventListener('adminReady', () => {
        // --- Search Logic ---
        if (searchManageBtn) {
            searchManageBtn.addEventListener('click', async () => {
                setLoading(searchManageBtn, true);
                manageSearchResults.innerHTML = '';
                selectedMoviesForDeletion.clear();
                confirmDeleteBtn.style.display = 'none';
                
                const term = document.getElementById('manageContentIdentifier').value.trim();
                if (!term) {
                    displayMessage(manageMessage, 'Enter a name or ID to search.', 'error');
                    setLoading(searchManageBtn, false);
                    return;
                }

                try {
                    // UPDATED: Query the 'movies' collection
                    const lowerCaseTerm = term.toLowerCase();
                    const querySnapshot = await db.collection('movies')
                        .where('search_keywords', 'array-contains', lowerCaseTerm)
                        .limit(20)
                        .get();

                    let docs = [];
                    querySnapshot.forEach(doc => {
                        docs.push({ id: doc.id, ...doc.data() });
                    });

                    // UPDATED: Query the 'movies' collection for ID search
                    if (/^\d+$/.test(term)) {
                        const idQuery = await db.collection('movies').where('tmdbId', '==', Number(term)).get();
                        idQuery.forEach(doc => {
                            if (!docs.some(d => d.id === doc.id)) {
                                 docs.push({ id: doc.id, ...doc.data() });
                            }
                        });
                    }

                    if (docs.length === 0) {
                        displayMessage(manageMessage, 'No content found.', 'info');
                    } else {
                        docs.forEach(item => {
                            manageSearchResults.innerHTML += `
                                <div class="result-item">
                                    <span><strong>${item.title}</strong> (ID: ${item.tmdbId || item.slug || 'N/A'}) - VJ: ${item.vjName}</span>
                                    <div class="result-item-actions">
                                        <button class="action-btn edit" data-id="${item.id}">Edit</button>
                                        <button class="action-btn select-delete" data-id="${item.id}">Select</button>
                                    </div>
                                </div>`;
                        });
                        displayMessage(manageMessage, `Found ${docs.length} item(s).`, 'success');
                    }
                } catch (err) {
                    displayMessage(manageMessage, `Error searching: ${err.message}`, 'error');
                } finally {
                    setLoading(searchManageBtn, false);
                }
            });
        }
    });

    // --- Event Delegation for Results ---
    if (manageSearchResults) {
        manageSearchResults.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.matches('.select-delete')) {
                const id = target.dataset.id;
                if (selectedMoviesForDeletion.has(id)) {
                    selectedMoviesForDeletion.delete(id);
                    target.classList.remove('selected');
                    target.textContent = 'Select';
                } else {
                    selectedMoviesForDeletion.add(id);
                    target.classList.add('selected');
                    target.textContent = 'Selected';
                }
                
                if (confirmDeleteBtn) {
                    confirmDeleteBtn.style.display = selectedMoviesForDeletion.size > 0 ? 'block' : 'none';
                    confirmDeleteBtn.textContent = `Delete Selected (${selectedMoviesForDeletion.size})`;
                }
            }

            if (target.matches('.action-btn.edit')) {
                const docId = target.dataset.id;
                window.location.href = `edit_content.html?id=${docId}`;
            }
        });
    }
    
    // --- Deletion Logic ---
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (confirm(`Are you sure you want to permanently delete ${selectedMoviesForDeletion.size} item(s)?`)) {
                setLoading(confirmDeleteBtn, true);
                
                const batch = db.batch();
                selectedMoviesForDeletion.forEach(id => {
                    // UPDATED: Delete from the 'movies' collection
                    const docRef = db.collection('movies').doc(id);
                    batch.delete(docRef);
                });

                try {
                    await batch.commit();
                    displayMessage(manageMessage, `Deleted ${selectedMoviesForDeletion.size} items. Please search again to see the changes.`, 'success');
                    manageSearchResults.innerHTML = '';
                    confirmDeleteBtn.style.display = 'none';
                    selectedMoviesForDeletion.clear();
                } catch (err) {
                    displayMessage(manageMessage, `Error deleting: ${err.message}`, 'error');
                } finally {
                    setLoading(confirmDeleteBtn, false);
                }
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available.

    // --- Page-Specific DOM Elements ---
    const allContentContainer = document.getElementById('allContentContainer');
    const allContentFilter = document.getElementById('allContentFilter');
    const allContentMessage = document.getElementById('allContentMessage');
    const deleteSelectedBtn = document.getElementById('deleteSelectedAllContentBtn');
    const selectedCountSpan = document.getElementById('selectedAllContentCount');

    let selectedForDeletion = new Set();

    // This event listener ensures the code below only runs AFTER core.js has verified the admin.
    document.addEventListener('adminReady', () => {
        
        // --- Main Function to Display Content ---
        async function displayAllContent() {
            allContentContainer.innerHTML = '<div class="message info" style="display:block;">Loading content...</div>';
            selectedForDeletion.clear();
            updateDeleteSelectedButton();

            const filterValue = allContentFilter.value;
            try {
                // CORRECT: Queries the 'movies' collection
                let query = db.collection('movies').orderBy('createdAt', 'desc');
                
                let actualFilterValue = (filterValue === 'latest_uploads') ? 'popular' : filterValue;

                if (filterValue !== 'all') {
                    query = query.where('type', 'array-contains', actualFilterValue);
                }
                
                const snapshot = await query.limit(100).get();

                if (snapshot.empty) {
                    allContentContainer.innerHTML = '';
                    displayMessage(allContentMessage, 'No content found for this filter.', 'info');
                    return;
                }

                allContentContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    const item = { id: doc.id, ...doc.data() };
                    const isPermanentDeleteView = (filterValue === 'all');
                    
                    const cardHtml = `
                        <div class="content-card">
                            <input type="checkbox" class="select-card-checkbox" data-id="${item.id}">
                            <img src="${item.posterUrl || 'https://placehold.co/500x750/333/eee?text=No+Poster'}" alt="${item.title}" loading="lazy">
                            <div class="content-card-content">
                                <h3>${item.title}</h3>
                                <p class="vj-name">VJ: ${item.vjName}</p>
                                <div class="content-card-actions">
                                    <button class="action-btn edit" data-id="${item.id}">Edit</button>
                                    <button class="action-btn ${isPermanentDeleteView ? 'delete' : 'remove-from-category'}" data-id="${item.id}">
                                        ${isPermanentDeleteView ? 'Delete' : 'Remove'}
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    allContentContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
                displayMessage(allContentMessage, `Showing ${snapshot.size} item(s).`, 'success');

            } catch (err) {
                allContentContainer.innerHTML = '';
                displayMessage(allContentMessage, `Error fetching content: ${err.message}`, 'error');
            }
        }

        // --- Helper Function to Update Delete Button ---
        function updateDeleteSelectedButton() {
            if (!selectedCountSpan || !deleteSelectedBtn) return;
            selectedCountSpan.textContent = selectedForDeletion.size;
            deleteSelectedBtn.style.display = selectedForDeletion.size > 0 ? 'block' : 'none';
            
            const filterText = allContentFilter.options[allContentFilter.selectedIndex].text;
            if (allContentFilter.value === 'all') {
                deleteSelectedBtn.firstChild.textContent = `Permanently Delete Selected (${selectedForDeletion.size}) `;
            } else {
                deleteSelectedBtn.firstChild.textContent = `Remove Selected from ${filterText} (${selectedForDeletion.size}) `;
            }
        }

        // --- Event Listeners ---
        allContentFilter.addEventListener('change', displayAllContent);

        allContentContainer.addEventListener('click', async (e) => {
            const target = e.target;
            const card = target.closest('.content-card');
            if (!card) return;

            const docId = target.dataset.id || card.querySelector('.select-card-checkbox')?.dataset.id;
            if (!docId) return;

            if (target.matches('.select-card-checkbox')) {
                if (target.checked) {
                    selectedForDeletion.add(docId);
                } else {
                    selectedForDeletion.delete(docId);
                }
                updateDeleteSelectedButton();
                return;
            }

            if (target.matches('.action-btn.edit')) {
                window.location.href = `edit_content.html?id=${docId}`;
                return;
            }
            
            if (target.matches('.action-btn.delete')) {
                if (confirm(`Are you sure you want to PERMANENTLY delete this content?`)) {
                    setLoading(target, true);
                    try {
                        // CORRECT: Deletes from the 'movies' collection
                        await db.collection('movies').doc(docId).delete();
                        card.remove();
                        displayMessage(allContentMessage, 'Content deleted!', 'success');
                    } catch (err) { displayMessage(allContentMessage, `Error: ${err.message}`, 'error'); } 
                    finally { setLoading(target, false); }
                }
                return;
            }

            if (target.matches('.action-btn.remove-from-category')) {
                const categoryToRemove = allContentFilter.value;
                const categoryText = allContentFilter.options[allContentFilter.selectedIndex].text;
                if (confirm(`Remove this item from the "${categoryText}" category?`)) {
                    setLoading(target, true);
                    try {
                        // CORRECT: Updates the 'movies' collection
                        const docRef = db.collection('movies').doc(docId);
                         await docRef.update({
                             type: firebase.firestore.FieldValue.arrayRemove(categoryToRemove),
                         });
                        card.remove();
                        displayMessage(allContentMessage, 'Removed from category!', 'success');
                    } catch (err) { displayMessage(allContentMessage, `Error: ${err.message}`, 'error'); } 
                    finally { setLoading(target, false); }
                }
            }
        });

        deleteSelectedBtn.addEventListener('click', async () => {
            if (selectedForDeletion.size === 0) return;
            
            const isPermanentDelete = allContentFilter.value === 'all';
            const actionText = isPermanentDelete ? 'permanently delete' : 'remove from the category';
            
            if (confirm(`Are you sure you want to ${actionText} ${selectedForDeletion.size} item(s)?`)) {
                setLoading(deleteSelectedBtn, true);
                const batch = db.batch();
                try {
                    if (isPermanentDelete) {
                        selectedForDeletion.forEach(id => {
                            // CORRECT: Deletes from the 'movies' collection
                            batch.delete(db.collection('movies').doc(id));
                        });
                    } else {
                        const categoryToRemove = allContentFilter.value;
                        selectedForDeletion.forEach(id => {
                            // CORRECT: Updates the 'movies' collection
                            const docRef = db.collection('movies').doc(id);
                            batch.update(docRef, { type: firebase.firestore.FieldValue.arrayRemove(categoryToRemove) });
                        });
                    }
                    await batch.commit();
                    displayMessage(allContentMessage, 'Bulk action completed successfully!', 'success');
                    displayAllContent();
                } catch (err) {
                     displayMessage(allContentMessage, `Error during bulk action: ${err.message}`, 'error');
                } finally {
                    setLoading(deleteSelectedBtn, false);
                }
            }
        });

        // --- Initial Load ---
        displayAllContent();
    });
});
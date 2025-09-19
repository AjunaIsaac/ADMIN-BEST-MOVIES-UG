document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available.

    // --- Page-Specific DOM Elements ---
    const allContentContainer = document.getElementById('allContentContainer');
    const allContentFilter = document.getElementById('allContentFilter');
    const allContentMessage = document.getElementById('allContentMessage');
    const deleteSelectedBtn = document.getElementById('deleteSelectedAllContentBtn');
    const selectedCountSpan = document.getElementById('selectedAllContentCount');

    let selectedForDeletion = new Set();

    // --- Main Function to Display Content ---
    async function displayAllContent() {
        allContentContainer.innerHTML = '<div class="message info" style="display:block;">Loading content...</div>';
        selectedForDeletion.clear();
        updateDeleteSelectedButton();

        const filterValue = allContentFilter.value;
        try {
            let query = db.collection('movies').orderBy('createdAt', 'desc');
            
            // Map the display value to the actual value in Firestore if needed
            let actualFilterValue = (filterValue === 'latest_uploads') ? 'popular' : filterValue;

            if (filterValue !== 'all') {
                query = query.where('type', 'array-contains', actualFilterValue);
            }
            
            const snapshot = await query.limit(100).get(); // Limit to 100 to prevent performance issues

            if (snapshot.empty) {
                allContentContainer.innerHTML = '';
                displayMessage(allContentMessage, 'No content found for this filter.', 'info');
                return;
            }

            allContentContainer.innerHTML = ''; // Clear loading message
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

        // Handle Checkbox Click
        if (target.matches('.select-card-checkbox')) {
            if (target.checked) {
                selectedForDeletion.add(docId);
            } else {
                selectedForDeletion.delete(docId);
            }
            updateDeleteSelectedButton();
            return;
        }

        // Handle Edit Button
        if (target.matches('.action-btn.edit')) {
            window.location.href = `edit_content.html?id=${docId}`;
            return;
        }
        
        // Handle Permanent Delete Button
        if (target.matches('.action-btn.delete')) {
            if (confirm(`Are you sure you want to PERMANENTLY delete this content?`)) {
                setLoading(target, true);
                try {
                    await db.collection('movies').doc(docId).delete();
                    card.remove(); // Remove from UI instantly
                    displayMessage(allContentMessage, 'Content deleted!', 'success');
                } catch (err) { displayMessage(allContentMessage, `Error: ${err.message}`, 'error'); } 
                finally { setLoading(target, false); }
            }
            return;
        }

        // Handle Remove from Category Button
        if (target.matches('.action-btn.remove-from-category')) {
            const categoryToRemove = allContentFilter.value;
            const categoryText = allContentFilter.options[allContentFilter.selectedIndex].text;
            if (confirm(`Remove this item from the "${categoryText}" category?`)) {
                setLoading(target, true);
                try {
                    const docRef = db.collection('movies').doc(docId);
                    await db.runTransaction(async (transaction) => {
                        const doc = await transaction.get(docRef);
                        if (!doc.exists) throw "Document does not exist!";
                        const currentTypes = doc.data().type || [];
                        const updatedTypes = currentTypes.filter(type => type !== categoryToRemove && type !== (categoryToRemove === 'latest_uploads' ? 'popular' : ''));
                        transaction.update(docRef, { type: updatedTypes });
                    });
                    card.remove(); // Remove from UI instantly
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
                        batch.delete(db.collection('movies').doc(id));
                    });
                } else {
                    // For removing from category, we need to read then write, so batching isn't straightforward.
                    // We'll do them as individual promises. This is slightly less efficient but safer.
                    const updatePromises = [];
                    const categoryToRemove = allContentFilter.value;
                    selectedForDeletion.forEach(id => {
                         const docRef = db.collection('movies').doc(id);
                         updatePromises.push(docRef.update({
                             type: firebase.firestore.FieldValue.arrayRemove(categoryToRemove),
                         }));
                    });
                    await Promise.all(updatePromises);
                }
                
                if (isPermanentDelete) await batch.commit();

                displayMessage(allContentMessage, 'Bulk action completed successfully!', 'success');
                displayAllContent(); // Refresh the whole view
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
document.addEventListener('DOMContentLoaded', async () => {
    // Functions and variables from utils.js are available.

    // --- Page-Specific DOM Elements ---
    const editContentForm = document.getElementById('editContentForm');
    const updateContentBtn = document.getElementById('updateContentBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editMessage = document.getElementById('editMessage');
    const pageTitle = document.getElementById('pageTitle');

    // --- Get Document ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (!docId) {
        pageTitle.textContent = 'Error';
        editContentForm.innerHTML = '<p class="message error" style="display:block;">No content ID provided. Please go back and select an item to edit.</p>';
        return;
    }

    // --- Content Type Toggling ---
    function setupMasterContentTypeToggle(formElement) {
        const primarySelector = formElement.querySelector('.primary-content-type-selector');
        const videoUrlGroup = formElement.querySelector('.video-url-group');
        const seriesDataGroup = formElement.querySelector('.series-data-group');
        function toggleFields() {
            const isTV = primarySelector.value === 'tv';
            videoUrlGroup.style.display = isTV ? 'none' : 'block';
            seriesDataGroup.style.display = isTV ? 'block' : 'none';
        }
        primarySelector.addEventListener('change', toggleFields);
        toggleFields();
    }
    
    // --- Load and Populate Form ---
    try {
        const docRef = db.collection('StreamZone_v208_77').doc(docId);
        const docSnap = await docRef.get();

        if (!docSnap.exists()) {
            throw new Error("Content document not found.");
        }

        const data = docSnap.data();

        // Populate simple text fields
        document.getElementById('editDocId').value = docId;
        document.getElementById('editTitle').value = data.title || '';
        document.getElementById('editOverview').value = data.overview || '';
        document.getElementById('editPosterUrl').value = data.posterUrl || '';
        document.getElementById('editBackdropUrl').value = data.backdropUrl || '';
        document.getElementById('editVjName').value = data.vjName || '';
        document.getElementById('editReferenceId').value = data.tmdbId || data.slug || '';
        
        // Populate content type and trigger toggle
        const primaryTypeSelector = document.getElementById('editPrimaryContentType');
        primaryTypeSelector.value = data.contentType || 'movie';
        setupMasterContentTypeToggle(editContentForm); // Call this now
        primaryTypeSelector.dispatchEvent(new Event('change')); // Trigger change to show/hide fields

        // Populate checkboxes
        populateCheckboxes('editContentTypeCheckboxes', 'editContentType', Array.from(document.querySelectorAll('#editContentTypeCheckboxes input')).map(cb => cb.value), data.type);
        populateCheckboxes('editGenreCheckboxes', 'editGenre', GENRE_LIST, data.genres);
        populateCheckboxes('sortVjsCheckboxesEdit', 'sortVjsEdit', VJ_LIST, data.sort_vjs);
        populateCheckboxes('sortGenresCheckboxesEdit', 'sortGenresEdit', GENRE_LIST, data.sort_genres);

        // Populate Movie/TV specific fields
        if (data.contentType === 'tv') {
            const episodesSnapshot = await docRef.collection('episodes').orderBy('season_number').orderBy('episode_number').get();
            const seasons = {};
            episodesSnapshot.forEach(epDoc => {
                const epData = epDoc.data();
                if (!seasons[epData.season_number]) {
                    seasons[epData.season_number] = { season_number: epData.season_number, episodes: [] };
                }
                seasons[epData.season_number].episodes.push({
                    episode_number: epData.episode_number,
                    title: epData.title,
                    videoUrl: epData.videoUrl,
                    overview: epData.overview,
                });
            });
            document.getElementById('editSeriesData').value = JSON.stringify(Object.values(seasons), null, 2);
        } else {
            document.getElementById('editVideoSourceUrl').value = data.videoUrl || '';
        }

    } catch (error) {
        displayMessage(editMessage, `Error loading content: ${error.message}`, 'error');
        editContentForm.style.display = 'none';
    }

    // --- Form Submission (Update) Logic ---
    editContentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(updateContentBtn, true);

        const currentId = document.getElementById('editDocId').value;
        const editTitle = document.getElementById('editTitle').value.trim();
        const referenceIdInput = document.getElementById('editReferenceId').value.trim();

        let payload = {
            title: editTitle,
            title_lowercase: editTitle.toLowerCase(),
            search_keywords: generateSearchKeywords(editTitle, document.getElementById('editVjName').value.trim()),
            slug: generateSlug(referenceIdInput && !/^\d+$/.test(referenceIdInput) ? referenceIdInput : editTitle),
            tmdbId: /^\d+$/.test(referenceIdInput) ? Number(referenceIdInput) : null,
            overview: document.getElementById('editOverview').value.trim(),
            posterUrl: document.getElementById('editPosterUrl').value.trim(),
            backdropUrl: document.getElementById('editBackdropUrl').value.trim(),
            vjName: document.getElementById('editVjName').value.trim(),
            type: Array.from(document.querySelectorAll('#editContentTypeCheckboxes input:checked')).map(cb => cb.value),
            genres: Array.from(document.querySelectorAll('#editGenreCheckboxes input:checked')).map(cb => cb.value),
            sort_vjs: Array.from(document.querySelectorAll('#sortVjsCheckboxesEdit input:checked')).map(cb => cb.value),
            sort_genres: Array.from(document.querySelectorAll('#sortGenresCheckboxesEdit input:checked')).map(cb => cb.value),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            const duplicateCheck = await checkForDuplicates(payload, currentId);
            if (duplicateCheck.found) {
                throw new Error(`Duplicate found: ${duplicateCheck.field}. Please use a different TMDB ID or Unique Text ID.`);
            }

            const primaryType = document.getElementById('editPrimaryContentType').value;
            const docRef = db.collection('StreamZone_v208_77').doc(currentId);
            
            if (primaryType === 'tv') {
                payload.contentType = 'tv';
                const seriesDataValue = document.getElementById('editSeriesData').value;
                const seriesInfo = JSON.parse(seriesDataValue);

                // Use a batch write to update the main doc and replace episodes
                const batch = db.batch();
                batch.update(docRef, payload);

                // Delete old episodes
                const oldEpisodes = await docRef.collection('episodes').get();
                oldEpisodes.forEach(doc => batch.delete(doc.ref));
                
                // Add new episodes
                for (const season of seriesInfo) {
                    for (const episode of season.episodes) {
                        const newEpisodeRef = docRef.collection('episodes').doc();
                        batch.set(newEpisodeRef, {
                            season_number: season.season_number, ...episode,
                            addedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                await batch.commit();

            } else { // Movie
                payload.contentType = 'movie';
                payload.videoUrl = document.getElementById('editVideoSourceUrl').value;
                await docRef.update(payload);
            }
            
            displayMessage(editMessage, 'Content updated successfully!', 'success');
            setTimeout(() => { window.location.href = 'all_content.html'; }, 2000);

        } catch (err) {
            displayMessage(editMessage, `Update failed: ${err.message}`, 'error');
        } finally {
            setLoading(updateContentBtn, false);
        }
    });

    // --- Cancel Button ---
    cancelEditBtn.addEventListener('click', () => {
        // Go back to the previous page in history
        window.history.back();
    });
});
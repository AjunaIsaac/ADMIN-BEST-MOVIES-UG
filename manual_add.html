document.addEventListener('DOMContentLoaded', () => {
    // Functions and variables from utils.js are available.
    const manualAddForm = document.getElementById('manualAddForm');
    const manualAddBtn = document.getElementById('manualAddContentBtn');
    const manualAddMessage = document.getElementById('manualAddMessage');

    // --- Content Type Toggling ---
    function setupMasterContentTypeToggle(formElement) {
        if (!formElement) return;
        const primarySelector = formElement.querySelector('.primary-content-type-selector');
        const videoUrlGroup = formElement.querySelector('.video-url-group');
        const seriesDataGroup = formElement.querySelector('.series-data-group');
        
        function toggleFields() {
            if (!primarySelector) return;
            const isTV = primarySelector.value === 'tv';
            if (videoUrlGroup) videoUrlGroup.style.display = isTV ? 'none' : 'block';
            if (seriesDataGroup) seriesDataGroup.style.display = isTV ? 'block' : 'none';
        }
        if (primarySelector) {
            primarySelector.addEventListener('change', toggleFields);
            toggleFields(); // Run on initial load
        }
    }

    // This event listener ensures the code below only runs AFTER core.js has verified the admin.
    document.addEventListener('adminReady', () => {
        // --- Initialize Page ---
        setupMasterContentTypeToggle(manualAddForm);
        // Use window object to access global lists from utils.js
        populateCheckboxes('sortVjsCheckboxesManual', 'sortVjsManual', window.VJ_LIST);
        populateCheckboxes('sortGenresCheckboxesManual', 'sortGenresManual', window.GENRE_LIST);
        
        // --- Form Submission Logic ---
        if(manualAddForm) {
            manualAddForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                setLoading(manualAddBtn, true);

                const sendNotificationChecked = document.querySelector('#manualContentTypeCheckboxes input[value="send_notification"]').checked;
                const manualTitle = document.getElementById('manualTitle').value.trim();
                const manualVjName = document.getElementById('manualVjName').value.trim();
                const manualPosterUrl = document.getElementById('manualPosterUrl').value.trim();
                
                if (!manualTitle || !manualVjName || !manualPosterUrl) {
                    displayMessage(manualAddMessage, 'Title, VJ Name, and Poster URL are required.', 'error');
                    setLoading(manualAddBtn, false);
                    return;
                }

                const referenceIdInput = document.getElementById('manualReferenceId').value.trim();
                const selectedTypes = Array.from(document.querySelectorAll('#manualContentTypeCheckboxes input:checked')).map(cb => cb.value);

                let payload = {
                    title: manualTitle,
                    title_lowercase: manualTitle.toLowerCase(),
                    search_keywords: generateSearchKeywords(manualTitle, manualVjName),
                    slug: generateSlug(referenceIdInput || manualTitle),
                    tmdbId: /^\d+$/.test(referenceIdInput) ? Number(referenceIdInput) : null,
                    overview: document.getElementById('manualOverview').value.trim(),
                    posterUrl: manualPosterUrl,
                    backdropUrl: document.getElementById('manualBackdropUrl').value.trim(),
                    vjName: manualVjName,
                    genres: Array.from(document.querySelectorAll('#manualGenreCheckboxes input:checked')).map(cb => cb.value),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    addedBy: auth.currentUser.email,
                    sort_vjs: Array.from(document.querySelectorAll('#sortVjsCheckboxesManual input:checked')).map(cb => cb.value),
                    sort_genres: Array.from(document.querySelectorAll('#sortGenresCheckboxesManual input:checked')).map(cb => cb.value),
                };

                try {
                    const duplicateCheck = await checkForDuplicates(payload);
                    if (duplicateCheck.found) {
                        throw new Error(`Duplicate content found based on: ${duplicateCheck.field}.`);
                    }

                    let newDocId = null;
                    const primaryType = document.getElementById('manualPrimaryContentType').value;

                    if (primaryType === 'tv') {
                        payload.contentType = 'tv';
                        payload.type = selectedTypes.filter(type => type !== 'send_notification');
                        const seriesDataValue = document.getElementById('manualSeriesData').value;
                        if (!seriesDataValue) throw new Error("Series Data (JSON) is required for a TV Show.");
                        const seriesInfo = JSON.parse(seriesDataValue);
                        if (!Array.isArray(seriesInfo)) throw new Error("Invalid Series Data JSON structure.");

                        const docRef = await db.collection('movies').add(payload);
                        newDocId = docRef.id;

                        for (const season of seriesInfo) {
                            for (const episode of season.episodes) {
                                await db.collection('movies').doc(docRef.id).collection('episodes').add({
                                    season_number: season.season_number, ...episode,
                                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        }
                    } else { // It's a Movie
                        payload.contentType = 'movie';
                        payload.type = selectedTypes.filter(type => type !== 'send_notification');
                        payload.videoUrl = document.getElementById('manualVideoSourceUrl').value;

                        const docRef = await db.collection('movies').add(payload);
                        newDocId = docRef.id;
                    }

                    const successMessage = `Content added successfully! <a href="edit_content.html?id=${newDocId}" style="color: var(--accent-color);" target="_blank">Click to view/edit.</a>`;
                    if (sendNotificationChecked) {
                        const notificationSent = await sendNotification(payload.title, payload.overview, payload.backdropUrl, `bestmoviesug://details?id=${newDocId}`, manualAddMessage);
                        if (notificationSent) {
                             manualAddMessage.innerHTML = `Content saved! Notification sent successfully! <br/><a href="edit_content.html?id=${newDocId}" style="color: var(--accent-color);" target="_blank">View the new content.</a>`;
                             manualAddMessage.className = 'message success';
                             manualAddMessage.style.display = 'block';
                        }
                    } else {
                        manualAddMessage.innerHTML = successMessage;
                        manualAddMessage.className = 'message success';
                        manualAddMessage.style.display = 'block';
                    }

                    manualAddForm.reset();
                } catch (err) {
                    displayMessage(manualAddMessage, `Error: ${err.message}`, 'error');
                } finally {
                    setLoading(manualAddBtn, false);
                }
            });
        }
    });
});
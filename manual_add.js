document.addEventListener('DOMContentLoaded', () => {
    // Functions and variables from utils.js are available:
    // setLoading, displayMessage, populateCheckboxes, generateSlug,
    // generateSearchKeywords, checkForDuplicates, sendNotification,
    // VJ_LIST, GENRE_LIST

    // --- Page-Specific DOM Elements ---
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

    // --- Initialize Page ---
    setupMasterContentTypeToggle(manualAddForm);
    populateCheckboxes('sortVjsCheckboxesManual', 'sortVjsManual', VJ_LIST);
    populateCheckboxes('sortGenresCheckboxesManual', 'sortGenresManual', GENRE_LIST);
    
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

                const primaryType = document.getElementById('manualPrimaryContentType').value;
                if (primaryType === 'tv') {
                    payload.contentType = 'tv';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification' && type !== 'movie');
                    const seriesDataValue = document.getElementById('manualSeriesData').value;
                    if (!seriesDataValue) throw new Error("Series Data (JSON) is required for a TV Show.");
                    const seriesInfo = JSON.parse(seriesDataValue);
                    if (!Array.isArray(seriesInfo)) throw new Error("Invalid Series Data JSON structure.");

                    const docRef = await db.collection('StreamZone_v208_77').add(payload);
                    for (const season of seriesInfo) {
                        for (const episode of season.episodes) {
                            await db.collection('StreamZone_v208_77').doc(docRef.id).collection('episodes').add({
                                season_number: season.season_number, ...episode,
                                addedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                    if (sendNotificationChecked) {
                        await sendNotification(payload.title, payload.overview, payload.backdropUrl, `streamzonemovies://details?id=${docRef.id}`, manualAddMessage);
                    } else {
                        displayMessage(manualAddMessage, 'TV series added successfully!', 'success');
                    }
                } else { // It's a Movie
                    payload.contentType = 'movie';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification' && type !== 'Latest-TV-Series');
                    payload.videoUrl = document.getElementById('manualVideoSourceUrl').value;

                    const docRef = await db.collection('StreamZone_v208_77').add(payload);
                    if (sendNotificationChecked) {
                        await sendNotification(payload.title, payload.overview, payload.backdropUrl, `streamzonemovies://details?id=${docRef.id}`, manualAddMessage);
                    } else {
                        displayMessage(manualAddMessage, 'Movie added successfully!', 'success');
                    }
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
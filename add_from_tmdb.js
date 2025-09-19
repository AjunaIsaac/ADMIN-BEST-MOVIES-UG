document.addEventListener('DOMContentLoaded', () => {
    // ... (The top part of the file is correct and unchanged)
    const addMovieForm = document.getElementById('addMovieForm');
    const addContentBtn = document.getElementById('addContentBtn');
    const addMessage = document.getElementById('addMessage');
    function setupMasterContentTypeToggle(formElement) { /* ... */ }
    setupMasterContentTypeToggle(addMovieForm);
    populateCheckboxes('sortVjsCheckboxesTMDB', 'sortVjsTMDB', window.VJ_LIST);
    populateCheckboxes('sortGenresCheckboxesTMDB', 'sortGenresTMDB', window.GENRE_LIST);

    // --- Form Submission Logic ---
    if(addMovieForm) {
        addMovieForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoading(addContentBtn, true);

            // ... (All data fetching from TMDB and payload creation is correct)
            const identifier = document.getElementById('contentIdentifier').value.trim();
            // ... etc ...
            let payload = {
                // ... all payload fields
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: auth.currentUser.email,
                // ... etc ...
            };
            
            // 3. Save to Firestore
            try {
                const duplicateCheck = await checkForDuplicates(payload);
                if (duplicateCheck.found) {
                    throw new Error(`Duplicate content found based on: ${duplicateCheck.field}.`);
                }
                
                const finalApiType = document.getElementById('primaryContentType').value;
                if (finalApiType === 'tv') {
                    payload.contentType = 'tv';
                    // ... (logic to get series data) ...
                    
                    // ==========================================================
                    // THIS IS THE FIX: Changed to the 'movies' collection
                    // ==========================================================
                    const docRef = await db.collection('movies').add(payload);
                    for (const season of seriesInfo) {
                        for (const episode of season.episodes) {
                            await db.collection('movies').doc(docRef.id).collection('episodes').add({
                                season_number: season.season_number,
                                ...episode,
                                addedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                    // ==========================================================

                    if (sendNotificationChecked) {
                        // ...
                    } else {
                        displayMessage(addMessage, 'TV series added successfully!', 'success');
                    }
                } else { // It's a Movie
                    payload.contentType = 'movie';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification' && type !== 'Latest-TV-Series');
                    payload.videoUrl = document.getElementById('videoSourceUrl').value;
                    
                    // ==========================================================
                    // THIS IS THE FIX: Changed to the 'movies' collection
                    // ==========================================================
                    const docRef = await db.collection('movies').add(payload);
                    // ==========================================================
                    
                    if (sendNotificationChecked) {
                        // ...
                    } else {
                        displayMessage(addMessage, 'Movie added successfully!', 'success');
                    }
                }
                addMovieForm.reset();
            } catch (err) {
                displayMessage(addMessage, `Error: ${err.message}`, 'error');
            } finally {
                setLoading(addContentBtn, false);
            }
        });
    }
});
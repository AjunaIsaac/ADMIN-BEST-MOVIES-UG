document.addEventListener('DOMContentLoaded', () => {
    // These functions and variables are available from the updated utils.js
    const addMovieForm = document.getElementById('addMovieForm');
    const addContentBtn = document.getElementById('addContentBtn');
    const addMessage = document.getElementById('addMessage');

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
            toggleFields();
        }
    }

    // --- Initialize Page ---
    // The 'adminReady' event is dispatched from core.js after the user is verified.
    document.addEventListener('adminReady', () => {
        setupMasterContentTypeToggle(addMovieForm);
        populateCheckboxes('sortVjsCheckboxesTMDB', 'sortVjsTMDB', window.VJ_LIST);
        populateCheckboxes('sortGenresCheckboxesTMDB', 'sortGenresTMDB', window.GENRE_LIST);
    });

    // --- Form Submission Logic ---
    if(addMovieForm) {
        addMovieForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoading(addContentBtn, true);

            const identifier = document.getElementById('contentIdentifier').value.trim();
            const vjName = document.getElementById('vjName').value.trim();
            const tmdbApiKey = document.getElementById('tmdbApiKey').value;

            if (!vjName || !identifier) {
                displayMessage(addMessage, 'VJ Name and Content Identifier are required.', 'error');
                setLoading(addContentBtn, false);
                return;
            }
            
            // --- Simplified TMDB Fetch Logic ---
            let tmdbData = null;
            const selectedType = document.getElementById('primaryContentType').value;
            const isNumericId = /^\d+$/.test(identifier);

            try {
                let url = '';
                if (isNumericId) {
                    url = `https://api.themoviedb.org/3/${selectedType}/${identifier}?api_key=${tmdbApiKey}`;
                } else {
                    url = `https://api.themoviedb.org/3/search/${selectedType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(identifier)}`;
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`TMDB API request failed with status ${response.status}`);
                }
                const result = await response.json();
                if (isNumericId) {
                    tmdbData = result;
                } else {
                    if (result.results && result.results.length > 0) {
                        tmdbData = result.results[0];
                    }
                }
            } catch (err) {
                console.error("Error fetching from TMDB:", err);
                displayMessage(addMessage, `Error fetching from TMDB: ${err.message}`, 'error');
                setLoading(addContentBtn, false);
                return;
            }

            if (!tmdbData || !tmdbData.id) {
                displayMessage(addMessage, `Could not find any '${selectedType}' on TMDB with that name/ID.`, 'error');
                setLoading(addContentBtn, false);
                return;
            }

            // 2. Prepare data for Firestore
            const configResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbApiKey}`);
            const configData = await configResponse.json();
            const baseImageUrl = configData.images.secure_base_url + 'w500';
            const finalTitle = tmdbData.title || tmdbData.name;
            const sendNotificationChecked = document.querySelector('#contentTypeCheckboxes input[value="send_notification"]').checked;
            const selectedTypes = Array.from(document.querySelectorAll('#contentTypeCheckboxes input:checked')).map(cb => cb.value);

            let payload = {
                title: finalTitle,
                title_lowercase: finalTitle.toLowerCase(),
                search_keywords: generateSearchKeywords(finalTitle, vjName),
                tmdbId: tmdbData.id,
                slug: generateSlug(finalTitle),
                posterUrl: tmdbData.poster_path ? `${baseImageUrl}${tmdbData.poster_path}` : '',
                backdropUrl: tmdbData.backdrop_path ? `${baseImageUrl}${tmdbData.backdrop_path}` : '',
                overview: tmdbData.overview || "N/A",
                vjName: vjName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: auth.currentUser.email,
                sort_vjs: Array.from(document.querySelectorAll('#sortVjsCheckboxesTMDB input:checked')).map(cb => cb.value),
                sort_genres: Array.from(document.querySelectorAll('#sortGenresCheckboxesTMDB input:checked')).map(cb => cb.value),
                genres: tmdbData.genre_ids || []
            };
            
            // 3. Save to Firestore
            try {
                const duplicateCheck = await checkForDuplicates(payload);
                if (duplicateCheck.found) {
                    throw new Error(`Duplicate content found based on: ${duplicateCheck.field}.`);
                }
                
                let newDocId = null;

                if (selectedType === 'tv') {
                    payload.contentType = 'tv';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification');
                    const seriesDataValue = document.getElementById('seriesData').value;
                    if (!seriesDataValue) throw new Error("Series Data (JSON) cannot be empty for a TV Show.");
                    const seriesInfo = JSON.parse(seriesDataValue);
                    if (!Array.isArray(seriesInfo)) throw new Error("Invalid Series Data JSON structure.");
                    
                    const docRef = await db.collection('movies').add(payload);
                    newDocId = docRef.id;

                    for (const season of seriesInfo) {
                        for (const episode of season.episodes) {
                            await db.collection('movies').doc(docRef.id).collection('episodes').add({
                                season_number: season.season_number,
                                ...episode,
                                addedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                } else { // It's a Movie
                    payload.contentType = 'movie';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification');
                    payload.videoUrl = document.getElementById('videoSourceUrl').value;
                    
                    const docRef = await db.collection('movies').add(payload);
                    newDocId = docRef.id;
                }
                
                const successMessage = `Content added successfully! <a href="edit_content.html?id=${newDocId}" style="color: var(--accent-color);" target="_blank">Click to view/edit.</a>`;
                if (sendNotificationChecked) {
                    const notificationSent = await sendNotification(finalTitle, tmdbData.overview, payload.backdropUrl, `bestmoviesug://details?id=${newDocId}`, addMessage);
                    if (notificationSent) {
                        addMessage.innerHTML = `Content saved! Notification sent successfully! <br/><a href="edit_content.html?id=${newDocId}" style="color: var(--accent-color);" target="_blank">View the new content.</a>`;
                    }
                } else {
                    addMessage.innerHTML = successMessage;
                    addMessage.className = 'message success';
                    addMessage.style.display = 'block';
                }
                addMovieForm.reset();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err) {
                displayMessage(addMessage, `Error: ${err.message}`, 'error');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } finally {
                setLoading(addContentBtn, false);
            }
        });
    }
});
javascript
document.addEventListener('DOMContentLoaded', () => {
    // These functions and variables are now available from utils.js:
    // setLoading, displayMessage, populateCheckboxes, generateSlug,
    // generateSearchKeywords, checkForDuplicates, sendNotification,
    // VJ_LIST, GENRE_LIST

    // --- Page-Specific DOM Elements ---
    const addMovieForm = document.getElementById('addMovieForm');
    const addContentBtn = document.getElementById('addContentBtn');
    const addMessage = document.getElementById('addMessage');

    // --- Content Type Toggling ---
    function setupMasterContentTypeToggle(formElement) {
        if (!formElement) return;
        const primarySelector = formElement.querySelector('.primary-content-type-selector');
        const mediaCategoriesGroup = formElement.querySelector('.media-categories-group');
        const videoUrlGroup = formElement.querySelector('.video-url-group');
        const seriesDataGroup = formElement.querySelector('.series-data-group');
        
        const movieCategories = ["latest_uploads", "romance", "most_liked", "recent_movies", "animation", "indian", "horror", "comedy", "adventure", "scifi-fantasy", "action-thriller", "high-school", "nigerian", "send_notification"];
        const tvCategories = ["latest_uploads", "most_liked", "recent_tv_shows", "upcoming_shows", "western_series", "Latest-TV-Series", "k_dramas", "send_notification"];

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
    setupMasterContentTypeToggle(addMovieForm);
    populateCheckboxes('sortVjsCheckboxesTMDB', 'sortVjsTMDB', VJ_LIST);
    populateCheckboxes('sortGenresCheckboxesTMDB', 'sortGenresTMDB', GENRE_LIST);

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

            // 1. Fetch data from TMDB
            let tmdbData = null;
            const selectedPrimaryContentType = document.getElementById('primaryContentType').value;
            let finalApiType = selectedPrimaryContentType;
            const isNumericId = /^\d+$/.test(identifier);

            if (isNumericId) {
                try {
                    let response = await fetch(`https://api.themoviedb.org/3/${selectedPrimaryContentType}/${identifier}?api_key=${tmdbApiKey}`);
                    if (response.ok) tmdbData = await response.json();
                } catch (err) { console.warn(`Error fetching from TMDB by ID:`, err); }
            } else {
                 try {
                    let searchUrl = `https://api.themoviedb.org/3/search/${selectedPrimaryContentType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(identifier)}`;
                    let response = await fetch(searchUrl);
                    let searchResult = await response.json();
                    if (response.ok && searchResult.results && searchResult.results.length > 0) {
                        tmdbData = searchResult.results[0];
                    }
                } catch (err) { console.error("Error searching TMDB:", err); }
            }

            if (!tmdbData || !tmdbData.id) {
                displayMessage(addMessage, 'Could not find content on TMDB. Check name/ID.', 'error');
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

                if (finalApiType === 'tv') {
                    payload.contentType = 'tv';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification' && type !== 'movie');
                    const seriesDataValue = document.getElementById('seriesData').value;
                    if (!seriesDataValue) throw new Error("Series Data (JSON) cannot be empty for a TV Show.");
                    const seriesInfo = JSON.parse(seriesDataValue);
                    if (!Array.isArray(seriesInfo)) throw new Error("Invalid Series Data JSON structure.");
                    
                    const docRef = await db.collection('StreamZone_v208_77').add(payload);
                    for (const season of seriesInfo) {
                        for (const episode of season.episodes) {
                            await db.collection('StreamZone_v208_77').doc(docRef.id).collection('episodes').add({
                                season_number: season.season_number,
                                ...episode,
                                addedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                    if (sendNotificationChecked) {
                        await sendNotification(finalTitle, tmdbData.overview, payload.backdropUrl, `streamzonemovies://details?id=${docRef.id}`, addMessage);
                    } else {
                        displayMessage(addMessage, 'TV series added successfully!', 'success');
                    }
                } else { // It's a Movie
                    payload.contentType = 'movie';
                    payload.type = selectedTypes.filter(type => type !== 'send_notification' && type !== 'Latest-TV-Series');
                    payload.videoUrl = document.getElementById('videoSourceUrl').value;
                    
                    const docRef = await db.collection('StreamZone_v208_77').add(payload);
                    if (sendNotificationChecked) {
                        await sendNotification(finalTitle, tmdbData.overview, payload.backdropUrl, `streamzonemovies://details?id=${docRef.id}`, addMessage);
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
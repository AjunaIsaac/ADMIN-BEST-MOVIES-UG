document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('adminReady', () => {
        
        // Define the list of available categories for Live TV
        const TV_CATEGORIES = [
            "Sports", "News", "Movies", "Entertainment", 
            "Kids", "Music", "Documentary", "General"
        ];

        // --- Page-Specific DOM Elements ---
        const addTvForm = document.getElementById('addTvForm');
        const addTvBtn = document.getElementById('addTvBtn');
        const addMessage = document.getElementById('addMessage');
        const checkboxesContainer = document.getElementById('channelCategoriesCheckboxes');

        // Dynamically populate the category checkboxes
        // This assumes you have a 'populateCheckboxes' function in 'utils.js'
        // It creates checkboxes with name="channelCategory"
        if (window.populateCheckboxes) {
            populateCheckboxes('channelCategoriesCheckboxes', 'channelCategory', TV_CATEGORIES);
        } else {
            console.error("The 'populateCheckboxes' utility function was not found.");
            checkboxesContainer.innerHTML = "<p style='color: red;'>Error: Could not load categories.</p>";
        }


        if (addTvForm) {
            addTvForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                setLoading(addTvBtn, true);
                displayMessage(addMessage, '', 'clear');

                // --- 1. Get values from the form ---
                const name = document.getElementById('channelName').value.trim();
                const logoUrl = document.getElementById('channelLogoUrl').value.trim();
                const streamUrl = document.getElementById('channelStreamUrl').value.trim();
                const description = document.getElementById('channelDescription').value.trim();

                // Get all checked category checkboxes and map their values to an array
                const selectedCategories = Array.from(
                    document.querySelectorAll('#channelCategoriesCheckboxes input:checked')
                ).map(cb => cb.value);

                // --- 2. Validation ---
                if (!name || !logoUrl || !streamUrl || selectedCategories.length === 0) {
                    displayMessage(addMessage, 'Name, Logo URL, Stream URL, and at least one Category are required.', 'error');
                    setLoading(addTvBtn, false);
                    return;
                }

                // --- 3. Prepare the data payload for Firestore ---
                const payload = {
                    name: name,
                    category: selectedCategories, // Save as an array
                    logoUrl: logoUrl,
                    streamUrl: streamUrl,
                    description: description,
                    viewers: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    addedBy: auth.currentUser.email
                };

                // --- 4. Save to Firestore ---
                try {
                    await db.collection('live_tv').add(payload);
                    displayMessage(addMessage, `Channel "${name}" added successfully!`, 'success');
                    addTvForm.reset();
                    // After reset, we might need to re-check default state if any
                    // For now, a clean reset is fine.
                } catch (error) {
                    console.error("Error adding document: ", error);
                    displayMessage(addMessage, `Error: ${error.message}`, 'error');
                } finally {
                    setLoading(addTvBtn, false);
                }
            });
        }
    });
});
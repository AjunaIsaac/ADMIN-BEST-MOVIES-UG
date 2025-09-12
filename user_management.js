document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available: setLoading, displayMessage

    // --- Page-Specific DOM Elements ---
    const userSearchEmailInput = document.getElementById('user-search-email');
    const userSearchBtn = document.getElementById('user-search-btn');
    const userMessageArea = document.getElementById('user-message-area');
    const userEditFormSection = document.getElementById('user-edit-form-section');
    const userFormDivider = document.getElementById('user-form-divider');
    const userDocIdInput = document.getElementById('user-doc-id');
    const userEditNameInput = document.getElementById('user-edit-name');
    const userEditEmailInput = document.getElementById('user-edit-email');
    const userEditActivatedSelect = document.getElementById('user-edit-activated');
    const userEditExpiresAtInput = document.getElementById('user-edit-expiresAt');
    const userEditAdsDisabledSelect = document.getElementById('user-edit-ads-disabled');
    const userEditAdsExpiryInput = document.getElementById('user-edit-ads-expiry');
    const userUpdateBtn = document.getElementById('user-update-btn');
    const userCreateBtn = document.getElementById('user-create-btn');
    const userFormTitle = document.getElementById('user-form-title');

    // --- Page-Specific Helper Functions ---
    function formatTimestampForInput(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') return '';
        const date = timestamp.toDate();
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
    }
    
    function clearUserForm() {
        userDocIdInput.value = '';
        userEditNameInput.value = '';
        userEditEmailInput.value = '';
        userEditActivatedSelect.value = 'true';
        userEditExpiresAtInput.value = '';
        userEditAdsDisabledSelect.value = 'false';
        userEditAdsExpiryInput.value = '';
        userEditFormSection.style.display = 'none';
        userFormDivider.style.display = 'none';
    }

    // --- Search Logic ---
    userSearchBtn.addEventListener('click', async () => {
        const emailToSearch = userSearchEmailInput.value.trim();
        if (!emailToSearch) {
            displayMessage(userMessageArea, 'Please enter an email to search.', 'error');
            return;
        }
        clearUserForm();
        setLoading(userSearchBtn, true);

        try {
            const querySnapshot = await db.collection("users").where("email", "==", emailToSearch).get();
            
            if (querySnapshot.empty) {
                displayMessage(userMessageArea, 'No user found. You can create a new document for this email.', 'info');
                userEditEmailInput.value = emailToSearch;
                userFormTitle.textContent = "Create New User Document";
                userDocIdInput.value = "Will be auto-generated";
                userUpdateBtn.style.display = 'none';
                userCreateBtn.style.display = 'block';
            } else {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                displayMessage(userMessageArea, 'User found and form populated.', 'success');
                userDocIdInput.value = userDoc.id;
                userEditNameInput.value = userData.name || '';
                userEditEmailInput.value = userData.email || '';
                userEditActivatedSelect.value = userData.activated ? 'true' : 'false';
                userEditExpiresAtInput.value = formatTimestampForInput(userData.expiresAt);
                userEditAdsDisabledSelect.value = userData.adsDisabled === true ? 'true' : 'false';
                userEditAdsExpiryInput.value = userData.adsDisabledExpiry || '';
                userFormTitle.textContent = "Edit User Document";
                userCreateBtn.style.display = 'none';
                userUpdateBtn.style.display = 'block';
            }
            userEditFormSection.style.display = 'block';
            userFormDivider.style.display = 'block';
        } catch (error) {
            displayMessage(userMessageArea, `Error searching: ${error.message}`, 'error');
        } finally {
            setLoading(userSearchBtn, false);
        }
    });

    // --- Update Logic ---
    userUpdateBtn.addEventListener('click', async () => {
        const userId = userDocIdInput.value;
        if (!userId) {
            displayMessage(userMessageArea, 'No user document ID found to update.', 'error');
            return;
        }
        setLoading(userUpdateBtn, true);

        try {
            const dateValue = userEditExpiresAtInput.value ? new Date(userEditExpiresAtInput.value) : null;
            const payload = {
                name: userEditNameInput.value,
                email: userEditEmailInput.value,
                activated: userEditActivatedSelect.value === 'true',
                expiresAt: dateValue ? firebase.firestore.Timestamp.fromDate(dateValue) : firebase.firestore.FieldValue.delete(),
                adsDisabled: userEditAdsDisabledSelect.value === 'true',
                adsDisabledExpiry: userEditAdsExpiryInput.value || firebase.firestore.FieldValue.delete()
            };
            await db.collection("users").doc(userId).update(payload);
            displayMessage(userMessageArea, 'User document updated successfully!', 'success');
        } catch (error) {
            displayMessage(userMessageArea, `Update failed: ${error.message}`, 'error');
        } finally {
            setLoading(userUpdateBtn, false);
        }
    });

    // --- Create Logic ---
    userCreateBtn.addEventListener('click', async () => {
        const email = userEditEmailInput.value.trim();
        const name = userEditNameInput.value.trim();
        if (!email || !name) {
            displayMessage(userMessageArea, 'Email and Name are required for a new user.', 'error');
            return;
        }
        setLoading(userCreateBtn, true);
        
        try {
            const dateValue = userEditExpiresAtInput.value ? new Date(userEditExpiresAtInput.value) : null;
            const newDocRef = db.collection("users").doc(); // Auto-generate ID
            await newDocRef.set({
                name: name,
                email: email,
                activated: userEditActivatedSelect.value === 'true',
                expiresAt: dateValue ? firebase.firestore.Timestamp.fromDate(dateValue) : null,
                adsDisabled: userEditAdsDisabledSelect.value === 'true',
                adsDisabledExpiry: userEditAdsExpiryInput.value || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            userDocIdInput.value = newDocRef.id;
            displayMessage(userMessageArea, `New user document created successfully: ${newDocRef.id}`, 'success');
            
            // Switch from "Create" to "Update" mode
            userCreateBtn.style.display = 'none';
            userUpdateBtn.style.display = 'block';
            userFormTitle.textContent = "Edit User Document";
        } catch (error) {
            displayMessage(userMessageArea, `Creation failed: ${error.message}`, 'error');
        } finally {
            setLoading(userCreateBtn, false);
        }
    });
});
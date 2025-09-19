document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available: setLoading, displayMessage

    // --- Page-Specific DOM Elements ---
    const userSearchInput = document.getElementById('user-search-input'); 
    const userSearchBtn = document.getElementById('user-search-btn');
    const userMessageArea = document.getElementById('user-message-area');
    const userEditFormSection = document.getElementById('user-edit-form-section');
    const userFormDivider = document.getElementById('user-form-divider');
    const userDocIdInput = document.getElementById('user-doc-id');
    const userEditNameInput = document.getElementById('user-edit-name');
    const userEditEmailInput = document.getElementById('user-edit-email');
    const userEditPhoneInput = document.getElementById('user-edit-phone');
    const userEditActivatedSelect = document.getElementById('user-edit-activated');
    const userEditExpiresAtInput = document.getElementById('user-edit-expiresAt');
    const userUpdateBtn = document.getElementById('user-update-btn');
    const userCreateBtn = document.getElementById('user-create-btn');
    const userFormTitle = document.getElementById('user-form-title');
    const userStatusInfo = document.getElementById('user-status-info');

    // --- Page-Specific Helper Functions ---
    function formatTimestampForInput(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') return '';
        const date = timestamp.toDate();
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
    }
    
    function displayUserStatus(userData) {
        if (!userStatusInfo) return;
        let statusHTML = '<h4 style="margin-top:0; margin-bottom: 10px;">Subscription Status</h4>';
        const expiresAt = userData.expiresAt;
        if (expiresAt && typeof expiresAt.toDate === 'function') {
            const expiryDate = expiresAt.toDate();
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDate = expiryDate.toLocaleString('en-US', options);
            if (expiryDate < now) {
                statusHTML += `<p style="color: var(--danger-color); margin:0;">Status: Expired on ${formattedDate}</p>`;
            } else {
                statusHTML += `<p style="color: var(--success-color); margin:0;">Status: Active, expires on ${formattedDate}</p>`;
            }
        } else {
            statusHTML += '<p style="margin:0;">Status: No subscription expiration information.</p>';
        }
        const modifiedTimestamp = userData.updatedAt || userData.createdAt;
        if (modifiedTimestamp && typeof modifiedTimestamp.toDate === 'function') {
             const modifiedDate = modifiedTimestamp.toDate();
             const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
             const formattedModifiedDate = modifiedDate.toLocaleString('en-US', options);
             statusHTML += `<p style="font-size: 0.8em; color: #999; margin-top: 10px; margin-bottom: 0;">Last Modified: ${formattedModifiedDate}</p>`
        }
        userStatusInfo.innerHTML = statusHTML;
        userStatusInfo.style.display = 'block';
    }

    function clearUserForm() {
        userDocIdInput.value = '';
        userEditNameInput.value = '';
        userEditEmailInput.value = '';
        userEditPhoneInput.value = '';
        userEditActivatedSelect.value = 'true';
        userEditExpiresAtInput.value = '';
        userEditFormSection.style.display = 'none';
        userFormDivider.style.display = 'none';
        if (userStatusInfo) userStatusInfo.style.display = 'none';
    }

    // --- Search Logic ---
    userSearchBtn.addEventListener('click', async () => {
        const searchTerm = userSearchInput.value.trim();
        if (!searchTerm) {
            displayMessage(userMessageArea, 'Please enter an email, name, or phone number to search.', 'error');
            return;
        }
        clearUserForm();
        setLoading(userSearchBtn, true);
        try {
            const emailQuery = db.collection("users").where("email", "==", searchTerm).get();
            const nameQuery = db.collection("users").where("name", "==", searchTerm).get();
            const phoneQuery = db.collection("users").where("phone", "==", searchTerm).get();
            const [emailResults, nameResults, phoneResults] = await Promise.all([emailQuery, nameQuery, phoneQuery]);
            const results = new Map();
            emailResults.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
            nameResults.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
            phoneResults.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));

            if (results.size === 0) {
                displayMessage(userMessageArea, 'No user found. You can create a new document.', 'info');
                userEditEmailInput.value = searchTerm.includes('@') ? searchTerm : '';
                userEditNameInput.value = !searchTerm.includes('@') ? searchTerm : '';
                userFormTitle.textContent = "Create New User Document";
                userDocIdInput.value = "Will be auto-generated";
                userUpdateBtn.style.display = 'none';
                userCreateBtn.style.display = 'block';
            } else {
                if (results.size > 1) {
                    displayMessage(userMessageArea, `Found ${results.size} users. Displaying the first one. Please use a more specific search term.`, 'warn');
                } else {
                    displayMessage(userMessageArea, 'User found and form populated.', 'success');
                }
                const [firstId, firstData] = results.entries().next().value;
                userDocIdInput.value = firstId;
                userEditNameInput.value = firstData.name || '';
                userEditEmailInput.value = firstData.email || '';
                userEditPhoneInput.value = firstData.phone || '';
                userEditActivatedSelect.value = firstData.activated ? 'true' : 'false';
                userEditExpiresAtInput.value = formatTimestampForInput(firstData.expiresAt);
                userFormTitle.textContent = "Edit User Document";
                userCreateBtn.style.display = 'none';
                userUpdateBtn.style.display = 'block';
                displayUserStatus(firstData);
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
        if (!userId) { return; }
        setLoading(userUpdateBtn, true);
        try {
            const dateValue = userEditExpiresAtInput.value ? new Date(userEditExpiresAtInput.value) : null;
            
            // ========================================================================
            // THIS IS THE FIX. Use the global 'firebase' object for FieldValue.
            // ========================================================================
            const payload = {
                name: userEditNameInput.value,
                email: userEditEmailInput.value,
                phone: userEditPhoneInput.value,
                activated: userEditActivatedSelect.value === 'true',
                expiresAt: dateValue ? firebase.firestore.Timestamp.fromDate(dateValue) : firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            // ========================================================================

            await db.collection("users").doc(userId).update(payload);
            displayMessage(userMessageArea, 'User document updated successfully!', 'success');
            const updatedDataForDisplay = { 
                ...payload, 
                expiresAt: dateValue ? firebase.firestore.Timestamp.fromDate(dateValue) : null,
                updatedAt: firebase.firestore.Timestamp.now()
            };
            displayUserStatus(updatedDataForDisplay);
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
            const newDocRef = db.collection("users").doc();
            
            // ========================================================================
            // THIS IS THE FIX. Use the global 'firebase' object for FieldValue.
            // ========================================================================
            await newDocRef.set({
                name: name,
                email: email,
                phone: userEditPhoneInput.value.trim(),
                activated: userEditActivatedSelect.value === 'true',
                expiresAt: dateValue ? firebase.firestore.Timestamp.fromDate(dateValue) : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // ========================================================================

            userDocIdInput.value = newDocRef.id;
            displayMessage(userMessageArea, `New user document created successfully: ${newDocRef.id}`, 'success');
            userCreateBtn.style.display = 'none';
            userUpdateBtn.style.display = 'block';
            userFormTitle.textContent = "Edit User Document";
            displayUserStatus({ 
                expiresAt: dateValue ? firebase.firestore.Timestamp.fromDate(dateValue) : null,
                createdAt: firebase.firestore.Timestamp.now()
            });
        } catch (error) {
            displayMessage(userMessageArea, `Creation failed: ${error.message}`, 'error');
        } finally {
            setLoading(userCreateBtn, false);
        }
    });
});
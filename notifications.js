document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available: setLoading, displayMessage, sendNotification

    // --- Page-Specific DOM Elements ---
    const notifForm = document.getElementById('notificationForm');
    const sendNotificationBtn = document.getElementById('sendNotificationBtn');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Form Inputs
    const notifTitleInput = document.getElementById('notifTitle');
    const notifBodyInput = document.getElementById('notifBody');
    const notifImageUrlInput = document.getElementById('notifImageUrl');
    const notifUrlIdInput = document.getElementById('notifUrlId');

    // Preview Elements
    const previewTitle = document.getElementById('previewTitle');
    const previewBody = document.getElementById('previewBody');
    const previewImage = document.getElementById('previewImage');

    // --- Live Preview Logic ---
    if (notifTitleInput) {
        notifTitleInput.addEventListener('input', () => {
            previewTitle.textContent = notifTitleInput.value || 'Notification Title';
        });
    }

    if (notifBodyInput) {
        notifBodyInput.addEventListener('input', () => {
            previewBody.textContent = notifBodyInput.value || 'Notification body will appear here...';
        });
    }

    if (notifImageUrlInput) {
        notifImageUrlInput.addEventListener('input', () => {
            const url = notifImageUrlInput.value;
            if (url) {
                previewImage.src = url;
                previewImage.style.display = 'block';
                // Hide preview if the image URL is broken
                previewImage.onerror = () => { previewImage.style.display = 'none'; };
            } else {
                previewImage.style.display = 'none';
            }
        });
    }

    // --- Form Submission Logic ---
    if (notifForm) {
        notifForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoading(sendNotificationBtn, true);

            const title = notifTitleInput.value.trim();
            const body = notifBodyInput.value.trim();
            const imageUrl = notifImageUrlInput.value.trim();
            const contentId = notifUrlIdInput.value.trim();
            
            if (!title || !body) {
                displayMessage(notificationMessage, 'Title and Body are required.', 'error');
                setLoading(sendNotificationBtn, false);
                return;
            }

            const fullUrl = contentId ? `streamzonemovies://details?id=${contentId}` : '';

            // The sendNotification function is in utils.js and handles everything else
            const success = await sendNotification(title, body, imageUrl, fullUrl, notificationMessage);
            
            if (success) {
                notifForm.reset();
                // Reset preview manually
                previewTitle.textContent = 'Notification Title';
                previewBody.textContent = 'Notification body will appear here...';
                previewImage.style.display = 'none';
                previewImage.src = '';
            }
            
            setLoading(sendNotificationBtn, false);
        });
    }
});
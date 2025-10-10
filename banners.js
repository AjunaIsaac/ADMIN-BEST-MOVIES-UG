document.addEventListener('DOMContentLoaded', () => {
    // Functions from utils.js are available.

    // --- Page-Specific DOM Elements ---
    const bannerNavTabs = document.querySelector('.banner-nav-tabs');
    const allBannersContainer = document.getElementById('allBannersContainer');
    const viewBannersMessage = document.getElementById('viewBannersMessage');
    const addEditBannerForm = document.getElementById('addEditBannerForm');
    const saveBannerBtn = document.getElementById('saveBannerBtn');
    const cancelEditBannerBtn = document.getElementById('cancelEditBannerBtn');
    const addBannerMessage = document.getElementById('addBannerMessage');
    const bannerFormTitle = document.getElementById('bannerFormTitle');
    const bannerDocIdInput = document.getElementById('bannerDocId');

    // This event listener ensures the code below only runs AFTER core.js has verified the admin.
    document.addEventListener('adminReady', () => {
        // --- Display Logic ---
        async function displayAllBanners() {
            allBannersContainer.innerHTML = '<div class="message info" style="display:block;">Loading banners...</div>';
            try {
                const snapshot = await db.collection('banners').orderBy('updatedAt', 'desc').limit(20).get();
                if (snapshot.empty) {
                    allBannersContainer.innerHTML = '';
                    displayMessage(viewBannersMessage, 'No banners found. Add one in the "Add/Edit" tab.', 'info');
                    return;
                }
                allBannersContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    const banner = { id: doc.id, ...doc.data() };
                    const card = `
                        <div class="banner-card">
                            <img src="${banner.imageUrl}" alt="${banner.title}" loading="lazy">
                            <div class="banner-card-content">
                                <h3>${banner.title}</h3>
                                <p>${(banner.description || '').substring(0, 100)}</p>
                                <div class="banner-card-actions">
                                    <button class="action-btn edit" data-id="${banner.id}">Edit</button>
                                    <button class="action-btn delete" data-id="${banner.id}">Delete</button>
                                </div>
                            </div>
                        </div>`;
                    allBannersContainer.insertAdjacentHTML('beforeend', card);
                });
            } catch (err) {
                allBannersContainer.innerHTML = '';
                displayMessage(viewBannersMessage, `Error fetching banners: ${err.message}`, 'error');
            }
        }

        // --- Form Logic ---
        function resetBannerForm() {
            addEditBannerForm.reset();
            bannerDocIdInput.value = '';
            bannerFormTitle.textContent = 'Add New Banner';
            saveBannerBtn.textContent = 'Save Banner';
            cancelEditBannerBtn.style.display = 'none';
            displayMessage(addBannerMessage, '', ''); // Clear any previous messages
        }

        async function loadBannerForEditing(id) {
            try {
                const doc = await db.collection('banners').doc(id).get();
                if (!doc.exists) throw new Error("Banner not found.");
                
                const data = doc.data();
                bannerDocIdInput.value = id;
                document.getElementById('bannerTitle').value = data.title || '';
                document.getElementById('bannerImageUrl').value = data.imageUrl || '';
                document.getElementById('bannerDescription').value = data.description || '';
                document.getElementById('bannerLink').value = data.link || '';
                
                bannerFormTitle.textContent = 'Editing Banner';
                saveBannerBtn.textContent = 'Update Banner';
                cancelEditBannerBtn.style.display = 'inline-block';
                
                document.querySelector('.banner-tab-link[data-tab="addBannerTab"]').click();
                window.scrollTo(0, 0);
            } catch (err) {
                displayMessage(addBannerMessage, `Could not load banner: ${err.message}`, 'error');
            }
        }

        // --- Event Listeners ---
        bannerNavTabs.addEventListener('click', (e) => {
            if (e.target.matches('.banner-tab-link')) {
                const tabId = e.target.dataset.tab;
                document.querySelectorAll('.banner-tab-link').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.banner-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');

                if (tabId === 'viewBannersTab') {
                    displayAllBanners();
                }
            }
        });

        addEditBannerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoading(saveBannerBtn, true);
            const id = bannerDocIdInput.value;
            const data = {
                title: document.getElementById('bannerTitle').value.trim(),
                imageUrl: document.getElementById('bannerImageUrl').value.trim(),
                description: document.getElementById('bannerDescription').value.trim(),
                link: document.getElementById('bannerLink').value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!data.title || !data.imageUrl || !data.link) {
                displayMessage(addBannerMessage, 'Title, Image URL, and Link are required.', 'error');
                setLoading(saveBannerBtn, false);
                return;
            }

            try {
                if (id) { // Update existing banner
                    await db.collection('banners').doc(id).update(data);
                } else { // Add new banner
                    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('banners').add(data);
                }
                resetBannerForm();
                displayMessage(viewBannersMessage, 'Banner saved successfully!', 'success');
                document.querySelector('.banner-tab-link[data-tab="viewBannersTab"]').click();
            } catch (err) {
                displayMessage(addBannerMessage, `Error saving banner: ${err.message}`, 'error');
            } finally {
                setLoading(saveBannerBtn, false);
            }
        });

        allBannersContainer.addEventListener('click', async (e) => {
            const target = e.target;
            const docId = target.dataset.id;
            if (!docId) return;

            if (target.matches('.action-btn.edit')) {
                loadBannerForEditing(docId);
            }

            if (target.matches('.action-btn.delete')) {
                if (confirm('Are you sure you want to delete this banner?')) {
                    setLoading(target, true);
                    try {
                        await db.collection('banners').doc(docId).delete();
                        displayMessage(viewBannersMessage, 'Banner deleted!', 'success');
                        target.closest('.banner-card').remove();
                    } catch (err) {
                        displayMessage(viewBannersMessage, `Error deleting: ${err.message}`, 'error');
                        setLoading(target, false);
                    }
                }
            }
        });

        cancelEditBannerBtn.addEventListener('click', resetBannerForm);

        // --- Initial Load ---
        displayAllBanners();
    });
});
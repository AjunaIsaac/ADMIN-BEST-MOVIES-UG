// This file contains utility functions shared across multiple pages.
// It should be included in any HTML page that needs these helpers.

// --- Global Constants (can be accessed via window object) ---
<<<<<<< HEAD
// UPDATED: Added VJ LIGHT
window.VJ_LIST = ["VJ JUNIOR", "VJ TONNY", "VJ PAX", "VJ EMMY", "VJ LIGHT", "VJ RYAN", "HEAVY Q", "VJ MK", "VJ MARK", "VJ SHIELD", "VJ ISMA K", "ILLESS", "VJ BONNY", "VJ NEIL", "VJ JOVAN", "VJ TOM", "VJ SHAO K", "VJ JINGO", "VJ ICE P", "VJ KEVO", "VJ KEVIN", "VJ KIN", "VJ KRISS SWEET", "VJ HD", "VJ DAN DE", "VJ SAMMY", "VJ IVO", "VJ LITTLE T", "VJ LASH", "VJ MOX", "VJ MUBA", "VJ EDDY", "VJ KAM", "VJ LANCE", "VJ KS", "VJ ULIO", "VJ AARON", "VJ CABS", "VJ BANKS", "VJ JIMMY", "VJ BAROS", "VJ SOUL", "VJ SON", "VJ KIMULI", "VJ FREDY", "VJ JUMPERS", "VJ ASHIM", "VJ PAULETA", "VJ MARTIN K", "VJ HENRICO", "VJ MUSA", "VJ UNCLE T", "VJ WAZA", "VJ RONAGE"];
=======
window.VJ_LIST = ["VJ JUNIOR", "VJ TONNY", "VJ PAX", "VJ EMMY", "VJ LIGHT","VJ ZAIDI","VJ RYAN", "HEAVY Q", "VJ MK", "VJ MARK", "VJ SHIELD", "VJ ISMA K", "ILLESS", "VJ BONNY", "VJ NEIL", "VJ JOVAN", "VJ TOM", "VJ SHAO K", "VJ JINGO", "VJ ICE P", "VJ KEVO", "VJ KEVIN", "VJ KIN", "VJ KRISS SWEET", "VJ HD", "VJ DAN DE", "VJ SAMMY", "VJ IVO", "VJ LITTLE T", "VJ LASH", "VJ MOX", "VJ MUBA", "VJ EDDY", "VJ KAM", "VJ LANCE", "VJ KS", "VJ ULIO", "VJ AARON", "VJ CABS", "VJ BANKS", "VJ JIMMY", "VJ BAROS", "VJ SOUL", "VJ SON", "VJ KIMULI", "VJ FREDY", "VJ JUMPERS", "VJ ASHIM", "VJ PAULETA", "VJ MARTIN K", "VJ HENRICO", "VJ MUSA", "VJ UNCLE T", "VJ WAZA", "VJ RONAGE"];
>>>>>>> af61ca9f3a2381efdc0d698a5bcfe2dd5d71ad42
window.GENRE_LIST = ["ACTION", "HORROR", "SERIES", "ADVENTURE", "LOVE STORY", "COMEDY", "CRIME", "FAMILY", "SCI FI", "ROMANCE", "KUNGU FU", "DRAMA", "SPORT", "THRILLER", "ANIMATION", "DOCUMENTARY", "FANTASY", "HISTORY", "MUSIC", "MYSTERY", "WAR", "WESTERN"];


// --- UI Helpers ---
function setLoading(button, isLoading) {
    if (button) {
        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
    }
}

function displayMessage(element, msg, type) {
    if (element) {
        element.textContent = msg;
        element.className = `message ${type}`;
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; }, 8000);
    }
}

function populateCheckboxes(containerId, namePrefix, list, selectedValues = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    list.forEach(item => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = namePrefix;
        checkbox.value = item;
        checkbox.checked = Array.isArray(selectedValues) && selectedValues.includes(item);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${item}`));
        container.appendChild(label);
    });
}

// --- Data & String Manipulation ---
function generateSlug(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

function generateSearchKeywords(title, vjName) {
    const keywords = new Set();
    const fullText = `${title || ''} ${vjName || ''}`.toLowerCase();
    const words = fullText.split(' ').filter(word => word);

    words.forEach(word => {
        const cleanedWord = word.replace(/[^a-z0-9]/gi, '');
        for (let i = 1; i <= cleanedWord.length; i++) {
            keywords.add(cleanedWord.substring(0, i));
        }
    });
    return Array.from(keywords);
}

// --- Firestore Helpers ---
// UPDATED: Now queries the 'movies' collection
async function checkForDuplicates(payload, excludeDocId = null) {
    if (!window.db) {
        console.error("Firestore (db) is not initialized.");
        return { found: true, field: 'Firestore connection error' };
    }
    if (payload.tmdbId && typeof payload.tmdbId === 'number') {
        const q = db.collection('movies').where('tmdbId', '==', payload.tmdbId);
        const snapshot = await q.get();
        for (const doc of snapshot.docs) {
            if (doc.id !== excludeDocId) return { found: true, field: 'TMDB ID' };
        }
    }
    if (payload.slug) {
        const q = db.collection('movies').where('slug', '==', payload.slug);
        const snapshot = await q.get();
        for (const doc of snapshot.docs) {
            if (doc.id !== excludeDocId) return { found: true, field: 'Unique Text ID (slug)' };
        }
    }
    return { found: false, field: null };
}

// --- Notification Helper ---
// UPDATED: New functionUrl
async function sendNotification(title, body, imageUrl = '', url = '', msgElement) {
    const payload = { data: { title, body, imageUrl, url } };
    try {
        const functionUrl = 'https://best-movies-worker.ajunaisaac-ug.workers.dev';
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok) {
            // Let the calling function handle the success message
            return true;
        } else {
            displayMessage(msgElement, `Content saved, but notification failed: ${result.error || 'Unknown error'}`, 'warn');
            return false;
        }
    } catch (error) {
        displayMessage(msgElement, `Content saved, but notification failed: ${error.message}`, 'error');
        return false;
    }
}

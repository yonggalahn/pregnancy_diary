import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxnHZ727WMbnnCmhlarExFYo19jdHWf4c",
  authDomain: "pregnancy-diary-28619.firebaseapp.com",
  projectId: "pregnancy-diary-28619",
  storageBucket: "pregnancy-diary-28619.appspot.com",
  messagingSenderId: "421865091093",
  appId: "1:421865091093:web:25ba0ce02ef0fc2f82de1c",
  measurementId: "G-65B2WNKFXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const contentContainer = document.getElementById('archive-content');
const tabs = document.querySelectorAll('.tab-button');
let allDiariesCache = []; // Cache all diaries to avoid re-fetching

// --- Modal Logic (copied from gallery.js) ---
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalCaption = document.getElementById('modal-caption');
const closeModal = document.getElementsByClassName('close-modal')[0];

function openModal(imageSrc, captionText) {
    modal.style.display = "block";
    modalImage.src = imageSrc;
    modalCaption.innerHTML = captionText;
}

closeModal.onclick = () => { modal.style.display = "none"; }
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// --- Content Loading Logic ---
async function fetchAllDiaries() {
    if (allDiariesCache.length > 0) {
        return allDiariesCache;
    }
    contentContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const q = query(collection(db, "diaries"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        allDiariesCache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return allDiariesCache;
    } catch (error) {
        console.error("Error fetching all diaries:", error);
        contentContainer.innerHTML = '<p style="color:red;">글을 불러오는 데 실패했습니다.</p>';
        return [];
    } finally {
        // Ensure loading spinner is removed even on error
        const loadingSpinner = contentContainer.querySelector('.loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }
    }
}

function renderAllEntries(entries) {
    contentContainer.innerHTML = '';
    if (entries.length === 0) {
        contentContainer.innerHTML = '<p>표시할 내용이 없습니다.</p>';
        return;
    }
    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'latest-diary-card'; // Reuse style
        const person = entry.person || entry.id.split('-')[0];
        const date = entry.date || entry.id.substring(entry.id.indexOf('-') + 1);
        const title = entry.type === 'letter' ? `💌 편지: ${date}` : `📝 일기: ${date}`;
        card.innerHTML = `
            <h3>${title} (${person})</h3>
            <p>${entry.text}</p>
            <a href="diary.html?person=${person}&date=${date}">수정하기</a>
        `;
        contentContainer.appendChild(card);
    });
}

function renderLetters(entries) {
    const letters = entries.filter(e => e.type === 'letter');
    renderAllEntries(letters);
}

function renderGallery(entries) {
    contentContainer.innerHTML = '';
    const images = entries.filter(e => e.image && e.image.startsWith('data:image'));

    if (images.length === 0) {
        contentContainer.innerHTML = '<p>갤러리에 사진이 없습니다.</p>';
        return;
    }

    const galleryGrid = document.createElement('div');
    galleryGrid.className = 'gallery-grid-container';
    images.forEach(entry => { // Changed variable name from 'image' to 'entry' for clarity
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${entry.image}" alt="Diary image from ${entry.date}">`;
        item.onclick = () => {
            const person = entry.person || entry.id.split('-')[0];
            const date = entry.date || entry.id.substring(entry.id.indexOf('-') + 1);
            const caption = `<p>${date} by ${person}</p><a href="diary.html?person=${person}&date=${date}">일기 보러가기</a>`;
            openModal(entry.image, caption); // Use entry.image here
        };
        galleryGrid.appendChild(item);
    });
    contentContainer.appendChild(galleryGrid);
}


// --- Tab Switching Logic ---
async function handleTabClick(e) {
    tabs.forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
    
    const tabType = e.target.dataset.tab;
    const allEntries = await fetchAllDiaries();

    switch(tabType) {
        case 'all':
            renderAllEntries(allEntries);
            break;
        case 'letters':
            renderLetters(allEntries);
            break;
        case 'gallery':
            renderGallery(allEntries);
            break;
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('archive.html')) {
        tabs.forEach(tab => tab.addEventListener('click', handleTabClick));
        // Load default tab content
        fetchAllDiaries().then(renderAllEntries);
    }
});

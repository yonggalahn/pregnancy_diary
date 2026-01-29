import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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
let allDiariesCache = []; // Cache all diaries to avoid re-fetching

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

function renderEntries(entries) {
    contentContainer.innerHTML = '';
    const filteredEntries = entries.filter(entry => entry.type === 'diary' || entry.type === 'letter'); // Only show diaries and letters

    if (filteredEntries.length === 0) {
        contentContainer.innerHTML = '<p>표시할 일기가 없습니다.</p>';
        return;
    }
    filteredEntries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'latest-diary-card'; // Reuse style
        const person = entry.person || entry.id.split('-')[0];
        const date = entry.date || entry.id.substring(entry.id.indexOf('-') + 1);
        const title = entry.type === 'letter' ? `💌 ${date} 따수니에게` : `📝 ${date} 일기`;
        card.innerHTML = `
            <h3>${title}</h3>
            <p>작성자: ${person}</p>
            <p>${entry.text}</p>
            <a href="diary.html?person=${person}&date=${date}">내용 보기/수정</a>
        `;
        contentContainer.appendChild(card);
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('archive.html')) {
        fetchAllDiaries().then(renderEntries);
    }
});

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
    console.log("fetchAllDiaries called.");
    if (allDiariesCache.length > 0) {
        console.log("Returning diaries from cache:", allDiariesCache.length);
        return allDiariesCache;
    }
    contentContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        console.log("Fetching diaries from Firestore...");
        const q = query(collection(db, "diaries"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        console.log("Firestore querySnapshot docs length:", querySnapshot.docs.length);
        allDiariesCache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("allDiariesCache populated. Length:", allDiariesCache.length, "First entry:", allDiariesCache[0]);
        return allDiariesCache;
    } catch (error) {
        console.error("Error fetching all diaries from Firestore:", error);
        contentContainer.innerHTML = '<p style="color:red;">글을 불러오는 데 실패했습니다.</p>';
        return [];
    } finally {
        const loadingSpinner = contentContainer.querySelector('.loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }
    }
}

function renderEntries(entries) {
    console.log("renderEntries called with", entries.length, "entries.");
    contentContainer.innerHTML = '';
    const filteredEntries = entries.filter(entry => entry.type === 'diary' || entry.type === 'letter');
    console.log("Filtered entries length (diary/letter only):", filteredEntries.length, "First filtered entry:", filteredEntries[0]);

    if (filteredEntries.length === 0) {
        contentContainer.innerHTML = '<p>표시할 일기가 없습니다.</p>';
        return;
    }
    filteredEntries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'latest-diary-card';
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
    console.log("Entries rendered.");
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired on archive.html check:", window.location.pathname.includes('archive.html'));
    if (window.location.pathname.includes('archive.html')) {
        fetchAllDiaries().then(renderEntries).catch(error => {
            console.error("Error during archive initialization:", error);
            contentContainer.innerHTML = '<p style="color:red;">모아보기 페이지 초기화 중 오류가 발생했습니다.</p>';
        });
    }
});

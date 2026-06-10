import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { db } from './firebase.js';

const contentContainer = document.getElementById('archive-content');
let allDiariesCache = [];

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
        console.error("Error fetching diaries:", error);
        contentContainer.innerHTML = '<p class="error-message">글을 불러오는 데 실패했습니다. 다시 시도해주세요.</p>';
        return [];
    }
}

function renderEntries(entries) {
    contentContainer.innerHTML = ''; 
    const filteredEntries = entries.filter(entry => entry.type === 'diary' || entry.type === 'letter');

    if (filteredEntries.length === 0) {
        contentContainer.innerHTML = '<p>아직 작성된 일기가 없습니다.</p>';
        return;
    }

    filteredEntries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'latest-diary-card archive-card'; 

        const personName = entry.person === 'mikael' ? '미카엘' : '아가다';
        const title = entry.type === 'letter' 
            ? `💌 ${entry.date} (아깡이에게)` 
            : `📝 ${entry.date} 일기`;

        // Sanitize text to prevent HTML injection if necessary
        const textSnippet = entry.text.substring(0, 200) + (entry.text.length > 200 ? '...' : '');

        card.innerHTML = `
            <h3>${title}</h3>
            <p class="author-tag">작성자: ${personName}</p>
            <p class="diary-text">${textSnippet.replace(/\n/g, '<br>')}</p>
            <a href="diary.html?person=${entry.person}&date=${entry.date}" class="view-button">내용 보기/수정</a>
        `;
        contentContainer.appendChild(card);
    });
}

async function initArchive() {
    const diaries = await fetchAllDiaries();
    renderEntries(diaries);
}


document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('archive.html')) {
        initArchive().catch(error => {
            console.error("Archive initialization failed:", error);
            contentContainer.innerHTML = '<p class="error-message">페이지 초기화 중 오류가 발생했습니다.</p>';
        });
    }
});

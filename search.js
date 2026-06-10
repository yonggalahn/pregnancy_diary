import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { db } from './firebase.js';

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResultsContainer = document.getElementById('search-results');
const searchInfo = document.getElementById('search-info');

let allDiariesCache = []; // Caching results to improve client-side filtering

async function fetchAndCacheDiaries() {
    if (allDiariesCache.length > 0) return true;
    searchInfo.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const q = query(collection(db, "diaries"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        allDiariesCache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        searchInfo.textContent = '일기 로딩 완료! 검색어를 입력해주세요.';
        return true;
    } catch (error) {
        console.error("Error fetching all diaries:", error);
        searchInfo.innerHTML = '<p class="error-message">전체 일기를 불러오는 데 실패했습니다.</p>';
        return false;
    }
}

function highlight(text, term) {
    if (!text || !term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        searchResultsContainer.innerHTML = '<p>검색어를 입력해주세요.</p>';
        searchInfo.textContent = '';
        return;
    }

    const results = allDiariesCache.filter(diary => 
        (diary.text && diary.text.toLowerCase().includes(searchTerm)) ||
        (diary.date && diary.date.includes(searchTerm))
    );

    searchInfo.textContent = `총 ${results.length}개의 검색 결과가 있습니다.`;

    if (results.length === 0) {
        searchResultsContainer.innerHTML = `<p>"${searchInput.value}"에 대한 검색 결과가 없습니다.</p>`;
        return;
    }

    searchResultsContainer.innerHTML = '';
    results.forEach(result => {
        const resultCard = document.createElement('div');
        resultCard.className = 'latest-diary-card search-result-card';
        
        const personName = result.person === 'mikael' ? '미카엘' : '아가다';
        const title = `📝 ${result.date} (작성자: ${personName})`;
        const snippet = result.text.substring(0, 250) + (result.text.length > 250 ? '...' : '');
        const highlightedSnippet = highlight(snippet, searchTerm);

        resultCard.innerHTML = `
            <h3>${title}</h3>
            <p class="diary-text">${highlightedSnippet.replace(/\n/g, '<br>')}</p>
            <a href="diary.html?person=${result.person}&date=${result.date}" class="view-button">일기 전문 보기</a>
        `;
        searchResultsContainer.appendChild(resultCard);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('search')) {
        fetchAndCacheDiaries();

        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResultsContainer = document.getElementById('search-results');

let allDiaries = []; // Cache for all diary entries

// Function to fetch all diary entries and cache them
async function fetchAllDiaries() {
    searchResultsContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const querySnapshot = await getDocs(collection(db, "diaries"));
        allDiaries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        searchResultsContainer.innerHTML = '<p>검색어를 입력하고 검색 버튼을 눌러주세요.</p>';
    } catch (error) {
        console.error("Error fetching all diaries:", error);
        searchResultsContainer.innerHTML = '<p style="color:red;">일기 전체를 불러오는 데 실패했습니다.</p>';
    }
}

// Function to perform search and display results
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        searchResultsContainer.innerHTML = '<p>검색어를 입력해주세요.</p>';
        return;
    }

    const results = allDiaries.filter(diary => 
        diary.text && diary.text.toLowerCase().includes(searchTerm)
    );

    if (results.length === 0) {
        searchResultsContainer.innerHTML = `<p>"${searchInput.value}"에 대한 검색 결과가 없습니다.</p>`;
        return;
    }

    searchResultsContainer.innerHTML = '';
    results.forEach(result => {
        const resultCard = document.createElement('div');
        resultCard.className = 'latest-diary-card'; // Reuse existing style
        
        const snippet = result.text.substring(0, 150) + (result.text.length > 150 ? '...' : '');
        const person = result.person || result.id.split('-')[0];
        const date = result.date || result.id.substring(result.id.indexOf('-') + 1);

        resultCard.innerHTML = `
            <h3>${date} (${person})</h3>
            <p>${snippet}</p>
            <a href="diary.html?person=${person}&date=${date}">일기 전문 보기</a>
        `;
        searchResultsContainer.appendChild(resultCard);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('search.html')) {
        fetchAllDiaries(); // Fetch all diaries on page load
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
});

import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { db } from './firebase.js';

const lettersList = document.getElementById('letters-list');

async function displayLetters() {
    if (!lettersList) return;
    lettersList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        // Query the main 'diaries' collection for documents of type 'letter'
        const q = query(
            collection(db, "diaries"), 
            where("type", "==", "letter"), 
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            lettersList.innerHTML = '<p>아직 따수니에게 도착한 편지가 없습니다. 일기 페이지에서 편지를 작성해보세요!</p>';
            return;
        }

        lettersList.innerHTML = ''; // Clear loading message

        querySnapshot.forEach((doc) => {
            const letter = doc.data();
            const personName = letter.person === 'mikael' ? '미카엘' : '아가다';
            const letterCard = document.createElement('div');
            letterCard.className = 'letter-card';
            
            letterCard.innerHTML = `
                <div class="letter-header">
                    <span class="letter-date">${letter.date}</span>
                    <span class="letter-author">From. ${personName}</span>
                </div>
                <div class="letter-content-display">${letter.text.replace(/\n/g, '<br>')}</div>
            `;
            lettersList.appendChild(letterCard);
        });

    } catch (error) {
        console.error("Error fetching letters:", error);
        lettersList.innerHTML = '<p class="error-message">편지를 불러오는 데 실패했습니다.</p>';
    }
}

// Initialize letter display on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('ttasuni_letterbox.html')) {
        displayLetters();
    }
});

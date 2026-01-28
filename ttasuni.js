import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { auth } from './auth.js'; // Import auth object

// Your web app's Firebase configuration (duplicate from main.js and auth.js, but necessary for standalone script)
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

const lettersCollection = collection(db, "ttasuni_letters");

// Function to save a new letter
async function saveLetter() {
    const letterContent = document.getElementById('letter-content').value;
    const saveFeedback = document.getElementById('save-feedback');

    if (!auth.currentUser) {
        saveFeedback.textContent = '로그인이 필요합니다.';
        saveFeedback.style.color = 'red';
        return;
    }
    if (!letterContent.trim()) {
        saveFeedback.textContent = '편지 내용을 입력해주세요.';
        saveFeedback.style.color = 'orange';
        return;
    }

    try {
        await addDoc(lettersCollection, {
            content: letterContent,
            author: auth.currentUser.email,
            timestamp: serverTimestamp()
        });
        document.getElementById('letter-content').value = ''; // Clear textarea
        saveFeedback.textContent = '편지가 성공적으로 저장되었습니다!';
        saveFeedback.style.color = '#4CAF50';
        displayLetters(); // Refresh the list
    } catch (error) {
        console.error("Error saving letter:", error);
        saveFeedback.textContent = '편지 저장에 실패했습니다.';
        saveFeedback.style.color = 'red';
    }
}

// Function to display all letters
async function displayLetters() {
    const lettersList = document.getElementById('letters-list');
    lettersList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = query(lettersCollection, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            lettersList.innerHTML = '<p>아직 따수니에게 도착한 편지가 없습니다.</p>';
            return;
        }

        lettersList.innerHTML = ''; // Clear loading message

        querySnapshot.forEach((doc) => {
            const letter = doc.data();
            const date = letter.timestamp ? new Date(letter.timestamp.toDate()).toLocaleString() : '날짜 미상';
            lettersList.innerHTML += `
                <div class="letter-card">
                    <p class="letter-author">${letter.author} (${date})</p>
                    <p class="letter-content-display">${letter.content}</p>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error fetching letters:", error);
        lettersList.innerHTML = '<p style="color:red;">편지를 불러오는데 실패했습니다.</p>';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Only proceed if we are on the ttasuni_letterbox.html page
    if (window.location.pathname.includes('ttasuni_letterbox.html')) {
        const saveLetterButton = document.getElementById('save-letter-button');
        if (saveLetterButton) {
            saveLetterButton.addEventListener('click', saveLetter);
        }
        displayLetters(); // Load existing letters when page loads
    }
});

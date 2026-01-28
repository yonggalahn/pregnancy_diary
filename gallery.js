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

const galleryGrid = document.getElementById('gallery-grid');
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalCaption = document.getElementById('modal-caption');
const closeModal = document.getElementsByClassName('close-modal')[0];

// Function to open modal
function openModal(imageSrc, captionText) {
    modal.style.display = "block";
    modalImage.src = imageSrc;
    modalCaption.innerHTML = captionText;
}

// Function to close modal
closeModal.onclick = function() {
    modal.style.display = "none";
}
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Function to display all images in the gallery
async function displayGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = query(collection(db, "diaries"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        const images = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.image && data.image.startsWith('data:image')) {
                images.push({
                    src: data.image,
                    date: data.date,
                    person: data.person,
                    text: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : '')
                });
            }
        });

        if (images.length === 0) {
            galleryGrid.innerHTML = '<p>아직 갤러리에 사진이 없습니다. 일기에 사진을 추가해보세요!</p>';
            return;
        }

        galleryGrid.innerHTML = ''; // Clear spinner

        images.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.innerHTML = `<img src="${image.src}" alt="Diary image from ${image.date}">`;
            galleryItem.onclick = () => {
                const caption = `
                    <p>${image.date} by ${image.person}</p>
                    <p>${image.text}</p>
                    <a href="diary.html?person=${image.person}&date=${image.date}">일기 보러가기</a>`;
                openModal(image.src, caption);
            };
            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error("Error fetching images for gallery:", error);
        galleryGrid.innerHTML = '<p style="color:red;">갤러리를 불러오는 데 실패했습니다.</p>';
    }
}

// Initialize gallery
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('gallery.html')) {
        displayGallery();
    }
});

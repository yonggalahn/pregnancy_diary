import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { db } from './firebase.js';

const galleryGrid = document.getElementById('gallery-grid');
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalCaption = document.getElementById('modal-caption');
const closeModal = document.getElementsByClassName('close-modal')[0];

function openModal(imageSrc, captionText) {
    modal.style.display = "block";
    modalImage.src = imageSrc;
    modalCaption.innerHTML = captionText;
}

if (closeModal) {
    closeModal.onclick = () => modal.style.display = "none";
}
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

async function displayGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = query(collection(db, "diaries"));
        const querySnapshot = await getDocs(q);

        galleryGrid.innerHTML = ''; // Clear spinner

        const entries = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const id = doc.id;
            const parts = id.split('-');
            const inferredPerson = parts[0] || 'mikael';
            const inferredDate = parts.slice(1).join('-') || '2026-01-01';
            return {
                id: id,
                text: data.text || '',
                person: data.person || inferredPerson,
                date: data.date || inferredDate,
                type: data.type || 'diary',
                image: data.image || ''
            };
        });

        // Filter documents that have a non-empty image field
        const documentsWithImages = entries.filter(entry => entry.image && entry.image !== "");

        if (documentsWithImages.length === 0) {
            galleryGrid.innerHTML = '<p>아직 갤러리에 사진이 없습니다. 일기에 사진을 추가해보세요!</p>';
            return;
        }

        // Sort client-side by date desc
        documentsWithImages.sort((a, b) => b.date.localeCompare(a.date));

        documentsWithImages.forEach(entry => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = entry.image;
            img.alt = `Diary image from ${entry.date}`;
            galleryItem.appendChild(img);

            galleryItem.onclick = () => {
                const personName = entry.person === 'mikael' ? '미카엘' : '아가다';
                const caption = `
                    <p>${entry.date} (작성자: ${personName})</p>
                    <p>${entry.text.substring(0, 150)}...</p>
                    <a href="diary.html?person=${entry.person}&date=${entry.date}" class="view-button">일기 보러가기</a>`;
                openModal(entry.image, caption);
            };
            galleryGrid.appendChild(galleryItem);
        });

    } catch (error) {
        console.error("Error fetching gallery images:", error);
        galleryGrid.innerHTML = '<p class="error-message">갤러리를 불러오는 데 실패했습니다.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('gallery')) {
        displayGallery();
    }
});

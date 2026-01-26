import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('diary')) {
    const urlParams = new URLSearchParams(window.location.search);
    const person = urlParams.get('person');
    let date = urlParams.get('date');

    const diaryTitle = document.getElementById('diary-title');
    const diaryDate = document.getElementById('diary-date');
    const diaryEntry = document.getElementById('diary-entry');
    const diaryText = document.getElementById('diary-text');
    const saveButton = document.getElementById('save-button');
    const diaryImage = document.getElementById('diary-image');
    const imageInput = document.getElementById('image-input');

    if (person === 'mikael') {
      diaryTitle.textContent = "미카엘의 일기";
    } else if (person === 'agatha') {
      diaryTitle.textContent = "아가다의 일기";
    }

    const fp = flatpickr("#calendar-container", {
      inline: true,
      defaultDate: date || new Date(),
      onChange: function(selectedDates, dateStr, instance) {
        date = dateStr;
        window.history.pushState({}, '', `?person=${person}&date=${date}`);
        showDiaryEntry(date);
      }
    });

    function showDiaryEntry(selectedDate) {
      diaryDate.textContent = selectedDate;
      diaryEntry.style.display = 'block';
      loadDiaryEntry(selectedDate);
    }

    async function loadDiaryEntry(selectedDate) {
      const key = `${person}-${selectedDate}`;
      const docRef = doc(db, "diaries", key);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const entry = docSnap.data();
        diaryText.value = entry.text || '';
        if (entry.image) {
          diaryImage.src = entry.image;
          diaryImage.style.display = 'block';
        } else {
          diaryImage.style.display = 'none';
        }
      } else {
        // No document found, clear the form
        diaryText.value = '';
        diaryImage.src = '';
        diaryImage.style.display = 'none';
      }
      imageInput.value = ''; // Reset file input
    }

    saveButton.addEventListener('click', async () => {
      if (date) {
        const key = `${person}-${date}`;
        const file = imageInput.files[0];
        const docRef = doc(db, "diaries", key);

        const showSaveFeedback = () => {
            const originalText = saveButton.textContent;
            saveButton.textContent = '저장됨!';
            saveButton.disabled = true;
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            }, 2000);
        };

        const saveEntry = async (entryData) => {
            await setDoc(docRef, entryData);
            showSaveFeedback();
        };

        if (file) {
          // Compress and then save
          const reader = new FileReader();
          reader.onload = function(e) {
              const img = new Image();
              img.onload = function() {
                  const canvas = document.createElement('canvas');
                  const maxWidth = 800;
                  const maxHeight = 800;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > maxWidth) {
                          height *= maxWidth / width;
                          width = maxWidth;
                      }
                  } else {
                      if (height > maxHeight) {
                          width *= maxHeight / height;
                          height = maxHeight;
                      }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);
                  
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                  const entry = {
                      person: person,
                      date: date,
                      text: diaryText.value,
                      image: compressedDataUrl
                  };
                  saveEntry(entry);
              }
              img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        } else {
          // Save text and any existing image
          const docSnap = await getDoc(docRef);
          let existingImage = '';
          if (docSnap.exists() && docSnap.data().image) {
            existingImage = docSnap.data().image;
          }
          
          const entry = {
              person: person,
              date: date,
              text: diaryText.value,
              image: existingImage
          };
          
          if (!entry.image && diaryImage.src.startsWith('data:image')) {
            entry.image = diaryImage.src;
          }

          saveEntry(entry);
        }
      }
    });

    if (!date) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
        window.history.pushState({}, '', `?person=${person}&date=${date}`);
    }
    showDiaryEntry(date);
  }
});
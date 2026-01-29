import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { auth, db, storage } from './firebase.js';

const profilePicInput = document.getElementById('profile-pic-input');
const uploadButton = document.getElementById('upload-profile-pic-button');
const statusEl = document.getElementById('upload-status');
const currentProfilePic = document.getElementById('current-profile-pic');
const dueDateInput = document.getElementById('due-date-input');
const saveDueDateButton = document.getElementById('save-due-date-button');

// --- UTILITY FUNCTIONS ---

const showFeedback = (element, message, color = 'green', duration = 3000) => {
    const originalText = element.textContent;
    const originalColor = element.style.color;
    element.textContent = message;
    element.style.color = color;
    setTimeout(() => {
        element.textContent = '';
        element.style.color = originalColor;
    }, duration);
};

const showSaveFeedback = (button, message = '저장됨!') => {
    const originalText = button.textContent;
    button.textContent = message;
    button.disabled = true;
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 2000);
};

// --- CORE FUNCTIONS ---

async function loadUserProfile(person) {
    if (!person) return;
    const docRef = doc(db, "profiles", person);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentProfilePic.src = data.profilePicUrl || `image/${person}.jpg`;
            if (data.dueDate) {
                dueDateInput.value = data.dueDate;
            }
        } else {
            currentProfilePic.src = `image/${person}.jpg`; // Default if no profile
        }
    } catch(error) {
        console.error("Error loading user profile:", error);
        statusEl.textContent = "프로필 로딩 중 오류 발생";
    }
}

async function uploadProfilePicture(person, file) {
    if (!file) {
        showFeedback(statusEl, '먼저 파일을 선택해주세요.', 'orange');
        return;
    }

    showFeedback(statusEl, '업로드 중...', 'black', 10000); // Persistent message while uploading

    // Image compression and resizing
    const resizedImageBlob = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 500;
                let { width, height } = img;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width; width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height; height = MAX_SIZE;
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    const storageRef = ref(storage, `profile_pictures/${person}/${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, resizedImageBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await setDoc(doc(db, "profiles", person), { profilePicUrl: downloadURL }, { merge: true });
        
        showFeedback(statusEl, '프로필 사진이 성공적으로 변경되었습니다!');
        currentProfilePic.src = downloadURL;
        profilePicInput.value = ''; // Clear the input
    } catch (error) {
        console.error("Upload failed:", error);
        showFeedback(statusEl, '업로드에 실패했습니다.', 'red');
    }
}

async function saveDueDate(person) {
    const dueDate = dueDateInput.value;
    if (!dueDate) {
        showFeedback(saveDueDateButton, '예정일을 선택해주세요', 'orange');
        return;
    }

    try {
        await setDoc(doc(db, "profiles", person), { dueDate }, { merge: true });
        showSaveFeedback(saveDueDateButton);
    } catch (error) {
        console.error("Error saving due date:", error);
        showFeedback(saveDueDateButton, '저장 실패', 'red');
    }
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    // Determine the person from URL, default based on a typical user email if not present.
    // This part is a fallback and might need adjustment based on your user structure.
    const personFromUrl = urlParams.get('person');

    onAuthStateChanged(auth, user => {
        if (user) {
            // Use person from URL if available, otherwise determine from email.
            const person = personFromUrl || (user.email.includes('mikael') ? 'mikael' : 'agatha');
            
            // Redirect if person cannot be determined
            if (!person) {
                window.location.href = 'index.html';
                return;
            }
            
            // Ensure the URL is correct if it was inferred
            if (!personFromUrl) {
                const newUrl = `profile.html?person=${person}`;
                window.history.replaceState({path: newUrl}, '', newUrl);
            }
            
            loadUserProfile(person);

            uploadButton.addEventListener('click', () => {
                const file = profilePicInput.files[0];
                uploadProfilePicture(person, file);
            });
            saveDueDateButton.addEventListener('click', () => saveDueDate(person));

            // Enable controls
            [profilePicInput, uploadButton, dueDateInput, saveDueDateButton].forEach(el => el.disabled = false);
            
        } else {
            // User not logged in, redirect to login page
            window.location.href = 'login.html';
        }
    });
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";
import { auth } from './auth.js';

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
const storage = getStorage(app);

const profilePicInput = document.getElementById('profile-pic-input');
const uploadButton = document.getElementById('upload-profile-pic-button');
const statusEl = document.getElementById('upload-status');
const currentProfilePic = document.getElementById('current-profile-pic');

const dueDateInput = document.getElementById('due-date-input');
const saveDueDateButton = document.getElementById('save-due-date-button');
const dueDateStatusEl = document.getElementById('due-date-status');

// Load current profile picture and due date
async function loadUserProfile(user) {
    if (!user) return;
    const person = user.email.includes('mikael') ? 'mikael' : 'agatha';
    const docRef = doc(db, "profiles", person);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Load profile picture
            if (data.profilePicUrl) {
                currentProfilePic.src = data.profilePicUrl;
            } else {
                currentProfilePic.src = `image/${person}.jpg`;
            }
            // Load due date
            if (data.dueDate) {
                dueDateInput.value = data.dueDate;
            }
        } else {
            currentProfilePic.src = `image/${person}.jpg`;
        }
    } catch(error) {
        console.error("Error loading user profile:", error);
    }
}

// Upload new profile picture
async function uploadProfilePicture(user) {
    if (!user) return;
    const file = profilePicInput.files[0];
    if (!file) {
        statusEl.textContent = '먼저 파일을 선택해주세요.';
        return;
    }

    const person = user.email.includes('mikael') ? 'mikael' : 'agatha';
    statusEl.textContent = '업로드 중...';
    const storageRef = ref(storage, `profile_pictures/${person}/${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const docRef = doc(db, "profiles", person);
        await setDoc(docRef, { profilePicUrl: downloadURL }, { merge: true });

        statusEl.textContent = '프로필 사진이 성공적으로 변경되었습니다!';
        statusEl.style.color = 'green';
        currentProfilePic.src = downloadURL;

    } catch (error) {
        console.error("Upload failed:", error);
        statusEl.textContent = '업로드에 실패했습니다.';
        statusEl.style.color = 'red';
    }
}

// Save due date
async function saveDueDate(user) {
    if (!user) return;
    const dueDate = dueDateInput.value;
    if (!dueDate) {
        dueDateStatusEl.textContent = '예정일을 선택해주세요.';
        dueDateStatusEl.style.color = 'red';
        return;
    }

    const person = user.email.includes('mikael') ? 'mikael' : 'agatha';
    const docRef = doc(db, "profiles", person);

    try {
        await setDoc(docRef, { dueDate: dueDate }, { merge: true });
        dueDateStatusEl.textContent = '예정일이 성공적으로 저장되었습니다!';
        dueDateStatusEl.style.color = 'green';
    } catch (error) {
        console.error("Error saving due date:", error);
        dueDateStatusEl.textContent = '예정일 저장에 실패했습니다.';
        dueDateStatusEl.style.color = 'red';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            if (window.location.pathname.includes('profile.html')) {
                loadUserProfile(user);
                uploadButton.addEventListener('click', () => uploadProfilePicture(user));
                saveDueDateButton.addEventListener('click', () => saveDueDate(user));

                uploadButton.disabled = false;
                profilePicInput.disabled = false;
                saveDueDateButton.disabled = false;
                dueDateInput.disabled = false;
            }
        } else {
            if (window.location.pathname.includes('profile.html')) {
                // User is not logged in, disable all functionality
                uploadButton.disabled = true;
                profilePicInput.disabled = true;
                saveDueDateButton.disabled = true;
                dueDateInput.disabled = true;
                
                statusEl.textContent = '로그인하여 프로필을 변경해주세요.';
                statusEl.style.color = 'red';
                dueDateStatusEl.textContent = '로그인하여 예정일을 설정해주세요.';
                dueDateStatusEl.style.color = 'red';
            }
        }
    });
});

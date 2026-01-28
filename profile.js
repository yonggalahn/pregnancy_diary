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

// Load current profile picture
async function loadProfilePicture(user) {
    if (!user) return;
    const person = user.email.includes('mikael') ? 'mikael' : 'agatha';
    const docRef = doc(db, "profiles", person);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().profilePicUrl) {
            currentProfilePic.src = docSnap.data().profilePicUrl;
        } else {
            currentProfilePic.src = `image/${person}.jpg`;
        }
    } catch(error) {
        console.error("Error loading profile picture:", error);
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
        await setDoc(docRef, { profilePicUrl: downloadURL });

        statusEl.textContent = '프로필 사진이 성공적으로 변경되었습니다!';
        statusEl.style.color = 'green';
        currentProfilePic.src = downloadURL;

    } catch (error) {
        console.error("Upload failed:", error);
        statusEl.textContent = '업로드에 실패했습니다.';
        statusEl.style.color = 'red';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            if (window.location.pathname.includes('profile.html')) {
                loadProfilePicture(user);
                uploadButton.addEventListener('click', () => uploadProfilePicture(user));
            }
        }
    });
});

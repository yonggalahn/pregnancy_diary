// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Your web app's Firebase configuration
// This should be replaced with your actual configuration
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
const auth = getAuth(app);

// Function to sign in users
const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Function to sign out users
const logout = () => {
  return signOut(auth);
};

// Function to check the current authentication state
const monitorAuthState = (onUserLoggedIn, onUserLoggedOut) => {
  onAuthStateChanged(auth, user => {
    if (user) {
      // User is signed in
      console.log("User is logged in:", user);
      if (onUserLoggedIn) onUserLoggedIn(user);
    } else {
      // User is signed out
      console.log("User is logged out");
      if (onUserLoggedOut) onUserLoggedOut();
    }
  });
};

// Export the functions to be used in other scripts
export { auth, login, logout, monitorAuthState };

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { auth } from './firebase.js'; // Import auth from the new firebase.js

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

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, documentId, startAt, endAt } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { monitorAuthState, logout, auth } from './auth.js';

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

// --- UTILITY FUNCTIONS ---

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function getDueDate(user) {
    let dueDate = "2026-10-03"; // Default due date
    if (user) {
        const person = user.email.includes('mikael') ? 'mikael' : 'agatha';
        const docRef = doc(db, "profiles", person);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().dueDate) {
                dueDate = docSnap.data().dueDate;
            }
        } catch (error) {
            console.error("Error fetching due date from profile:", error);
        }
    }
    return dueDate;
}

function setDiaryPageEditability(canEdit) {
    const diaryText = document.getElementById('diary-text');
    const imageInput = document.getElementById('image-input');
    const typeDiary = document.getElementById('type-diary');
    const typeLetter = document.getElementById('type-letter');
    const saveButton = document.getElementById('save-button');

    if (diaryText) diaryText.disabled = !canEdit;
    if (imageInput) imageInput.disabled = !canEdit;
    if (typeDiary) typeDiary.disabled = !canEdit;
    if (typeLetter) typeLetter.disabled = !canEdit;
    if (saveButton) saveButton.disabled = !canEdit; // Ensure save button is also controlled here
}


// --- FEATURE FUNCTIONS ---

// Function to calculate D-Day
function calculateDDay(dueDateStr) {
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeDiff = dueDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff > 0) return `D-${daysDiff} 👶`;
  if (daysDiff < 0) return `D+${Math.abs(daysDiff)} 🎉`;
  return `D-Day! 오늘 만나요! ❤️`;
}

// Function to calculate pregnancy week and day
function calculatePregnancyWeek(dueDateStr) {
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  const startDate = new Date(dueDate.getTime() - (40 * 7 * 24 * 60 * 60 * 1000));
  const timeDiff = today.getTime() - startDate.getTime();
  const daysPassed = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
  const currentWeek = Math.floor(daysPassed / 7) + 1;
  const currentDay = daysPassed % 7;
  return { week: currentWeek, day: currentDay };
}

// Function to fetch and display weekly pregnancy info
async function displayWeeklyInfo(user) {
    const weeklyInfoContent = document.getElementById('weekly-info-content');
    if (!weeklyInfoContent) return;
    weeklyInfoContent.innerHTML = '<div class="loading-spinner"></div>';

    const dueDate = await getDueDate(user);
    const { week, day } = calculatePregnancyWeek(dueDate);

    try {
        const response = await fetch('./pregnancy_data.json');
        const data = await response.json();
        const weekData = data.weeks.find(item => item.week === week) || data.default;

        document.getElementById('weekly-info-title').textContent = `${week}주차: ${weekData.title}`;
        document.getElementById('weekly-info-week').textContent = `(오늘은 ${week}주 ${day}일째 되는 날입니다.)`;

        weeklyInfoContent.innerHTML = `
            <h3>${weekData.baby_title}</h3><p>${weekData.baby_content}</p>
            <h3>${weekData.mom_title}</h3><p>${weekData.mom_content}</p>`;
    } catch (error) {
        console.error("Error fetching weekly info:", error);
        weeklyInfoContent.parentElement.innerHTML = '<p>주차별 정보를 불러오는 데 실패했습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.</p>';
    }
}

// Function to render the main calendar with highlighted diary entries
async function renderMainCalendar() {
  const mainCalendarContainer = document.getElementById('main-calendar-container');
  if (!mainCalendarContainer) return;
  mainCalendarContainer.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const querySnapshot = await getDocs(collection(db, "diaries"));
    const diaryDates = querySnapshot.docs.map(doc => doc.id.split('-').slice(1).join('-'));
    
    mainCalendarContainer.innerHTML = ''; 
    flatpickr(mainCalendarContainer, {
      inline: true,
      enable: diaryDates,
      onDayCreate: (dObj, dStr, fp, dayElem) => {
        if (diaryDates.includes(dStr)) {
          dayElem.classList.add('has-diary-entry');
          dayElem.innerHTML += '<span class="entry-indicator">❤️</span>';
        }
      }
    });
  } catch(error) {
    console.error("Error rendering main calendar:", error);
    mainCalendarContainer.innerHTML = '<p>달력 로딩에 실패했습니다.</p>';
  }
}

// Function to display latest diary entries on the main page
async function displayLatestEntries() {
  const persons = ['mikael', 'agatha'];
  for (const person of persons) {
    const latestEntryContainer = document.getElementById(`latest-${person}-entry`);
    if (!latestEntryContainer) continue;
    latestEntryContainer.innerHTML = '<div class="loading-spinner"></div>';

    const q = query(
      collection(db, "diaries"),
      orderBy(documentId(), "desc"),
      startAt(`${person}-9999-12-31`),
      endAt(`${person}-0000-01-01`),
      limit(1)
    );

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const latestDoc = querySnapshot.docs[0];
            const entry = latestDoc.data();
            const entryDate = latestDoc.id.substring(latestDoc.id.indexOf('-') + 1);
            const snippet = entry.text.substring(0, 100) + (entry.text.length > 100 ? '...' : '');

            latestEntryContainer.innerHTML = `
                <h3>${person === 'mikael' ? '미카엘' : '아가다'}의 최신 일기</h3>
                <p>${entryDate}</p>
                ${entry.image ? `<img src="${entry.image}" alt="Latest diary image" class="latest-entry-image">` : ''}
                <p>${snippet}</p>
                <a href="diary.html?person=${person}&date=${entryDate}">전체 보기</a>`;
        } else {
            latestEntryContainer.innerHTML = `
                <h3>${person === 'mikael' ? '미카엘' : '아가다'}의 최신 일기</h3>
                <p>아직 작성된 일기가 없습니다.</p>
                <a href="diary.html?person=${person}">일기 쓰러 가기</a>`;
        }
    } catch(error) {
        console.error(`Error fetching latest entry for ${person}:`, error);
        latestEntryContainer.innerHTML = '최신 일기를 불러오지 못했습니다.';
    }
  }
}

// Function to load and set profile pictures on the main page
async function loadProfilePictures() {
    const persons = ['mikael', 'agatha'];
    for (const person of persons) {
        const imgElement = document.getElementById(`${person}-pic`);
        if (imgElement) {
            const docRef = doc(db, "profiles", person);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().profilePicUrl) {
                    imgElement.src = docSnap.data().profilePicUrl;
                }
            } catch(error) {
                console.error(`Error loading profile picture for ${person}:`, error);
            }
        }
    }
}

// --- MOOD TRACKER FUNCTIONS ---
const moodsCollection = collection(db, "moods");

async function saveMood(mood, user) {
    if (!user) return;
    const todayStr = getTodayDateString();
    const docId = `${user.uid}-${todayStr}`; // Use UID for uniqueness
    
    try {
        await setDoc(doc(moodsCollection, docId), {
            uid: user.uid,
            email: user.email,
            mood: mood,
            date: todayStr
        });
        loadTodaysMood(user); // Reload to show confirmation
    } catch (error) {
        console.error("Error saving mood:", error);
    }
}

async function loadTodaysMood(user) {
    if (!user) return;
    const todayStr = getTodayDateString();
    const todaysMoodEl = document.getElementById('todays-mood');
    const moodButtonsContainer = document.getElementById('mood-buttons');

    if (!todaysMoodEl || !moodButtonsContainer) return;

    try {
        const docRef = doc(moodsCollection, `${user.uid}-${todayStr}`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const mood = docSnap.data().mood;
            todaysMoodEl.textContent = `오늘의 기분은 ${mood}로 저장되었어요!`;
            moodButtonsContainer.style.display = 'none'; // Hide buttons after selection
        } else {
            todaysMoodEl.textContent = '';
            moodButtonsContainer.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading today's mood:", error);
    }
}

// --- DIARY PAGE LOGIC ---
function setupDiaryPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const person = urlParams.get('person');
    let date = urlParams.get('date') || getTodayDateString();

    document.getElementById('diary-title').textContent = person === 'mikael' ? "미카엘의 일기" : "아가다의 일기";
    
    if (!urlParams.has('date')) {
        window.history.replaceState({}, '', `?person=${person}&date=${date}`);
    }

    // Add event listeners for entry type radio buttons
    const diaryText = document.getElementById('diary-text');
    document.getElementById('type-diary').addEventListener('change', () => {
        diaryText.placeholder = '오늘의 이야기를 기록해보세요...';
    });
    document.getElementById('type-letter').addEventListener('change', () => {
        diaryText.placeholder = '따수니에게 보내는 사랑의 메시지를 작성해주세요...';
    });


    const fp = flatpickr("#calendar-container", {
        inline: true,
        defaultDate: date,
        onChange: (selectedDates, dateStr) => {
            date = dateStr;
            window.history.pushState({}, '', `?person=${person}&date=${date}`);
            showDiaryEntry(date);
        }
    });

    const showDiaryEntry = (selectedDate) => {
        document.getElementById('diary-date').textContent = selectedDate;
        document.getElementById('diary-entry').style.display = 'block';
        loadDiaryEntry(selectedDate);
    };

    const loadDiaryEntry = async (selectedDate) => {
        const key = `${person}-${selectedDate}`;
        const docRef = doc(db, "diaries", key);
        try {
            const docSnap = await getDoc(docRef);
            const diaryImage = document.getElementById('diary-image');
            
            if (docSnap.exists()) {
                const entry = docSnap.data();
                diaryText.value = entry.text || '';
                
                // Set entry type
                if (entry.type === 'letter') {
                    document.getElementById('type-letter').checked = true;
                    diaryText.placeholder = '따수니에게 보내는 사랑의 메시지를 작성해주세요...';
                } else {
                    document.getElementById('type-diary').checked = true;
                    diaryText.placeholder = '오늘의 이야기를 기록해보세요...';
                }

                if (entry.image) {
                    diaryImage.src = entry.image;
                    diaryImage.style.display = 'block';
                } else {
                    diaryImage.style.display = 'none';
                }
            } else {
                diaryText.value = '';
                document.getElementById('type-diary').checked = true;
                diaryText.placeholder = '오늘의 이야기를 기록해보세요...';
                diaryImage.src = '';
                diaryImage.style.display = 'none';
            }
            document.getElementById('image-input').value = '';
        } catch(error) {
            console.error("Error loading diary entry:", error);
        }
    };
    
    document.getElementById('save-button').addEventListener('click', async () => {
        if (!date) return;
        
        const key = `${person}-${date}`;
        const file = document.getElementById('image-input').files[0];
        const docRef = doc(db, "diaries", key);
        const entryType = document.querySelector('input[name="entry-type"]:checked').value;
        const text = document.getElementById('diary-text').value;

        const showSaveFeedback = (btn) => {
            const originalText = btn.textContent;
            btn.textContent = '저장됨!';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        };

        const saveEntry = async (entryData) => {
            try {
                await setDoc(docRef, entryData, { merge: true });
                showSaveFeedback(document.getElementById('save-button'));
            } catch (error) {
                console.error("Error saving entry:", error);
            }
        };

        let entryData = { person, date, text, type: entryType };

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxWidth = 800, maxHeight = 800;
                    let { width, height } = img;
                    if (width > height) {
                        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                    } else {
                        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    entryData.image = compressedDataUrl;
                    saveEntry(entryData);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            const docSnap = await getDoc(docRef);
            const existingImage = (docSnap.exists() && docSnap.data().image) ? docSnap.data().image : '';
            entryData.image = existingImage;
            saveEntry(entryData);
        }
    });

    showDiaryEntry(date);
}

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const loginButtonHeader = document.getElementById('login-button-header');
    const profileButtonHeader = document.getElementById('profile-button-header');
    const logoutButtonHeader = document.getElementById('logout-button-header');

    monitorAuthState(
      (user) => {
        // User is logged in
        if (profileButtonHeader) profileButtonHeader.style.display = 'block';
        if (logoutButtonHeader) logoutButtonHeader.style.display = 'block';
        if (loginButtonHeader) loginButtonHeader.style.display = 'none';

        // Page specific initializations for authenticated users
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/pregnancy-diary/') {
            loadProfilePictures();
            const ddayCounter = document.getElementById('dday-counter');
            if (ddayCounter) {
                const dynamicDueDate = await getDueDate(user);
                ddayCounter.textContent = calculateDDay(dynamicDueDate);
            }
            await displayWeeklyInfo(user); // Pass user to displayWeeklyInfo and await it
            renderMainCalendar();
            displayLatestEntries();
            loadTodaysMood(user); // Load mood for the logged-in user

            document.querySelectorAll('.mood-button').forEach(button => {
                button.addEventListener('click', () => {
                    saveMood(button.dataset.mood, user);
                });
                button.disabled = false; // Enable mood buttons
            });
            // Show mood buttons container if it was hidden
            const moodButtonsContainer = document.getElementById('mood-buttons');
            if (moodButtonsContainer) moodButtonsContainer.style.display = 'flex';
        }

        if (window.location.pathname.includes('diary')) {
            setupDiaryPage();
            setDiaryPageEditability(true); // Enable editing for logged-in users
        }
      },
      () => {
        // User is not logged in
        if (profileButtonHeader) profileButtonHeader.style.display = 'none';
        if (logoutButtonHeader) logoutButtonHeader.style.display = 'none';
        if (loginButtonHeader) loginButtonHeader.style.display = 'block';

        // Page specific initializations for unauthenticated users
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/pregnancy-diary/') {
            loadProfilePictures(); // Still load default profile pictures
            const ddayCounter = document.getElementById('dday-counter');
            if (ddayCounter) {
                const dynamicDueDate = await getDueDate(null); // Use null for unauthenticated user
                ddayCounter.textContent = calculateDDay(dynamicDueDate);
            }
            await displayWeeklyInfo(null); // Pass null for unauthenticated user
            renderMainCalendar();
            displayLatestEntries();
            
            // Disable mood tracking for unauthenticated users
            const moodButtonsContainer = document.getElementById('mood-buttons');
            const todaysMoodEl = document.getElementById('todays-mood');
            if (moodButtonsContainer) moodButtonsContainer.style.display = 'none';
            if (todaysMoodEl) todaysMoodEl.textContent = '로그인하여 오늘의 기분을 기록해보세요!';
        }

        if (window.location.pathname.includes('diary')) {
            // Unauthenticated users can view, but not save
            setupDiaryPage();
            setDiaryPageEditability(false); // Disable editing for logged-out users
            // Optionally, add a message
            const diaryEntry = document.getElementById('diary-entry');
            if (diaryEntry && !diaryEntry.querySelector('#login-prompt')) {
                const loginPrompt = document.createElement('p');
                loginPrompt.id = 'login-prompt';
                loginPrompt.style.textAlign = 'center';
                loginPrompt.style.marginTop = '20px';
                loginPrompt.style.color = '#c62828';
                loginPrompt.textContent = '일기를 작성하려면 로그인해주세요.';
                diaryEntry.appendChild(loginPrompt);
            }
        }
        // Redirect if on a page that strictly requires login (e.g., profile.html, which is handled in profile.js)
        if (window.location.pathname.includes('profile.html')) {
             window.location.href = 'login.html';
        }
      }
    );
    // Attach logout event listener to the header logout button if it exists
    if(logoutButtonHeader) {
        logoutButtonHeader.addEventListener('click', async () => {
            try {
                await logout();
                window.location.href = 'index.html'; // Redirect to index after logout
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
});
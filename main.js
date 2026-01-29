import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { monitorAuthState, logout } from './auth.js';
import { db } from './firebase.js';
import data from './pregnancy_data.json' assert { type: 'json' };

// --- UTILITY FUNCTIONS ---

function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
}

async function getDueDate(user) {
    let dueDate = "2026-10-03";
    if (user) {
        const person = user.email.includes('mikael') ? 'mikael' : 'agatha';
        const docRef = doc(db, "profiles", person);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().dueDate) {
                dueDate = docSnap.data().dueDate;
            }
        } catch (error) {
            console.error("Error fetching due date:", error);
        }
    }
    return dueDate;
}

function setDiaryPageEditability(canEdit) {
    const controls = ['diary-text', 'image-input', 'type-diary', 'type-letter', 'save-button'];
    controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.disabled = !canEdit;
    });
}

// --- FEATURE FUNCTIONS ---

function calculateDDay(dueDateStr) {
  const dueDate = new Date(dueDateStr);
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const timeDiff = dueDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff > 0) return `D-${daysDiff} 👶`;
  if (daysDiff < 0) return `D+${Math.abs(daysDiff)} 🎉`;
  return `D-Day! 오늘 만나요! ❤️`;
}

function calculatePregnancyWeek(dueDateStr) {
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  const startDate = new Date(dueDate.getTime() - (280 * 24 * 60 * 60 * 1000)); // 40 weeks * 7 days
  const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysPassed / 7) + 1;
  const day = daysPassed % 7;
  return { week, day };
}

async function displayWeeklyInfo(user) {
    const weeklyInfoContent = document.getElementById('weekly-info-content');
    if (!weeklyInfoContent) return;
    weeklyInfoContent.innerHTML = '<div class="loading-spinner"></div>';

    const dueDate = await getDueDate(user);
    const { week, day } = calculatePregnancyWeek(dueDate);

    try {
        const weekData = data.weeks.find(item => item.week === week) || data.default;

        document.getElementById('weekly-info-title').textContent = `${week}주차: ${weekData.title}`;
        document.getElementById('weekly-info-week').textContent = `(오늘은 ${week}주 ${day}일째 되는 날입니다.)`;

        weeklyInfoContent.innerHTML = `
            <h3>${weekData.baby_title}</h3><p>${weekData.baby_content}</p>
            <h3>${weekData.mom_title}</h3><p>${weekData.mom_content}</p>`;
    } catch (error) {
        console.error("Error displaying weekly info:", error);
        weeklyInfoContent.parentElement.innerHTML = '<p>주차별 정보를 표시하는 데 실패했습니다.</p>';
    }
}

async function renderMainCalendar() {
    const mainCalendarContainer = document.getElementById('main-calendar-container');
    if (!mainCalendarContainer) return;
    mainCalendarContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const q = query(collection(db, "diaries"));
        const querySnapshot = await getDocs(q);
        const diaryDates = querySnapshot.docs.map(doc => doc.data().date);
        
        mainCalendarContainer.innerHTML = '';
        flatpickr(mainCalendarContainer, {
            inline: true,
            enable: diaryDates,
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                const date = dayElem.dateObj.toISOString().split('T')[0];
                if (diaryDates.includes(date)) {
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

async function displayLatestEntries() {
    const persons = ['mikael', 'agatha'];
    for (const person of persons) {
        const latestEntryContainer = document.getElementById(`latest-${person}-entry`);
        if (!latestEntryContainer) continue;
        latestEntryContainer.innerHTML = '<div class="loading-spinner"></div>';

        const q = query(
            collection(db, "diaries"),
            where('person', '==', person),
            orderBy("date", "desc"),
            limit(1)
        );

        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const latestDoc = querySnapshot.docs[0];
                const entry = latestDoc.data();
                const snippet = entry.text.substring(0, 100) + (entry.text.length > 100 ? '...' : '');

                latestEntryContainer.innerHTML = `
                    <h3>${person === 'mikael' ? '미카엘' : '아가다'}의 최신 일기</h3>
                    <p>${entry.date}</p>
                    ${entry.image ? `<img src="${entry.image}" alt="Latest diary image" class="latest-entry-image">` : ''}
                    <p>${snippet}</p>
                    <a href="diary.html?person=${person}&date=${entry.date}">전체 보기</a>`;
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
    const docId = `${user.uid}-${todayStr}`;
    
    try {
        await setDoc(doc(moodsCollection, docId), { uid: user.uid, email: user.email, mood, date: todayStr });
        loadTodaysMood(user);
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
        const q = query(moodsCollection, where("uid", "==", user.uid), where("date", "==", todayStr));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const mood = querySnapshot.docs[0].data().mood;
            todaysMoodEl.textContent = `오늘의 기분은 ${mood}로 저장되었어요!`;
            moodButtonsContainer.style.display = 'none';
        } else {
            todaysMoodEl.textContent = '';
            moodButtonsContainer.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error loading today's mood:", error);
    }
}

// --- DIARY PAGE LOGIC ---

async function setupDiaryPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const person = urlParams.get('person');
    let date = urlParams.get('date') || getTodayDateString();

    document.getElementById('diary-title').textContent = person === 'mikael' ? "미카엘의 일기" : "아가다의 일기";
    
    const updateURL = (newDate) => {
        const newUrl = `?person=${person}&date=${newDate}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    };

    if (!urlParams.has('date')) {
        updateURL(date);
    }

    const diaryText = document.getElementById('diary-text');
    document.getElementById('type-diary').addEventListener('change', () => diaryText.placeholder = '오늘의 이야기를 기록해보세요...');
    document.getElementById('type-letter').addEventListener('change', () => diaryText.placeholder = '따수니에게 보내는 사랑의 메시지를 작성해주세요...');

    const fp = flatpickr("#calendar-container", {
        inline: true,
        defaultDate: date,
        onChange: (selectedDates, dateStr) => {
            date = dateStr;
            updateURL(dateStr);
            loadDiaryEntry(person, dateStr);
        }
    });

    loadDiaryEntry(person, date);

    document.getElementById('save-button').addEventListener('click', () => saveDiaryEntry(person, date));
}

async function loadDiaryEntry(person, date) {
    document.getElementById('diary-date').textContent = date;
    document.getElementById('diary-entry').style.display = 'block';

    const diaryText = document.getElementById('diary-text');
    const diaryImage = document.getElementById('diary-image');

    try {
        const q = query(collection(db, "diaries"), where("person", "==", person), where("date", "==", date));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const entry = docSnap.data();
            diaryText.value = entry.text || '';
            document.getElementById(entry.type === 'letter' ? 'type-letter' : 'type-diary').checked = true;
            diaryImage.src = entry.image || '';
            diaryImage.style.display = entry.image ? 'block' : 'none';
            document.getElementById('save-button').dataset.docId = docSnap.id;
        } else {
            diaryText.value = '';
            document.getElementById('type-diary').checked = true;
            diaryImage.src = '';
            diaryImage.style.display = 'none';
            delete document.getElementById('save-button').dataset.docId;
        }
    } catch(error) {
        console.error("Error loading diary entry:", error);
    } finally {
        document.getElementById('image-input').value = '';
    }
}

async function saveDiaryEntry(person, date) {
    const saveButton = document.getElementById('save-button');
    const docId = saveButton.dataset.docId;
    const file = document.getElementById('image-input').files[0];
    const text = document.getElementById('diary-text').value;
    const type = document.querySelector('input[name="entry-type"]:checked').value;

    const showSaveFeedback = () => {
        const originalText = saveButton.textContent;
        saveButton.textContent = '저장됨!';
        saveButton.disabled = true;
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }, 2000);
    };

    let entryData = { person, date, text, type };

    const performSave = async (dataToSave) => {
        try {
            const docRef = docId ? doc(db, "diaries", docId) : doc(collection(db, "diaries"));
            await setDoc(docRef, dataToSave, { merge: true });
            if (!docId) saveButton.dataset.docId = docRef.id; // Store new doc id
            showSaveFeedback();
            renderMainCalendar(); // Refresh calendar on the main page if present
        } catch (error) {
            console.error("Error saving entry:", error);
            alert('일기 저장에 실패했습니다.');
        }
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800;
                let { width, height } = img;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                entryData.image = canvas.toDataURL('image/jpeg', 0.8);
                performSave(entryData);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        if (docId) {
             const docSnap = await getDoc(doc(db, "diaries", docId));
             entryData.image = (docSnap.exists() && docSnap.data().image) ? docSnap.data().image : '';
        } else {
            entryData.image = '';
        }
        performSave(entryData);
    }
}


// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const pagePath = window.location.pathname;
    const isMainPage = pagePath.includes('index.html') || pagePath === '/' ||  pagePath === '/pregnancy-diary/';
    const isDiaryPage = pagePath.includes('diary.html');

    monitorAuthState(
      async (user) => {
        document.getElementById('profile-button-header').style.display = 'block';
        document.getElementById('logout-button-header').style.display = 'block';
        document.getElementById('login-button-header').style.display = 'none';

        if (isMainPage) {
            await Promise.all([
                loadProfilePictures(),
                getDueDate(user).then(d => document.getElementById('dday-counter').textContent = calculateDDay(d)),
                displayWeeklyInfo(user),
                renderMainCalendar(),
                displayLatestEntries(),
                loadTodaysMood(user)
            ]);
            document.querySelectorAll('.mood-button').forEach(button => {
                button.addEventListener('click', () => saveMood(button.dataset.mood, user));
                button.disabled = false;
            });
        } else if (isDiaryPage) {
            setupDiaryPage();
            setDiaryPageEditability(true);
        }
      },
      async () => {
        document.getElementById('profile-button-header').style.display = 'none';
        document.getElementById('logout-button-header').style.display = 'none';
        document.getElementById('login-button-header').style.display = 'block';

        if (isMainPage) {
            await Promise.all([
                loadProfilePictures(),
                getDueDate(null).then(d => document.getElementById('dday-counter').textContent = calculateDDay(d)),
                displayWeeklyInfo(null),
                renderMainCalendar(),
                displayLatestEntries()
            ]);
            const todaysMoodEl = document.getElementById('todays-mood');
            if(todaysMoodEl) todaysMoodEl.textContent = '로그인하여 오늘의 기분을 기록해보세요!';
            document.querySelectorAll('.mood-button').forEach(b => b.disabled = true);

        } else if (isDiaryPage) {
            setupDiaryPage();
            setDiaryPageEditability(false);
            const diaryEntry = document.getElementById('diary-entry');
            if (diaryEntry && !diaryEntry.querySelector('#login-prompt')) {
                const prompt = document.createElement('p');
                prompt.id = 'login-prompt';
                prompt.textContent = '일기를 작성하려면 로그인해주세요.';
                Object.assign(prompt.style, { textAlign: 'center', marginTop: '20px', color: '#c62828' });
                diaryEntry.appendChild(prompt);
            }
        } else if (window.location.pathname.includes('profile.html')) {
             window.location.href = 'login.html';
        }
      }
    );

    const logoutButton = document.getElementById('logout-button-header');
    if(logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await logout();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }
});

import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { monitorAuthState, logout } from './auth.js';
import { db } from './firebase.js';

// --- UTILITY FUNCTIONS ---

async function getPregnancyData() {
    try {
        const response = await fetch('./pregnancy_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not load pregnancy data:", error);
        return null; // Handle this case in your functions
    }
}

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

async function displayWeeklyInfo(user, data) {
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
        const diaryDates = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const id = doc.id;
            const parts = id.split('-');
            const inferredDate = parts.slice(1).join('-') || '2026-01-01';
            return data.date || inferredDate;
        });
        
        mainCalendarContainer.innerHTML = '';
        flatpickr(mainCalendarContainer, {
            inline: true,
            enable: diaryDates,
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                const year = dayElem.dateObj.getFullYear();
                const month = String(dayElem.dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dayElem.dateObj.getDate()).padStart(2, '0');
                const date = `${year}-${month}-${day}`;
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

        const q = query(collection(db, "diaries"));

        try {
            const querySnapshot = await getDocs(q);
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
            }).filter(entry => entry.person === person);

            if (entries.length > 0) {
                entries.sort((a, b) => b.date.localeCompare(a.date));
                const entry = entries[0];
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
    if (diaryText) diaryText.placeholder = '오늘의 이야기를 기록해보세요...';

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
        const q = query(collection(db, "diaries"));
        const querySnapshot = await getDocs(q);
        
        const docSnap = querySnapshot.docs.find(doc => {
            const data = doc.data();
            const id = doc.id;
            const parts = id.split('-');
            const inferredPerson = parts[0] || 'mikael';
            const inferredDate = parts.slice(1).join('-') || '2026-01-01';
            
            const resolvedPerson = data.person || inferredPerson;
            const resolvedDate = data.date || inferredDate;
            
            return resolvedPerson === person && resolvedDate === date;
        });
        
        if (docSnap) {
            const entry = docSnap.data();
            diaryText.value = entry.text || '';
            diaryImage.src = entry.image || '';
            diaryImage.style.display = entry.image ? 'block' : 'none';
            document.getElementById('save-button').dataset.docId = docSnap.id;
        } else {
            diaryText.value = '';
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
    const type = 'diary';

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
document.addEventListener('DOMContentLoaded', async () => {
    const pagePath = window.location.pathname;
    const isMainPage = pagePath.includes('index') || pagePath === '/' ||  pagePath === '/pregnancy-diary/';
    const isDiaryPage = pagePath.includes('diary');

    const pregnancyData = await getPregnancyData();

    monitorAuthState(
      async (user) => {
        const profileBtn = document.getElementById('profile-button-header');
        const logoutBtn = document.getElementById('logout-button-header');
        const loginBtn = document.getElementById('login-button-header');
        if (profileBtn) profileBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';

        if (isMainPage && pregnancyData) {
            await Promise.all([
                loadProfilePictures(),
                getDueDate(user).then(d => document.getElementById('dday-counter').textContent = calculateDDay(d)),
                displayWeeklyInfo(user, pregnancyData),
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
        const profileBtn = document.getElementById('profile-button-header');
        const logoutBtn = document.getElementById('logout-button-header');
        const loginBtn = document.getElementById('login-button-header');
        if (profileBtn) profileBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';

        if (isMainPage && pregnancyData) {
            await Promise.all([
                loadProfilePictures(),
                getDueDate(null).then(d => document.getElementById('dday-counter').textContent = calculateDDay(d)),
                displayWeeklyInfo(null, pregnancyData),
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
        } else if (window.location.pathname.includes('profile')) {
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

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
    const todayStr = getTodayDateString();
    const todaysMoodEl = document.getElementById('todays-mood');
    const moodButtonsContainer = document.getElementById('mood-buttons');

    if (!todaysMoodEl || !moodButtonsContainer) return;

    try {
        const q = query(moodsCollection, where("date", "==", todayStr));
        const querySnapshot = await getDocs(q);

        let mikaelMood = null;
        let agathaMood = null;
        let currentUserHasLoggedMood = false;

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const email = data.email || '';
            const mood = data.mood;
            
            if (email.includes('mikael')) {
                mikaelMood = mood;
            } else if (email.includes('agatha')) {
                agathaMood = mood;
            }

            if (user && data.uid === user.uid) {
                currentUserHasLoggedMood = true;
            }
        });

        if (user) {
            if (currentUserHasLoggedMood) {
                moodButtonsContainer.style.display = 'none';
            } else {
                moodButtonsContainer.style.display = 'flex';
            }
        } else {
            moodButtonsContainer.style.display = 'none';
        }

        let statusHtml = `
            <div class="couple-moods-container" style="display: flex; justify-content: center; gap: 40px; margin-top: 15px; font-family: 'Gaegu', cursive;">
                <div class="mood-card mikael" style="text-align: center; background: #efebe9; padding: 15px 25px; border-radius: 15px; min-width: 120px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="font-size: 1.1em; color: #5d4037; font-weight: bold; margin-bottom: 5px;">🧔 미카엘</div>
                    <div style="font-size: 2em; margin: 5px 0;">${mikaelMood || '❔'}</div>
                    <div style="font-size: 0.9em; color: #8d6e63;">${mikaelMood ? '기분 입력 완료' : '입력 대기 중'}</div>
                </div>
                <div class="mood-card agatha" style="text-align: center; background: #fde8e8; padding: 15px 25px; border-radius: 15px; min-width: 120px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="font-size: 1.1em; color: #c2185b; font-weight: bold; margin-bottom: 5px;">👩 아가다</div>
                    <div style="font-size: 2em; margin: 5px 0;">${agathaMood || '❔'}</div>
                    <div style="font-size: 0.9em; color: #c2185b;">${agathaMood ? '기분 입력 완료' : '입력 대기 중'}</div>
                </div>
            </div>
        `;

        if (!user) {
            statusHtml += `<p style="text-align: center; font-size: 1em; color: #e53935; margin-top: 15px;">로그인하여 오늘의 기분을 기록해보세요!</p>`;
        }

        todaysMoodEl.innerHTML = statusHtml;
    } catch (error) {
        console.error("Error loading today's mood:", error);
    }
}

// --- BIORHYTHM UTILITY FUNCTIONS ---

function getDaysElapsed(birthDateStr, targetDate) {
    const birthDate = new Date(birthDateStr);
    birthDate.setHours(0,0,0,0);
    const target = new Date(targetDate);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - birthDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getBiorhythmValues(t) {
    const physical = Math.sin((2 * Math.PI * t) / 23) * 100;
    const emotional = Math.sin((2 * Math.PI * t) / 28) * 100;
    const intellectual = Math.sin((2 * Math.PI * t) / 33) * 100;
    return {
        physical: Math.round(physical),
        emotional: Math.round(emotional),
        intellectual: Math.round(intellectual)
    };
}

async function getBirthDates() {
    let mikaelBirth = "1987-04-28";
    let agathaBirth = "1990-01-15";

    try {
        const mSnap = await getDoc(doc(db, "profiles", "mikael"));
        if (mSnap.exists() && mSnap.data().birthDate) {
            mikaelBirth = mSnap.data().birthDate;
        }
    } catch (e) {
        console.error("Error loading mikael birthdate:", e);
    }

    try {
        const aSnap = await getDoc(doc(db, "profiles", "agatha"));
        if (aSnap.exists() && aSnap.data().birthDate) {
            agathaBirth = aSnap.data().birthDate;
        }
    } catch (e) {
        console.error("Error loading agatha birthdate:", e);
    }

    return { mikael: mikaelBirth, agatha: agathaBirth };
}

async function displayBiorhythms() {
    const biorhythmContent = document.getElementById('biorhythm-content');
    if (!biorhythmContent) return;
    biorhythmContent.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const { mikael, agatha } = await getBirthDates();
        const today = new Date();
        
        const mDays = getDaysElapsed(mikael, today);
        const aDays = getDaysElapsed(agatha, today);

        const mBio = getBiorhythmValues(mDays);
        const aBio = getBiorhythmValues(aDays);

        let guideText = "";
        if (mBio.emotional < -40 && aBio.emotional < -40) {
            guideText = "오늘 두 분 모두 감정 지수가 낮아 사소한 일에 서운해하기 쉬운 날이에요. 서로에게 따뜻한 위로와 부드러운 말투로 배려해 주세요. 💕";
        } else if (mBio.emotional < -40) {
            guideText = "오늘 미카엘님의 감정 지수가 조금 낮아 예민할 수 있는 날이에요. 아가다님이 먼저 달콤한 격려와 안부를 건네주면 큰 힘이 될 거예요! 🧸";
        } else if (aBio.emotional < -40) {
            guideText = "오늘 아가다님의 감정 지수가 다소 저조하여 피로감을 느끼기 쉬운 날입니다. 미카엘님이 따뜻하게 안아주고 편히 쉴 수 있도록 집안일을 챙겨주세요. 🌸";
        } else if (mBio.emotional > 40 && aBio.emotional > 40) {
            guideText = "오늘 두 분 모두 감정 지수가 최고조입니다! 서로 바라만 봐도 행복해지는 날이니, 함께 맛있는 음식을 먹거나 아깡이와의 미래를 계획해보세요. ✨";
        } else {
            guideText = "오늘 부부의 바이오리듬이 고르게 안정적입니다. 일상 속 소소한 대화를 나누며 편안하고 따뜻한 하루를 보내보세요. 🍀";
        }

        if (mBio.physical < -40 || aBio.physical < -40) {
            let lowPhysicalPerson = mBio.physical < -40 ? (aBio.physical < -40 ? "두 분 모두" : "미카엘님") : "아가다님";
            guideText += ` <br><br>⚠️ ${lowPhysicalPerson}의 신체 지수가 낮아 피로할 수 있으니 오늘 격한 활동은 피하고 충분한 휴식을 권장해요.`;
        }

        if (mBio.intellectual > 50 && aBio.intellectual > 50) {
            guideText += ` <br><br>💡 두 분 다 지성 지수가 높은 날입니다. 아깡이 출산 준비물 체크리스트를 만들거나 육아 계획을 세우는 이성적인 논의를 하기에 좋은 시기예요!`;
        }

        const getStatusColor = (val) => {
            if (val > 40) return '#4caf50';
            if (val < -40) return '#e53935';
            return '#ffb300';
        };

        const getPercentage = (val) => {
            return Math.min(Math.max(((val + 100) / 2), 0), 100);
        };

        biorhythmContent.innerHTML = `
            <div class="biorhythm-comparison" style="display: flex; flex-direction: column; gap: 20px; font-family: 'Gaegu', cursive;">
                <div class="bio-person-card" style="background: #efebe9; padding: 18px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; color: #5d4037; font-size: 1.3em; margin-bottom: 12px;">🧔 미카엘의 상태</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em; color: #5d4037; margin-bottom: 3px;">
                                <span>🔋 신체 (${mBio.physical}%)</span>
                                <span style="font-weight: bold; color: ${getStatusColor(mBio.physical)}">${mBio.physical > 40 ? '최상' : (mBio.physical < -40 ? '저조' : '보통')}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: #e0dcd9; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${getPercentage(mBio.physical)}%; height: 100%; background: ${getStatusColor(mBio.physical)}; border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em; color: #5d4037; margin-bottom: 3px;">
                                <span>❤️ 감정 (${mBio.emotional}%)</span>
                                <span style="font-weight: bold; color: ${getStatusColor(mBio.emotional)}">${mBio.emotional > 40 ? '안정' : (mBio.emotional < -40 ? '예민' : '보통')}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: #e0dcd9; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${getPercentage(mBio.emotional)}%; height: 100%; background: ${getStatusColor(mBio.emotional)}; border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em; color: #5d4037; margin-bottom: 3px;">
                                <span>🧠 지성 (${mBio.intellectual}%)</span>
                                <span style="font-weight: bold; color: ${getStatusColor(mBio.intellectual)}">${mBio.intellectual > 40 ? '명석' : (mBio.intellectual < -40 ? '둔조' : '보통')}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: #e0dcd9; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${getPercentage(mBio.intellectual)}%; height: 100%; background: ${getStatusColor(mBio.intellectual)}; border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bio-person-card" style="background: #fde8e8; padding: 18px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; color: #c2185b; font-size: 1.3em; margin-bottom: 12px;">👩 아가다의 상태</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em; color: #c2185b; margin-bottom: 3px;">
                                <span>🔋 신체 (${aBio.physical}%)</span>
                                <span style="font-weight: bold; color: ${getStatusColor(aBio.physical)}">${aBio.physical > 40 ? '최상' : (aBio.physical < -40 ? '저조' : '보통')}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: #f5d4d4; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${getPercentage(aBio.physical)}%; height: 100%; background: ${getStatusColor(aBio.physical)}; border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em; color: #c2185b; margin-bottom: 3px;">
                                <span>❤️ 감정 (${aBio.emotional}%)</span>
                                <span style="font-weight: bold; color: ${getStatusColor(aBio.emotional)}">${aBio.emotional > 40 ? '안정' : (aBio.emotional < -40 ? '예민' : '보통')}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: #f5d4d4; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${getPercentage(aBio.emotional)}%; height: 100%; background: ${getStatusColor(aBio.emotional)}; border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em; color: #c2185b; margin-bottom: 3px;">
                                <span>🧠 지성 (${aBio.intellectual}%)</span>
                                <span style="font-weight: bold; color: ${getStatusColor(aBio.intellectual)}">${aBio.intellectual > 40 ? '명석' : (aBio.intellectual < -40 ? '둔조' : '보통')}</span>
                            </div>
                            <div style="width: 100%; height: 12px; background: #f5d4d4; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${getPercentage(aBio.intellectual)}%; height: 100%; background: ${getStatusColor(aBio.intellectual)}; border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bio-guide-box" style="background: #fff8e1; border-left: 5px solid #ffb300; padding: 15px; border-radius: 8px; font-size: 1.05em; line-height: 1.5; color: #5d4037;">
                    <strong style="font-size: 1.1em; display: block; margin-bottom: 8px;">💌 오늘의 부부 케어 가이드</strong>
                    <div>${guideText}</div>
                </div>
            </div>
        `;
    } catch (e) {
        console.error("Error displaying biorhythms:", e);
        biorhythmContent.innerHTML = '<p>바이오리듬 정보를 계산하는 데 실패했습니다.</p>';
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
                loadTodaysMood(user),
                displayBiorhythms()
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
                displayLatestEntries(),
                loadTodaysMood(null),
                displayBiorhythms()
            ]);
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

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('diary.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const person = urlParams.get('person');
    let date = urlParams.get('date');

    const diaryTitle = document.getElementById('diary-title');
    const diaryDate = document.getElementById('diary-date');
    const diaryEntry = document.getElementById('diary-entry');
    const diaryText = document.getElementById('diary-text');
    const saveButton = document.getElementById('save-button');

    if (person === 'mikael') {
      diaryTitle.textContent = "미카엘의 일기";
    } else if (person === 'agatha') {
      diaryTitle.textContent = "아가다의 일기";
    }

    const fp = flatpickr("#calendar-container", {
      inline: true,
      defaultDate: date,
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

    function loadDiaryEntry(selectedDate) {
      const key = `${person}-${selectedDate}`;
      const entry = localStorage.getItem(key);
      diaryText.value = entry || '';
    }

    saveButton.addEventListener('click', () => {
      if (date) {
        const key = `${person}-${date}`;
        localStorage.setItem(key, diaryText.value);
        alert('저장되었습니다!');
      }
    });

    if (date) {
      showDiaryEntry(date);
    }
  }
});
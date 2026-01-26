document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('diary')) {
    const urlParams = new URLSearchParams(window.location.search);
    const person = urlParams.get('person');
    let date = urlParams.get('date');

    const diaryTitle = document.getElementById('diary-title');
    const diaryDate = document.getElementById('diary-date');
    const diaryEntry = document.getElementById('diary-entry');
    const diaryText = document.getElementById('diary-text');
    const saveButton = document.getElementById('save-button');
    const diaryImage = document.getElementById('diary-image');
    const imageInput = document.getElementById('image-input');

    if (person === 'mikael') {
      diaryTitle.textContent = "미카엘의 일기";
    } else if (person === 'agatha') {
      diaryTitle.textContent = "아가다의 일기";
    }

    const fp = flatpickr("#calendar-container", {
      inline: true,
      defaultDate: date || new Date(),
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
      const entryJSON = localStorage.getItem(key);
      if (entryJSON) {
        const entry = JSON.parse(entryJSON);
        diaryText.value = entry.text || '';
        if (entry.image) {
          diaryImage.src = entry.image;
          diaryImage.style.display = 'block';
        } else {
          diaryImage.style.display = 'none';
        }
      } else {
        diaryText.value = '';
        diaryImage.src = '';
        diaryImage.style.display = 'none';
      }
      imageInput.value = ''; // Reset file input
    }

    saveButton.addEventListener('click', () => {
      if (date) {
        const key = `${person}-${date}`;
        const reader = new FileReader();
        const file = imageInput.files[0];

        let entry = {
            text: diaryText.value,
            image: diaryImage.src // Preserve existing image if no new one is selected
        };

        if (file) {
            reader.onload = function(e) {
                entry.image = e.target.result;
                localStorage.setItem(key, JSON.stringify(entry));
                alert('저장되었습니다!');
                loadDiaryEntry(date); // Reload to show the new image
            };
            reader.readAsDataURL(file);
        } else {
            localStorage.setItem(key, JSON.stringify(entry));
            alert('저장되었습니다!');
        }
      }
    });

    if (!date) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
        window.history.pushState({}, '', `?person=${person}&date=${date}`);
    }
    showDiaryEntry(date);
  }
});
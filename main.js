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

    const debugInfo = document.getElementById('debug-info');
    
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
          debugInfo.innerHTML = `Loading from key: ${key}`;
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
        
                const showSaveFeedback = () => {
                    const originalText = saveButton.textContent;
                    saveButton.textContent = '저장됨!';
                    saveButton.disabled = true;
                    setTimeout(() => {
                        saveButton.textContent = originalText;
                        saveButton.disabled = false;
                    }, 2000);
                };
        
                if (file) {
                    reader.onload = function(e) {
                        const entry = {
                            text: diaryText.value,
                            image: e.target.result
                        };
                        debugInfo.innerHTML = `Saving to key: ${key}<br>Content: ${JSON.stringify(entry).substring(0, 100)}...`;
                        localStorage.setItem(key, JSON.stringify(entry));
                        showSaveFeedback();
                        loadDiaryEntry(date); // Reload to show the new image
                    };
                    reader.readAsDataURL(file);
                } else {
                    // No new file, save text and preserve existing image if valid
                    let entry = {
                        text: diaryText.value
                    };
                    if (diaryImage.src && diaryImage.src.startsWith('data:image')) {
                        entry.image = diaryImage.src;
                    }
                    debugInfo.innerHTML = `Saving to key: ${key}<br>Content: ${JSON.stringify(entry).substring(0, 100)}...`;
                    localStorage.setItem(key, JSON.stringify(entry));
                    showSaveFeedback();
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
        showDiaryEntry(date);  }
});
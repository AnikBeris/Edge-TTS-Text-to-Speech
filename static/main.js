document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const textInput = document.getElementById('text-input');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.getElementById('language-options');
    const selectedLanguage = document.getElementById('selected-language');
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');
    const pitchSlider = document.getElementById('pitch-slider');
    const rateValue = document.getElementById('rate-value');
    const pitchValue = document.getElementById('pitch-value');
    const generateBtn = document.getElementById('generate-btn');
    const audioPlayer = document.getElementById('audio-player');
    const audioContainer = document.getElementById('audio-container');
    const statusMessage = document.getElementById('status-message');
    const downloadBtn = document.getElementById('download-btn');
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const apiTestBtn = document.getElementById('api-test-btn');
    const copyApiBtn = document.getElementById('copy-api-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const responseStatus = document.getElementById('response-status');
    const responseTime = document.getElementById('response-time');
    const responseSize = document.getElementById('response-size');
    const voiceList = document.getElementById('voice-list');
    const voiceSearch = document.getElementById('voice-search');
    const genderAllBtn = document.getElementById('gender-all');
    const genderMaleBtn = document.getElementById('gender-male');
    const genderFemaleBtn = document.getElementById('gender-female');
    const charCount = document.getElementById('char-count');
    const voicesCount = document.getElementById('voices-count');
    const languagesCount = document.getElementById('languages-count');

    // Переменные состояния
    let languages = [];
    let voices = [];
    let currentAudioBlob = null;
    let currentAudioUrl = null;
    let selectedVoice = '';
    let selectedLanguageCode = '';
    let filteredVoices = [];
    let currentGenderFilter = 'all';
    let currentSearchQuery = '';

    // Инициализация
    init();

    async function init() {
        // Загружаем языки и голоса
        await loadLanguagesAndVoices();
        
        // Обновляем счетчик символов
        updateCharCount();
        
        // Настройка слайдеров
        setupSliders();
        
        // Настройка событий
        setupEventListeners();
        
        // Выбираем русский язык по умолчанию
        selectDefaultLanguage();
    }

    async function loadLanguagesAndVoices() {
        try {
            // Загружаем список языков
            const languagesResponse = await fetch('/api/languages');
            if (!languagesResponse.ok) throw new Error('Ошибка загрузки языков');
            languages = await languagesResponse.json();
            
            // Загружаем все голоса
            const voicesResponse = await fetch('/api/voices');
            if (!voicesResponse.ok) throw new Error('Ошибка загрузки голосов');
            voices = await voicesResponse.json();
            
            // Заполняем dropdown языков
            populateLanguageDropdown();
            
            // Заполняем список голосов
            filteredVoices = [...voices];
            renderVoiceList();
            
            // Показываем статистику
            updateStats();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            showMessage('Ошибка загрузки данных: ' + error.message, 'error');
        }
    }

    function populateLanguageDropdown() {
        languageOptions.innerHTML = '';
        
        // Сортируем языки по алфавиту
        const sortedLanguages = [...languages].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedLanguages.forEach(language => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.language = language.code;
            
            item.innerHTML = `
                <span>${language.name}</span>
                <span class="language-count">${language.count}</span>
            `;
            
            item.addEventListener('click', () => {
                selectLanguage(language.code, language.name);
                languageOptions.classList.remove('show');
            });
            
            languageOptions.appendChild(item);
        });
    }

    function selectLanguage(languageCode, languageName) {
        selectedLanguageCode = languageCode;
        selectedLanguage.textContent = languageName;
        
        // Фильтруем голоса по выбранному языку
        filteredVoices = voices.filter(voice => voice.language === languageCode);
        
        // Обновляем фильтры
        applyFilters();
        
        // Заполняем select голосов
        populateVoiceSelect();
        
        // Обновляем список голосов
        renderVoiceList();
        
        // Выбираем первый голос по умолчанию
        if (filteredVoices.length > 0) {
            selectVoice(filteredVoices[0].id);
        }
    }

    function selectDefaultLanguage() {
        // Пытаемся выбрать русский язык
        const russian = languages.find(l => l.code === 'Russian');
        if (russian) {
            selectLanguage(russian.code, russian.name);
        } else if (languages.length > 0) {
            // Или первый язык из списка
            selectLanguage(languages[0].code, languages[0].name);
        }
    }

    function populateVoiceSelect() {
        voiceSelect.innerHTML = '';
        
        if (filteredVoices.length === 0) {
            voiceSelect.innerHTML = '<option value="">Нет голосов для этого языка</option>';
            voiceSelect.disabled = true;
            return;
        }
        
        // Сортируем голоса по имени
        const sortedVoices = [...filteredVoices].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            voiceSelect.appendChild(option);
        });
        
        // Включаем select и выбираем первый голос
        voiceSelect.disabled = false;
        if (sortedVoices.length > 0) {
            voiceSelect.value = sortedVoices[0].id;
            selectedVoice = sortedVoices[0].id;
        }
    }

    function renderVoiceList() {
        if (!voiceList) return;
        
        voiceList.innerHTML = '';
        
        if (filteredVoices.length === 0) {
            voiceList.innerHTML = '<div class="no-voices">Нет голосов для отображения</div>';
            return;
        }
        
        // Сортируем голоса по имени
        const sortedVoices = [...filteredVoices].sort((a, b) => a.name.localeCompare(b.name));
        
        // Обновляем счетчик голосов
        document.querySelector('.voice-count').textContent = `${sortedVoices.length} голосов`;
        
        sortedVoices.forEach(voice => {
            const voiceItem = document.createElement('div');
            voiceItem.className = 'voice-item-new';
            if (voice.id === selectedVoice) {
                voiceItem.classList.add('selected');
            }
            
            // Извлекаем короткое имя голоса (первые части до дефиса)
            const shortName = voice.id.split('-')[2] || voice.id;
            
            voiceItem.innerHTML = `
                <div class="voice-info">
                    <div class="voice-name-short">${shortName}</div>
                    <div class="voice-details">
                        <span class="voice-locale">${voice.locale}</span>
                        <span class="voice-gender-tag">${voice.gender}</span>
                        <span>${voice.language}</span>
                    </div>
                </div>
                <button class="voice-action select-voice-btn" data-voice="${voice.id}">
                    Выбрать
                </button>
            `;
            
            voiceItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('select-voice-btn')) {
                    selectVoice(voice.id);
                }
            });
            
            const selectBtn = voiceItem.querySelector('.select-voice-btn');
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectVoice(voice.id);
            });
            
            voiceList.appendChild(voiceItem);
        });
    }

    function selectVoice(voiceId) {
        selectedVoice = voiceId;
        
        // Обновляем select
        voiceSelect.value = voiceId;
        
        // Обновляем выделение в списке
        document.querySelectorAll('.voice-item-new').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = document.querySelector(`.voice-item-new .select-voice-btn[data-voice="${voiceId}"]`);
        if (selectedItem) {
            selectedItem.closest('.voice-item-new').classList.add('selected');
        }
        
        // Прокручиваем к выбранному элементу
        if (selectedItem) {
            selectedItem.closest('.voice-item-new').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
        
        showMessage(`Выбран голос: ${voiceId}`, 'success');
    }

    function applyFilters() {
        let result = voices;
        
        // Фильтр по языку
        if (selectedLanguageCode) {
            result = result.filter(voice => voice.language === selectedLanguageCode);
        }
        
        // Фильтр по полу
        if (currentGenderFilter === 'male') {
            result = result.filter(voice => voice.gender === 'Male');
        } else if (currentGenderFilter === 'female') {
            result = result.filter(voice => voice.gender === 'Female');
        }
        
        // Фильтр по поиску
        if (currentSearchQuery) {
            const query = currentSearchQuery.toLowerCase();
            result = result.filter(voice => 
                voice.name.toLowerCase().includes(query) ||
                voice.id.toLowerCase().includes(query) ||
                voice.locale.toLowerCase().includes(query)
            );
        }
        
        filteredVoices = result;
        renderVoiceList();
        populateVoiceSelect();
    }

    function updateStats() {
        const totalVoices = voices.length;
        const totalLanguages = languages.length;
        
        voicesCount.textContent = totalVoices;
        languagesCount.textContent = totalLanguages;
    }

    function setupSliders() {
        rateSlider.addEventListener('input', () => {
            rateValue.textContent = `${rateSlider.value}%`;
        });
        
        pitchSlider.addEventListener('input', () => {
            pitchValue.textContent = `${pitchSlider.value} Hz`;
        });
    }

    function setupEventListeners() {
        // Dropdown языков
        languageDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            languageOptions.classList.toggle('show');
        });
        
        // Закрытие dropdown при клике вне его
        document.addEventListener('click', (e) => {
            if (!languageDropdown.contains(e.target) && !languageOptions.contains(e.target)) {
                languageOptions.classList.remove('show');
            }
        });
        
        // Поиск голосов
        voiceSearch.addEventListener('input', () => {
            currentSearchQuery = voiceSearch.value;
            applyFilters();
        });
        
        // Фильтры по полу
        genderAllBtn.addEventListener('click', () => {
            setGenderFilter('all');
        });
        
        genderMaleBtn.addEventListener('click', () => {
            setGenderFilter('male');
        });
        
        genderFemaleBtn.addEventListener('click', () => {
            setGenderFilter('female');
        });
        
        // Изменение голоса в select
        voiceSelect.addEventListener('change', () => {
            selectedVoice = voiceSelect.value;
            selectVoice(selectedVoice);
        });
        
        // Кнопка генерации
        generateBtn.addEventListener('click', generateSpeech);
        
        // Изменение текста
        textInput.addEventListener('input', updateCharCount);
        
        // Скачивание
        downloadBtn.addEventListener('click', downloadAudio);
        
        // Воспроизведение
        playBtn.addEventListener('click', playAudio);
        
        // Остановка
        stopBtn.addEventListener('click', stopAudio);
        
        // Тест API
        apiTestBtn.addEventListener('click', testAPI);
        
        // Копирование примера API
        copyApiBtn.addEventListener('click', copyApiExample);
        
        // Горячие клавиши
        textInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                generateSpeech();
            }
        });
        
        // Клавиша Escape для закрытия dropdown
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                languageOptions.classList.remove('show');
            }
        });
    }

    function setGenderFilter(gender) {
        currentGenderFilter = gender;
        
        // Обновляем активную кнопку
        [genderAllBtn, genderMaleBtn, genderFemaleBtn].forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (gender === 'all') genderAllBtn.classList.add('active');
        if (gender === 'male') genderMaleBtn.classList.add('active');
        if (gender === 'female') genderFemaleBtn.classList.add('active');
        
        applyFilters();
    }

    function updateCharCount() {
        const count = textInput.value.length;
        charCount.textContent = count;
        
        if (count > 5000) {
            charCount.style.color = '#f87171';
        } else if (count > 2000) {
            charCount.style.color = '#fbbf24';
        } else {
            charCount.style.color = '#94a3b8';
        }
    }

    async function generateSpeech() {
        const text = textInput.value.trim();
        const voice = voiceSelect.value;
        const rate = parseInt(rateSlider.value, 10);
        const pitch = parseInt(pitchSlider.value, 10);
        
        // Валидация
        if (!text) {
            showMessage('Введите текст для озвучки', 'error');
            return;
        }
        
        if (!voice) {
            showMessage('Выберите голос', 'error');
            return;
        }
        
        if (text.length > 10000) {
            showMessage('Текст слишком длинный (максимум 10000 символов)', 'error');
            return;
        }
        
        // Показываем загрузку
        showLoading(true);
        
        try {
            const startTime = Date.now();
            
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    voice,
                    rate,
                    pitch
                })
            });
            
            const endTime = Date.now();
            const responseTimeMs = endTime - startTime;
            
            // Обновляем информацию о ответе
            responseStatus.textContent = response.status;
            responseStatus.style.color = response.ok ? '#10b981' : '#f87171';
            responseTime.textContent = `${responseTimeMs}ms`;
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка генерации речи');
            }
            
            // Получаем аудио
            const audioBlob = await response.blob();
            currentAudioBlob = audioBlob;
            
            // Очищаем предыдущий URL
            if (currentAudioUrl) {
                URL.revokeObjectURL(currentAudioUrl);
            }
            
            // Создаем новый URL для аудио
            currentAudioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = currentAudioUrl;
            
            // Обновляем информацию о размере
            responseSize.textContent = `${(audioBlob.size / 1024).toFixed(1)} KB`;
            
            // Показываем аудио плеер и скрываем статус
            if (audioContainer && statusMessage) {
            audioContainer.classList.remove('hidden');
            statusMessage.classList.add('hidden');
            }
            
            showMessage('Речь успешно сгенерирована!', 'success');
            
            // Автовоспроизведение
            audioPlayer.play().catch(e => {
                console.log('Автовоспроизведение заблокировано:', e);
            });
            
        } catch (error) {
            console.error('Ошибка генерации:', error);
            showMessage(error.message || 'Ошибка генерации речи', 'error');
            audioContainer.classList.add('hidden');
            statusMessage.classList.remove('hidden');
        } finally {
            showLoading(false);
        }
    }

    function downloadAudio() {
        if (!currentAudioBlob) {
            showMessage('Нет аудио для скачивания', 'error');
            return;
        }
        
        const url = URL.createObjectURL(currentAudioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `speech_${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showMessage('Аудио скачивается...', 'success');
    }

    function playAudio() {
        if (!currentAudioUrl) {
            showMessage('Нет аудио для воспроизведения', 'error');
            return;
        }
        
        audioPlayer.play().catch(e => {
            showMessage('Ошибка воспроизведения: ' + e.message, 'error');
        });
    }

    function stopAudio() {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
    }

    async function testAPI() {
        if (!selectedVoice) {
            showMessage('Сначала выберите голос', 'error');
            return;
        }
        
        const testData = {
            text: "Это тестовый запрос к API Edge TTS Pro v2.0.",
            voice: selectedVoice,
            rate: 0,
            pitch: 0
        };
        
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            });
            
            if (response.ok) {
                showMessage('API тест пройден успешно!', 'success');
            } else {
                throw new Error(`Статус: ${response.status}`);
            }
        } catch (error) {
            showMessage(`Ошибка API теста: ${error.message}`, 'error');
        }
    }

    function copyApiExample() {
        const example = `POST /api/tts
Content-Type: application/json

{
    "text": "Ваш текст здесь",
    "voice": "${selectedVoice || 'ru-RU-SvetlanaNeural'}",
    "rate": 0,
    "pitch": 0
}`;
        
        navigator.clipboard.writeText(example)
            .then(() => {
                const originalText = copyApiBtn.innerHTML;
                copyApiBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                copyApiBtn.disabled = true;
                
                setTimeout(() => {
                    copyApiBtn.innerHTML = originalText;
                    copyApiBtn.disabled = false;
                }, 2000);
                
                showMessage('Пример API скопирован в буфер обмена', 'success');
            })
            .catch(err => {
                showMessage('Ошибка копирования: ' + err, 'error');
            });
    }

    function showMessage(message, type = 'info') {
    if (!statusMessage) return;
    
    let icon = 'fa-info-circle';
    let bgColor = 'rgba(59, 130, 246, 0.1)';
    let borderColor = 'rgba(59, 130, 246, 0.3)';
    let textColor = '#93c5fd';
    
    switch(type) {
        case 'success':
            icon = 'fa-check-circle';
            bgColor = 'rgba(16, 185, 129, 0.1)';
            borderColor = 'rgba(16, 185, 129, 0.3)';
            textColor = '#a7f3d0';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            bgColor = 'rgba(239, 68, 68, 0.1)';
            borderColor = 'rgba(239, 68, 68, 0.3)';
            textColor = '#fecaca';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            bgColor = 'rgba(245, 158, 11, 0.1)';
            borderColor = 'rgba(245, 158, 11, 0.3)';
            textColor = '#fde68a';
            break;
    }
    
    statusMessage.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    statusMessage.style.background = bgColor;
    statusMessage.style.borderColor = borderColor;
    statusMessage.style.color = textColor;
    statusMessage.classList.remove('hidden');

    }

    function showLoading(show) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерация...';
        } else {
            loadingOverlay.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-play"></i> Озвучить текст';
        }
    }

    // Экспорт функций для отладки
    window.ttsApp = {
        generateSpeech,
        downloadAudio,
        playAudio,
        stopAudio,
        testAPI,
        getVoices: () => voices,
        getLanguages: () => languages
    };
});
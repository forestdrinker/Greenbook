document.addEventListener('DOMContentLoaded', () => {
    const REFLECTION_STORAGE_KEY = 'wordReflections';
    const FAVORITE_STORAGE_KEY = 'wordFavorites';

    let allWords = [];
    let currentQueue = [];
    let currentWord = null;
    let isRepeatMode = false;
    let currentIndex = 0;
    let favoriteStore = loadFavoriteStore();

    const unitSelect = document.getElementById('unit-select');
    const repeatToggle = document.getElementById('repeat-toggle');
    const favoritesOnlyToggle = document.getElementById('favorites-only-toggle');
    const resetBtn = document.getElementById('reset-btn');
    const wordText = document.getElementById('word-text');
    const wordPhonetic = document.getElementById('word-phonetic');
    const wordMeaning = document.getElementById('word-meaning');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const nextBtn = document.getElementById('next-btn');
    const confusingBtn = document.getElementById('confusing-btn');
    const confusingSection = document.getElementById('confusing-section');
    const confusingText = document.getElementById('confusing-text');
    const progressText = document.getElementById('progress-text');
    const statusMsg = document.getElementById('status-msg');
    const favoriteBtn = document.getElementById('favorite-btn');

    // Ensure action buttons are rendered in two rows even if an older HTML cache is loaded.
    function enforceActionLayout() {
        const cardActions = document.querySelector('.card-actions');
        if (!cardActions) {
            return;
        }

        if (cardActions.querySelector('.action-row')) {
            return;
        }

        const confusingButton = document.getElementById('confusing-btn');
        const favoriteButton = document.getElementById('favorite-btn');
        const showAnswerButton = document.getElementById('show-answer-btn');
        const nextButton = document.getElementById('next-btn');

        if (!confusingButton || !favoriteButton || !showAnswerButton || !nextButton) {
            return;
        }

        const firstRow = document.createElement('div');
        firstRow.className = 'action-row';
        firstRow.appendChild(confusingButton);
        firstRow.appendChild(favoriteButton);

        const secondRow = document.createElement('div');
        secondRow.className = 'action-row';
        secondRow.appendChild(showAnswerButton);
        secondRow.appendChild(nextButton);

        cardActions.innerHTML = '';
        cardActions.appendChild(firstRow);
        cardActions.appendChild(secondRow);
    }

    enforceActionLayout();

    function bind(el, eventName, handler) {
        if (!el) {
            return;
        }
        el.addEventListener(eventName, handler);
    }

    // Reflection related elements
    const reflectionModal = document.getElementById('reflection-modal');
    const userNameInput = document.getElementById('user-name-input');
    const reflectionInput = document.getElementById('reflection-input');
    const skipReflectionBtn = document.getElementById('skip-reflection-btn');
    const saveReflectionBtn = document.getElementById('save-reflection-btn');
    const exportReflectionsBtn = document.getElementById('export-reflections-btn');
    const exportModal = document.getElementById('export-modal');
    const closeExportBtn = document.getElementById('close-export-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const clearReflectionsBtn = document.getElementById('clear-reflections-btn');
    const reflectionList = document.getElementById('reflection-list');

    // Load data
    if (window.wordData) {
        allWords = window.wordData.map((word, index) => ({
            ...word,
            _wordId: `w_${index}`
        }));
        populateUnits();
        initSession();
    } else {
        wordText.textContent = '数据加载失败';
        wordMeaning.textContent = '请确保 words.js 存在';
        wordMeaning.classList.remove('hidden');
    }

    function showStatus(text) {
        if (!statusMsg) {
            return;
        }
        statusMsg.textContent = text || '';
    }

    // Event listeners
    bind(unitSelect, 'change', initSession);
    bind(repeatToggle, 'change', (e) => {
        isRepeatMode = e.target.checked;
        if (isRepeatMode && currentQueue.length === 0 && allWords.length > 0) {
            initSession();
        }
        updateProgress();
    });

    const onFavoritesOnlyToggle = () => {
        initSession();
        if (favoritesOnlyToggle && favoritesOnlyToggle.checked) {
            showStatus('只刷收藏已开启');
        } else {
            showStatus('');
        }
    };
    bind(favoritesOnlyToggle, 'change', onFavoritesOnlyToggle);
    bind(favoritesOnlyToggle, 'input', onFavoritesOnlyToggle);

    bind(resetBtn, 'click', initSession);

    bind(showAnswerBtn, 'click', () => {
        wordMeaning.classList.remove('hidden');
    });

    bind(nextBtn, 'click', () => nextWord(false));

    bind(confusingBtn, 'click', () => {
        confusingSection.classList.toggle('hidden');
    });

    bind(favoriteBtn, 'click', toggleCurrentFavorite);

    // Reflection handlers
    bind(skipReflectionBtn, 'click', () => {
        reflectionModal.classList.add('hidden');
        reflectionInput.value = '';
    });

    bind(saveReflectionBtn, 'click', () => {
        const text = reflectionInput.value.trim();
        const userName = userNameInput.value.trim() || '匿名用户';
        if (text) {
            saveReflection(text, userName);
        }
        reflectionModal.classList.add('hidden');
        reflectionInput.value = '';
        userNameInput.value = '';
    });

    bind(exportReflectionsBtn, 'click', () => {
        updateReflectionList();
        exportModal.classList.remove('hidden');
    });

    bind(closeExportBtn, 'click', () => {
        exportModal.classList.add('hidden');
    });

    bind(downloadAllBtn, 'click', downloadAllReflections);

    bind(clearReflectionsBtn, 'click', () => {
        if (confirm('确定要清空所有心得记录吗？此操作不可恢复。')) {
            localStorage.removeItem(REFLECTION_STORAGE_KEY);
            updateReflectionList();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code !== 'Space') {
            return;
        }
        e.preventDefault();
        if (!currentWord) {
            return;
        }
        if (wordMeaning.classList.contains('hidden')) {
            wordMeaning.classList.remove('hidden');
        } else {
            nextWord();
        }
    });

    function populateUnits() {
        const units = new Set(allWords.map((w) => w.unit));
        const sortedUnits = Array.from(units).sort((a, b) => {
            const numA = parseInt((a || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt((b || '').replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

        sortedUnits.forEach((unit) => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitSelect.appendChild(option);
        });
    }

    function initSession() {
        const selectedUnit = unitSelect.value;
        isRepeatMode = repeatToggle.checked;

        let scopedWords;
        if (selectedUnit === 'all') {
            scopedWords = [...allWords];
        } else {
            scopedWords = allWords.filter((w) => w.unit === selectedUnit);
        }

        if (favoritesOnlyToggle.checked) {
            scopedWords = scopedWords.filter(isWordFavorited);
        }

        currentQueue = scopedWords;
        currentIndex = 0;
        showStatus('');

        if (currentQueue.length === 0) {
            showEmptyState();
            updateProgress();
            return;
        }

        shuffleArray(currentQueue);
        nextWord(true);
    }

    function nextWord(isFirst = false) {
        if (currentQueue.length === 0) {
            showEmptyState();
            updateProgress();
            return;
        }

        if (!isFirst) {
            if (!isRepeatMode) {
                currentIndex++;
            } else {
                currentIndex = Math.floor(Math.random() * currentQueue.length);
            }
        }

        if (!isRepeatMode && currentIndex >= currentQueue.length) {
            showFinished();
            return;
        }

        if (isRepeatMode && currentIndex >= currentQueue.length) {
            currentIndex = 0;
        }

        currentWord = currentQueue[currentIndex];
        renderCurrentWord();
    }

    function renderCurrentWord() {
        wordText.textContent = currentWord.word;

        if (currentWord.phonetic) {
            wordPhonetic.textContent = currentWord.phonetic;
            wordPhonetic.classList.remove('hidden');
        } else {
            wordPhonetic.textContent = '';
            wordPhonetic.classList.add('hidden');
        }

        wordMeaning.textContent = currentWord.meaning;
        wordMeaning.classList.add('hidden');

        if (currentWord.confusing && currentWord.confusing.trim()) {
            const confusingItems = currentWord.confusing
                .split('|')
                .map((item) => item.trim())
                .filter(Boolean);
            confusingText.innerHTML = confusingItems
                .map((item) => `<div class="confusing-item">${item}</div>`)
                .join('');
            confusingBtn.classList.remove('hidden');
        } else {
            confusingBtn.classList.add('hidden');
            confusingText.innerHTML = '';
        }
        confusingSection.classList.add('hidden');

        updateFavoriteButton();
        updateProgress();
    }

    function showEmptyState() {
        const selectedUnit = unitSelect.value;
        const favoritesOnly = favoritesOnlyToggle.checked;

        currentWord = null;
        wordPhonetic.textContent = '';
        wordPhonetic.classList.add('hidden');
        confusingBtn.classList.add('hidden');
        confusingSection.classList.add('hidden');

        if (favoritesOnly) {
            wordText.textContent = '暂无收藏单词';
            if (selectedUnit === 'all') {
                wordMeaning.textContent = '先点亮星标收藏一些单词，再开启“只刷收藏”。';
            } else {
                wordMeaning.textContent = `当前单元（${selectedUnit}）还没有收藏单词。`;
            }
            showStatus('只刷收藏已开启');
        } else {
            wordText.textContent = '无单词';
            wordMeaning.textContent = '当前筛选条件没有可学习的单词。';
            showStatus('');
        }

        wordMeaning.classList.remove('hidden');
        updateFavoriteButton();
    }

    function showFinished() {
        wordText.textContent = '本组背诵完成!';
        wordMeaning.textContent = '点击重置或切换单元';
        wordMeaning.classList.remove('hidden');
        showStatus('🎉 完成!');
        currentWord = null;
        updateFavoriteButton();
        updateProgress();

        setTimeout(() => {
            reflectionModal.classList.remove('hidden');
            reflectionInput.focus();
        }, 500);
    }

    function updateFavoriteButton() {
        const hasWord = Boolean(currentWord);
        favoriteBtn.disabled = !hasWord;

        if (!hasWord) {
            favoriteBtn.textContent = '☆';
            favoriteBtn.classList.remove('favorite-active');
            return;
        }

        const isFavorited = isWordFavorited(currentWord);
        favoriteBtn.textContent = isFavorited ? '★' : '☆';
        favoriteBtn.classList.toggle('favorite-active', isFavorited);
    }

    function toggleCurrentFavorite() {
        if (!currentWord) {
            return;
        }

        const nextValue = !isWordFavorited(currentWord);
        setWordFavorited(currentWord, nextValue);
        updateFavoriteButton();
        updateProgress();
        showStatus(nextValue ? '已收藏当前单词' : '已取消收藏');

        if (favoritesOnlyToggle.checked && !nextValue) {
            initSession();
        }
    }

    function getWordId(word) {
        return word && word._wordId ? word._wordId : '';
    }

    function isWordFavorited(word) {
        const id = getWordId(word);
        return Boolean(id && favoriteStore[id]);
    }

    function setWordFavorited(word, isFavorited) {
        const id = getWordId(word);
        if (!id) {
            return;
        }

        if (isFavorited) {
            favoriteStore[id] = true;
        } else {
            delete favoriteStore[id];
        }

        if (!persistFavoriteStore()) {
            showStatus('浏览器限制了本地存储，收藏仅当前会话有效');
        }
    }

    function loadFavoriteStore() {
        try {
            const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return {};
            }

            const normalized = {};
            Object.entries(parsed).forEach(([wordId, value]) => {
                if (typeof value === 'boolean') {
                    if (value) {
                        normalized[wordId] = true;
                    }
                    return;
                }

                if (value && typeof value === 'object' && Boolean(value.favorite)) {
                    normalized[wordId] = true;
                }
            });

            return normalized;
        } catch (error) {
            console.warn('收藏数据读取失败，已重置。', error);
            return {};
        }
    }

    function persistFavoriteStore() {
        try {
            localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favoriteStore));
            return true;
        } catch (error) {
            console.warn('收藏数据保存失败。', error);
            return false;
        }
    }

    // 心得保存逻辑
    async function saveReflection(text, userName) {
        const reflections = JSON.parse(localStorage.getItem(REFLECTION_STORAGE_KEY) || '[]');
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN');
        const timeStr = now.toLocaleTimeString('zh-CN');

        const reflectionData = {
            name: userName,
            date: dateStr,
            time: timeStr,
            timestamp: now.getTime(),
            unit: unitSelect.value,
            content: text
        };

        reflections.push(reflectionData);
        localStorage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify(reflections));

        const FORMSPREE_URL = 'https://formspree.io/f/mvzwzrdn';

        if (FORMSPREE_URL.includes('YOUR_FORM_ID')) {
            console.warn('心得已本地保存，但未配置 Formspree 链接，无法自动发送。');
            alert('心得已在本地保存！\n温馨提示：请在 script.js 中配置您的 Formspree 链接以开启自动发送功能。');
            return;
        }

        try {
            const response = await fetch(FORMSPREE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `新心得提交: ${userName} (${dateStr})`,
                    ...reflectionData
                })
            });

            if (response.ok) {
                alert('心得已成功发送至后台！');
            } else {
                throw new Error('发送失败');
            }
        } catch (error) {
            console.error('Error sending to Formspree:', error);
            alert('心得已在本地保存，但发送至后台失败，请检查网络。');
        }
    }

    function updateReflectionList() {
        const reflections = JSON.parse(localStorage.getItem(REFLECTION_STORAGE_KEY) || '[]');
        reflectionList.innerHTML = '';

        if (reflections.length === 0) {
            reflectionList.innerHTML = '<p style="color:#999;text-align:center">暂无心得记录</p>';
            return;
        }

        [...reflections].reverse().forEach((item) => {
            const div = document.createElement('div');
            div.className = 'reflection-item';
            div.innerHTML = `
                <span class="reflection-date">${item.date} ${item.time} (${item.unit}) - ${item.name || '匿名'}</span>
                <p>${item.content.replace(/\n/g, '<br>')}</p>
            `;
            reflectionList.appendChild(div);
        });
    }

    function downloadAllReflections() {
        const reflections = JSON.parse(localStorage.getItem(REFLECTION_STORAGE_KEY) || '[]');
        if (reflections.length === 0) {
            alert('没有可以导出的心得');
            return;
        }

        let content = '=== 绿皮书背诵心得汇总 ===\n\n';
        reflections.forEach((item) => {
            content += `日期: ${item.date} ${item.time}\n`;
            content += `姓名: ${item.name || '匿名'}\n`;
            content += `单元: ${item.unit}\n`;
            content += `内容: ${item.content}\n`;
            content += '----------------------------\n';
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const now = new Date();
        const fileName = `心得汇总_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.txt`;

        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    function getFavoriteCountByUnit(unit) {
        const scopedWords = unit === 'all'
            ? allWords
            : allWords.filter((word) => word.unit === unit);
        return scopedWords.filter(isWordFavorited).length;
    }

    function updateProgress() {
        const favoritesOnly = favoritesOnlyToggle.checked;
        const favoriteCount = getFavoriteCountByUnit(unitSelect.value);
        const favoriteHint = favoritesOnly ? ' | 只刷收藏' : '';

        if (isRepeatMode) {
            progressText.textContent = `当前: ${currentWord ? currentWord.unit : '-'} (无限模式) | 收藏: ${favoriteCount}${favoriteHint}`;
            return;
        }

        const current = currentQueue.length === 0
            ? 0
            : Math.min(currentIndex + 1, currentQueue.length);
        progressText.textContent = `进度: ${current} / ${currentQueue.length} | 收藏: ${favoriteCount}${favoriteHint}`;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});

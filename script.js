document.addEventListener('DOMContentLoaded', () => {
    const FAVORITE_STORAGE_KEY = 'wordFavorites';
    const KNOWN_STORAGE_KEY = 'wordKnown';

    let allWords = [];
    let currentQueue = [];
    let currentWord = null;
    let isRepeatMode = false;
    let currentIndex = 0;
    let favoriteStore = loadFavoriteStore();
    let knownStore = loadKnownStore();
    let timerDurationSeconds = 25 * 60;
    let timerRemainingSeconds = timerDurationSeconds;
    let timerIntervalId = null;
    let timerAlarmIntervalId = null;
    let isTimerRunning = false;
    let isTimerAlarmActive = false;
    let timerAudioContext = null;
    const examTargetDate = new Date('2026-12-19T00:00:00+08:00');

    const unitSelect = document.getElementById('unit-select');
    const repeatToggle = document.getElementById('repeat-toggle');
    const favoritesOnlyToggle = document.getElementById('favorites-only-toggle');
    const hideKnownToggle = document.getElementById('hide-known-toggle');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    const searchGroup = document.getElementById('search-group');
    const bulkFavoriteGroup = document.getElementById('bulk-favorite-group');
    const bulkFavoriteInput = document.getElementById('bulk-favorite-input');
    const bulkFavoriteSummary = document.getElementById('bulk-favorite-summary');
    const openBulkFavoriteBtn = document.getElementById('open-bulk-favorite-btn');
    const applyBulkFavoriteBtn = document.getElementById('apply-bulk-favorite-btn');
    const closeBulkFavoriteBtn = document.getElementById('close-bulk-favorite-btn');
    const resetBtn = document.getElementById('reset-btn');
    const wordText = document.getElementById('word-text');
    const wordPhonetic = document.getElementById('word-phonetic');
    const wordMeaning = document.getElementById('word-meaning');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const nextBtn = document.getElementById('next-btn');
    const confusingBtn = document.getElementById('confusing-btn');
    const exampleBtn = document.getElementById('example-btn');
    const exampleSection = document.getElementById('example-section');
    const exampleText = document.getElementById('example-text');
    const memoryBtn = document.getElementById('memory-btn');
    const memorySection = document.getElementById('memory-section');
    const memoryText = document.getElementById('memory-text');
    const confusingSection = document.getElementById('confusing-section');
    const confusingText = document.getElementById('confusing-text');
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    const statusMsg = document.getElementById('status-msg');
    const favoriteBtn = document.getElementById('favorite-btn');
    const knownBtn = document.getElementById('known-btn');
    const heroMode = document.getElementById('hero-mode');
    const heroUnit = document.getElementById('hero-unit');
    const heroProgress = document.getElementById('hero-progress');
    const examCountdown = document.getElementById('exam-countdown');
    const examCountdownHelp = document.getElementById('exam-countdown-help');
    const currentUnitPill = document.getElementById('current-unit-pill');
    const timerPanel = document.querySelector('.timer-panel');
    const timerDisplay = document.getElementById('timer-display');
    const timerState = document.getElementById('timer-state');
    const timerMinutesInput = document.getElementById('timer-minutes');
    const timerToggleBtn = document.getElementById('timer-toggle-btn');
    const timerResetBtn = document.getElementById('timer-reset-btn');
    const timerDismissBtn = document.getElementById('timer-dismiss-btn');

    function bind(el, eventName, handler) {
        if (el) {
            el.addEventListener(eventName, handler);
        }
    }

    if (window.wordData) {
        allWords = window.wordData.map((word, index) => ({
            ...word,
            _wordId: `w_${index}`
        }));
        populateUnits();
        initSession();
    } else {
        wordText.textContent = '数据加载失败';
        wordMeaning.textContent = '请确认 words.js 文件存在且格式正确。';
        wordMeaning.classList.remove('hidden');
        updateDashboardMeta();
    }

    bind(unitSelect, 'change', initSession);
    bind(repeatToggle, 'change', () => {
        applyRepeatModeChange();
    });

    bind(favoritesOnlyToggle, 'change', () => {
        applyFavoritesOnlyModeChange();
    });

    bind(hideKnownToggle, 'change', () => {
        applyHideKnownModeChange();
    });

    bind(searchBtn, 'click', searchWords);
    bind(searchInput, 'keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchWords();
        }
    });

    bind(searchResults, 'click', (event) => {
        const target = event.target.closest('button[data-word-id]');
        if (!target) {
            return;
        }

        const found = allWords.find((word) => word._wordId === target.dataset.wordId);
        if (found) {
            jumpToWord(found);
        }
    });

    bind(openBulkFavoriteBtn, 'click', openBulkFavoritePanel);
    bind(applyBulkFavoriteBtn, 'click', applyBulkFavoriteWords);
    bind(closeBulkFavoriteBtn, 'click', () => {
        bulkFavoriteGroup.classList.add('hidden');
        clearBulkFavoriteSummary();
    });

    bind(resetBtn, 'click', () => {
        initSession();
        showStatus('学习队列已重新生成');
    });

    bind(showAnswerBtn, 'click', () => {
        if (!currentWord) {
            return;
        }
        wordMeaning.classList.remove('hidden');
        showStatus('已显示释义');
    });

    bind(nextBtn, 'click', () => nextWord(false));

    bind(confusingBtn, 'click', toggleConfusingSection);
    bind(exampleBtn, 'click', toggleExampleSection);
    bind(memoryBtn, 'click', toggleMemorySection);

    bind(favoriteBtn, 'click', toggleCurrentFavorite);
    bind(knownBtn, 'click', toggleCurrentKnown);
    bind(timerToggleBtn, 'click', toggleTimer);
    bind(timerResetBtn, 'click', resetTimer);
    bind(timerDismissBtn, 'click', dismissTimerAlarm);
    bind(timerMinutesInput, 'change', applyTimerMinutes);
    bind(timerMinutesInput, 'input', () => {
        if (!isTimerRunning) {
            applyTimerMinutes(false);
        }
    });

    renderTimer();
    updateExamCountdown();
    window.setInterval(updateExamCountdown, 60 * 60 * 1000);

    document.addEventListener('keydown', (event) => {
        const tag = String(event.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') {
            return;
        }

        const key = String(event.key || '').toLowerCase();
        if (key === 'a') {
            event.preventDefault();
            previousWord();
            return;
        }
        if (key === 'd') {
            event.preventDefault();
            nextWord(false);
            return;
        }
        if (key === 'j') {
            event.preventDefault();
            toggleMeaning();
            return;
        }
        if (key === 'k') {
            event.preventDefault();
            toggleConfusingSection();
            return;
        }
        if (key === 'n') {
            event.preventDefault();
            toggleExampleSection();
            return;
        }
        if (key === 'm') {
            event.preventDefault();
            toggleMemorySection();
            return;
        }
        if (key === 'l') {
            event.preventDefault();
            toggleCurrentFavorite();
            return;
        }
        if (key === 'h') {
            event.preventDefault();
            toggleCurrentKnown();
            return;
        }
        if (key === 'y') {
            event.preventDefault();
            toggleRepeatMode();
            return;
        }
        if (key === 'u') {
            event.preventDefault();
            toggleFavoritesOnlyMode();
            return;
        }
        if (key === 'i') {
            event.preventDefault();
            toggleHideKnownMode();
            return;
        }
        if (key === 's') {
            event.preventDefault();
            openSearchPanel();
            return;
        }

        if (event.code !== 'Space') {
            return;
        }

        event.preventDefault();
        if (!currentWord) {
            return;
        }

        if (wordMeaning.classList.contains('hidden')) {
            wordMeaning.classList.remove('hidden');
            showStatus('已显示释义');
        } else {
            nextWord(false);
        }
    });

    function populateUnits() {
        const units = new Set(allWords.map((word) => word.unit));
        const sortedUnits = Array.from(units).sort((a, b) => {
            const numA = parseInt(String(a || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(b || '').replace(/\D/g, ''), 10) || 0;
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

        let scopedWords = selectedUnit === 'all'
            ? [...allWords]
            : allWords.filter((word) => word.unit === selectedUnit);

        if (favoritesOnlyToggle.checked) {
            scopedWords = scopedWords.filter(isWordFavorited);
        }

        if (hideKnownToggle.checked) {
            scopedWords = scopedWords.filter((word) => !isWordKnown(word));
        }

        currentQueue = scopedWords;
        currentIndex = 0;
        clearSearchResults();
        showStatus('');

        if (currentQueue.length === 0) {
            showEmptyState();
            updateProgress();
            updateDashboardMeta();
            return;
        }

        shuffleArray(currentQueue);
        nextWord(true);
        updateDashboardMeta();
    }

    function searchWords() {
        const rawQuery = String(searchInput?.value || '').trim();
        if (!rawQuery) {
            showStatus('请输入要搜索的单词或中文释义');
            clearSearchResults();
            return;
        }

        const query = rawQuery.toLowerCase();
        const matches = findSearchMatches(query);

        if (matches.length === 0) {
            renderSearchResults([]);
            showStatus('没有找到匹配的单词');
            return;
        }

        renderSearchResults(matches);
        showStatus(`找到 ${matches.length} 个匹配结果，点击即可跳转`);
    }

    function findSearchMatches(query) {
        const exactMatches = allWords.filter((word) =>
            String(word.word || '').toLowerCase() === query
        );
        const fuzzyWordMatches = allWords.filter((word) =>
            String(word.word || '').toLowerCase().includes(query) &&
            String(word.word || '').toLowerCase() !== query
        );
        const meaningMatches = allWords.filter((word) =>
            String(word.meaning || '').toLowerCase().includes(query)
        );

        const seenWordIds = new Set();
        return [...exactMatches, ...fuzzyWordMatches, ...meaningMatches].filter((word) => {
            if (!word || seenWordIds.has(word._wordId)) {
                return false;
            }
            seenWordIds.add(word._wordId);
            return true;
        }).slice(0, 50);
    }

    function renderSearchResults(matches) {
        if (!searchResults) {
            return;
        }

        searchResults.innerHTML = '';
        searchResults.classList.remove('hidden');

        if (!matches.length) {
            const empty = document.createElement('span');
            empty.className = 'search-empty';
            empty.textContent = '没有匹配结果';
            searchResults.appendChild(empty);
            return;
        }

        matches.forEach((item) => {
            const resultBtn = document.createElement('button');
            resultBtn.type = 'button';
            resultBtn.className = 'search-result-item ghost-btn';
            resultBtn.dataset.wordId = item._wordId;
            resultBtn.textContent = `${item.word} (${item.unit})`;
            searchResults.appendChild(resultBtn);
        });
    }

    function clearSearchResults() {
        if (!searchResults) {
            return;
        }
        searchResults.innerHTML = '';
        searchResults.classList.add('hidden');
    }

    function openBulkFavoritePanel() {
        if (!bulkFavoriteGroup || !bulkFavoriteInput) {
            return;
        }

        bulkFavoriteGroup.classList.remove('hidden');
        bulkFavoriteInput.focus();
        clearBulkFavoriteSummary();
        showStatus('粘贴多行单词后可一键加入收藏');
    }

    function applyBulkFavoriteWords() {
        if (!bulkFavoriteInput) {
            return;
        }

        const rawLines = String(bulkFavoriteInput.value || '')
            .split(/\r?\n/)
            .map(normalizeWordForLookup)
            .filter(Boolean);

        const uniqueTerms = Array.from(new Set(rawLines));
        if (uniqueTerms.length === 0) {
            renderBulkFavoriteSummary('请输入至少一个英文单词，每行一个。');
            showStatus('请输入要收藏的单词');
            return;
        }

        const wordMap = buildWordLookupMap();
        const missingTerms = [];
        let matchedTerms = 0;
        let addedEntries = 0;
        let alreadyEntries = 0;

        uniqueTerms.forEach((term) => {
            const matches = wordMap.get(term) || [];
            if (matches.length === 0) {
                missingTerms.push(term);
                return;
            }

            matchedTerms += 1;
            matches.forEach((word) => {
                if (isWordFavorited(word)) {
                    alreadyEntries += 1;
                    return;
                }
                setWordFavorited(word, true);
                addedEntries += 1;
            });
        });

        updateFavoriteButton();
        if (favoritesOnlyToggle.checked) {
            initSession();
        } else {
            updateProgress();
            updateDashboardMeta();
        }

        const missingPreview = missingTerms.length
            ? ` 未找到：${missingTerms.slice(0, 8).join('、')}${missingTerms.length > 8 ? ' 等' : ''}。`
            : '';
        const summary = `已处理 ${uniqueTerms.length} 个输入，匹配 ${matchedTerms} 个，新增收藏 ${addedEntries} 个词条，原本已收藏 ${alreadyEntries} 个词条。${missingPreview}`;
        renderBulkFavoriteSummary(summary);
        showStatus(`批量收藏完成：新增 ${addedEntries} 个词条`);
    }

    function buildWordLookupMap() {
        const wordMap = new Map();
        allWords.forEach((word) => {
            const term = normalizeWordForLookup(word.word);
            if (!term) {
                return;
            }
            if (!wordMap.has(term)) {
                wordMap.set(term, []);
            }
            wordMap.get(term).push(word);
        });
        return wordMap;
    }

    function normalizeWordForLookup(value) {
        return String(value || '')
            .trim()
            .replace(/^[\s\d.、\-*]+/, '')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function renderBulkFavoriteSummary(text) {
        if (!bulkFavoriteSummary) {
            return;
        }
        bulkFavoriteSummary.textContent = text;
        bulkFavoriteSummary.classList.toggle('hidden', !text);
    }

    function clearBulkFavoriteSummary() {
        renderBulkFavoriteSummary('');
    }

    function openSearchPanel() {
        if (!searchGroup || !searchInput) {
            return;
        }

        searchGroup.classList.remove('hidden');
        searchInput.focus();
        if (typeof searchInput.select === 'function') {
            searchInput.select();
        }
        showStatus('搜索面板已打开');
    }

    function jumpToWord(found) {
        if (unitSelect.value !== found.unit) {
            unitSelect.value = found.unit;
        }

        if (favoritesOnlyToggle.checked && !isWordFavorited(found)) {
            favoritesOnlyToggle.checked = false;
        }

        initSession();

        const matchIndex = currentQueue.findIndex((word) => word._wordId === found._wordId);
        if (matchIndex === -1) {
            showStatus(hideKnownToggle.checked && isWordKnown(found)
                ? '该单词已标熟，在不看熟词模式下不可见'
                : '该单词在当前筛选条件下不可见');
            return;
        }

        currentIndex = matchIndex;
        currentWord = currentQueue[currentIndex];
        renderCurrentWord();
        showStatus(`已跳转到 ${found.word}`);
    }

    function nextWord(isFirst = false) {
        if (currentQueue.length === 0) {
            showEmptyState();
            updateProgress();
            updateDashboardMeta();
            return;
        }

        if (!isFirst) {
            if (!isRepeatMode) {
                currentIndex += 1;
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

    function previousWord() {
        if (currentQueue.length === 0 || !currentWord || isRepeatMode) {
            return;
        }

        currentIndex = Math.max(currentIndex - 1, 0);
        currentWord = currentQueue[currentIndex];
        renderCurrentWord();
        showStatus(`已返回到 ${currentWord.word}`);
    }

    function toggleMeaning() {
        if (!currentWord) {
            return;
        }

        wordMeaning.classList.toggle('hidden');
        showStatus(wordMeaning.classList.contains('hidden') ? '已隐藏释义' : '已显示释义');
    }

    function toggleConfusingSection() {
        if (!currentWord || confusingBtn.classList.contains('hidden')) {
            return;
        }

        confusingSection.classList.toggle('hidden');
        showStatus(confusingSection.classList.contains('hidden') ? '已收起易混词' : '已展开易混词');
    }

    function toggleExampleSection() {
        if (!currentWord || !currentWord.example) {
            showStatus('\u5f53\u524d\u5355\u8bcd\u6682\u65e0\u4f8b\u53e5');
            return;
        }

        exampleSection.classList.toggle('hidden');
        showStatus(exampleSection.classList.contains('hidden') ? '\u5df2\u6536\u8d77\u4f8b\u53e5' : '\u5df2\u5c55\u5f00\u4f8b\u53e5');
    }

    function toggleMemorySection() {
        if (!currentWord || !currentWord.memory) {
            showStatus('\u5f53\u524d\u5355\u8bcd\u6682\u65e0\u8bb0\u5fc6\u6cd5');
            return;
        }

        memorySection.classList.toggle('hidden');
        showStatus(memorySection.classList.contains('hidden') ? '\u5df2\u6536\u8d77\u8bb0\u5fc6\u6cd5' : '\u5df2\u5c55\u5f00\u8bb0\u5fc6\u6cd5');
    }

    function applyRepeatModeChange() {
        isRepeatMode = repeatToggle.checked;
        if (isRepeatMode && currentQueue.length === 0 && allWords.length > 0) {
            initSession();
            return;
        }
        updateProgress();
        updateDashboardMeta();
    }

    function toggleRepeatMode() {
        repeatToggle.checked = !repeatToggle.checked;
        applyRepeatModeChange();
        showStatus(repeatToggle.checked ? '已开启重复模式' : '已关闭重复模式');
    }

    function applyFavoritesOnlyModeChange() {
        initSession();
        showStatus(favoritesOnlyToggle.checked ? '已切换到收藏模式' : '已关闭收藏模式');
    }

    function toggleFavoritesOnlyMode() {
        favoritesOnlyToggle.checked = !favoritesOnlyToggle.checked;
        applyFavoritesOnlyModeChange();
    }

    function applyHideKnownModeChange() {
        initSession();
        showStatus(hideKnownToggle.checked ? '已开启不看熟词模式' : '已关闭不看熟词模式');
    }

    function toggleHideKnownMode() {
        hideKnownToggle.checked = !hideKnownToggle.checked;
        applyHideKnownModeChange();
    }

    function renderCurrentWord() {
        if (!currentWord) {
            return;
        }

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

        const example = String(currentWord.example || '').trim();
        if (example) {
            exampleText.textContent = example;
            exampleBtn.classList.remove('hidden');
        } else {
            exampleText.textContent = '';
            exampleBtn.classList.add('hidden');
        }
        exampleSection.classList.add('hidden');

        const memory = String(currentWord.memory || '').trim();
        if (memory) {
            memoryText.textContent = memory;
            memoryBtn.classList.remove('hidden');
        } else {
            memoryText.textContent = '';
            memoryBtn.classList.add('hidden');
        }
        memorySection.classList.add('hidden');

        if (currentWord.confusing && String(currentWord.confusing).trim()) {
            const confusingItems = String(currentWord.confusing)
                .split('|')
                .map((item) => item.trim())
                .filter(Boolean);

            confusingText.innerHTML = confusingItems
                .map((item) => `<div class="confusing-item">${item}</div>`)
                .join('');
            confusingBtn.classList.remove('hidden');
        } else {
            confusingText.innerHTML = '';
            confusingBtn.classList.add('hidden');
        }

        confusingSection.classList.add('hidden');
        updateFavoriteButton();
        updateKnownButton();
        updateProgress();
        updateDashboardMeta();
        updateTimerDismissButton();
    }

    function showEmptyState() {
        const selectedUnit = unitSelect.value;
        currentWord = null;

        wordText.textContent = getEmptyStateTitle();
        wordPhonetic.textContent = '';
        wordPhonetic.classList.add('hidden');
        confusingText.innerHTML = '';
        confusingBtn.classList.add('hidden');
        confusingSection.classList.add('hidden');
        exampleText.textContent = '';
        exampleBtn.classList.add('hidden');
        exampleSection.classList.add('hidden');
        memoryText.textContent = '';
        memoryBtn.classList.add('hidden');
        memorySection.classList.add('hidden');

        wordMeaning.textContent = getEmptyStateMessage(selectedUnit);

        currentUnitPill.textContent = selectedUnit === 'all' ? '全部单元' : selectedUnit;
        wordMeaning.classList.remove('hidden');
        updateFavoriteButton();
        updateKnownButton();
        updateTimerDismissButton();
    }

    function showFinished() {
        currentWord = null;
        wordText.textContent = '本轮学习完成';
        wordPhonetic.textContent = '';
        wordPhonetic.classList.add('hidden');
        wordMeaning.textContent = '你可以重新开始、切换单元，或者调整筛选条件继续复习。';
        wordMeaning.classList.remove('hidden');
        confusingText.innerHTML = '';
        confusingBtn.classList.add('hidden');
        confusingSection.classList.add('hidden');
        exampleText.textContent = '';
        exampleBtn.classList.add('hidden');
        exampleSection.classList.add('hidden');
        memoryText.textContent = '';
        memoryBtn.classList.add('hidden');
        memorySection.classList.add('hidden');
        currentUnitPill.textContent = '已完成';
        showStatus('恭喜，当前学习队列已完成');
        updateFavoriteButton();
        updateKnownButton();
        updateProgress();
        updateDashboardMeta();
        updateTimerDismissButton();
    }

    function updateFavoriteButton() {
        const hasWord = Boolean(currentWord);
        favoriteBtn.disabled = !hasWord;

        if (!hasWord) {
            favoriteBtn.textContent = '☆';
            favoriteBtn.classList.remove('favorite-active');
            favoriteBtn.setAttribute('aria-label', '收藏单词');
            return;
        }

        const isFavorited = isWordFavorited(currentWord);
        favoriteBtn.textContent = isFavorited ? '★' : '☆';
        favoriteBtn.classList.toggle('favorite-active', isFavorited);
        favoriteBtn.setAttribute('aria-label', isFavorited ? '取消收藏单词' : '收藏单词');
    }

    function toggleCurrentFavorite() {
        if (!currentWord) {
            return;
        }

        const nextValue = !isWordFavorited(currentWord);
        setWordFavorited(currentWord, nextValue);
        updateFavoriteButton();
        updateProgress();
        updateDashboardMeta();
        showStatus(nextValue ? '已加入收藏' : '已取消收藏');

        if (favoritesOnlyToggle.checked && !nextValue) {
            initSession();
        }
    }

    function updateKnownButton() {
        const hasWord = Boolean(currentWord);
        knownBtn.disabled = !hasWord;

        if (!hasWord) {
            knownBtn.textContent = '熟';
            knownBtn.classList.remove('known-active');
            knownBtn.setAttribute('aria-label', '标熟单词');
            return;
        }

        const isKnown = isWordKnown(currentWord);
        knownBtn.textContent = isKnown ? '已熟' : '熟';
        knownBtn.classList.toggle('known-active', isKnown);
        knownBtn.setAttribute('aria-label', isKnown ? '取消标熟单词' : '标熟单词');
    }

    function toggleCurrentKnown() {
        if (!currentWord) {
            return;
        }

        const nextValue = !isWordKnown(currentWord);
        setWordKnown(currentWord, nextValue);
        updateKnownButton();
        updateProgress();
        updateDashboardMeta();
        showStatus(nextValue ? '已标记为熟词' : '已取消熟词标记');

        if (hideKnownToggle.checked && nextValue) {
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

        persistFavoriteStore();
    }

    function isWordKnown(word) {
        const id = getWordId(word);
        return Boolean(id && knownStore[id]);
    }

    function setWordKnown(word, isKnown) {
        const id = getWordId(word);
        if (!id) {
            return;
        }

        if (isKnown) {
            knownStore[id] = true;
        } else {
            delete knownStore[id];
        }

        persistKnownStore();
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
                if (value === true) {
                    normalized[wordId] = true;
                } else if (value && typeof value === 'object' && value.favorite) {
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
        } catch (error) {
            console.warn('收藏数据保存失败。', error);
        }
    }

    function loadKnownStore() {
        try {
            const raw = localStorage.getItem(KNOWN_STORAGE_KEY);
            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return {};
            }

            const normalized = {};
            Object.entries(parsed).forEach(([wordId, value]) => {
                if (value === true) {
                    normalized[wordId] = true;
                } else if (value && typeof value === 'object' && value.known) {
                    normalized[wordId] = true;
                }
            });
            return normalized;
        } catch (error) {
            console.warn('熟词数据读取失败，已重置。', error);
            return {};
        }
    }

    function persistKnownStore() {
        try {
            localStorage.setItem(KNOWN_STORAGE_KEY, JSON.stringify(knownStore));
        } catch (error) {
            console.warn('熟词数据保存失败。', error);
        }
    }

    function getFavoriteCountByUnit(unit) {
        const scopedWords = unit === 'all'
            ? allWords
            : allWords.filter((word) => word.unit === unit);
        return scopedWords.filter(isWordFavorited).length;
    }

    function getKnownCountByUnit(unit) {
        const scopedWords = unit === 'all'
            ? allWords
            : allWords.filter((word) => word.unit === unit);
        return scopedWords.filter(isWordKnown).length;
    }

    function updateProgress() {
        const favoriteCount = getFavoriteCountByUnit(unitSelect.value);
        const knownCount = getKnownCountByUnit(unitSelect.value);
        const modeLabel = isRepeatMode ? '重复练习' : '顺序学习';
        const favoriteLabel = favoritesOnlyToggle.checked ? ' · 收藏模式' : '';
        const hideKnownLabel = hideKnownToggle.checked ? ' · 不看熟词' : '';

        if (isRepeatMode) {
            const currentUnitText = currentWord ? currentWord.unit : '-';
            progressText.textContent = `当前单元：${currentUnitText} · ${modeLabel} · 收藏 ${favoriteCount} · 熟词 ${knownCount}${favoriteLabel}${hideKnownLabel}`;
            heroProgress.textContent = `循环练习 · 熟词 ${knownCount}`;
            progressFill.style.width = currentQueue.length ? '100%' : '0%';
            return;
        }

        const current = currentQueue.length === 0 ? 0 : Math.min(currentIndex + 1, currentQueue.length);
        progressText.textContent = `进度：${current} / ${currentQueue.length} · 收藏 ${favoriteCount} · 熟词 ${knownCount}${favoriteLabel}${hideKnownLabel}`;
        heroProgress.textContent = `${current} / ${currentQueue.length}`;
        const percent = currentQueue.length === 0 ? 0 : (current / currentQueue.length) * 100;
        progressFill.style.width = `${percent}%`;
    }

    function updateDashboardMeta() {
        const unitLabel = unitSelect.value === 'all' ? '全部单元' : unitSelect.value;
        const modeParts = [];

        if (favoritesOnlyToggle.checked) {
            modeParts.push('收藏');
        }
        modeParts.push(isRepeatMode ? '重复练习' : '顺序学习');
        if (hideKnownToggle.checked) {
            modeParts.push('不看熟词');
        }

        heroMode.textContent = modeParts.join(' · ');
        heroUnit.textContent = unitLabel;
        currentUnitPill.textContent = currentWord ? currentWord.unit : unitLabel;

        if (!currentWord && currentQueue.length === 0) {
            heroProgress.textContent = '0 / 0';
        }
    }

    function getEmptyStateTitle() {
        if (favoritesOnlyToggle.checked && hideKnownToggle.checked) {
            return '当前没有收藏且未标熟的单词';
        }
        if (favoritesOnlyToggle.checked) {
            return '还没有收藏单词';
        }
        if (hideKnownToggle.checked) {
            return '当前没有未标熟的单词';
        }
        return '当前没有可学习的单词';
    }

    function getEmptyStateMessage(selectedUnit) {
        const unitText = selectedUnit === 'all' ? '当前范围' : `当前单元 ${selectedUnit}`;

        if (favoritesOnlyToggle.checked && hideKnownToggle.checked) {
            return `${unitText} 里没有“已收藏且未标熟”的单词；已标熟的收藏词会被不看熟词模式过滤。`;
        }
        if (favoritesOnlyToggle.checked) {
            return selectedUnit === 'all'
                ? '先为一些重点单词点亮星标，再开启收藏模式进行集中复习。'
                : `当前单元 ${selectedUnit} 里还没有收藏的单词。`;
        }
        if (hideKnownToggle.checked) {
            return `${unitText} 里的单词都已标熟，关闭不看熟词模式即可再次查看。`;
        }
        return '请切换单元或调整筛选条件后再试。';
    }

    function showStatus(text) {
        statusMsg.textContent = text || '';
        statusMsg.style.visibility = text ? 'visible' : 'hidden';
    }

    function updateExamCountdown() {
        if (!examCountdown || !examCountdownHelp) {
            return;
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(examTargetDate.getFullYear(), examTargetDate.getMonth(), examTargetDate.getDate());
        const diffMs = target.getTime() - today.getTime();
        const diffDays = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

        examCountdown.textContent = `${diffDays} 天`;

        if (diffDays === 0) {
            examCountdownHelp.textContent = '今天是预计初试日';
        } else if (diffDays === 1) {
            examCountdownHelp.textContent = '距离预计初试还有 1 天';
        } else {
            examCountdownHelp.textContent = '2027考研预计初试';
        }
    }

    function toggleTimer() {
        if (isTimerRunning) {
            pauseTimer();
            return;
        }

        if (isTimerAlarmActive) {
            showStatus(canDismissTimerAlarm()
                ? '请先关闭当前提示音'
                : '请翻到本单元最后一页关闭提示');
            return;
        }

        primeTimerAudio();
        if (timerRemainingSeconds <= 0) {
            timerRemainingSeconds = timerDurationSeconds;
        }

        isTimerRunning = true;
        timerIntervalId = window.setInterval(tickTimer, 1000);
        renderTimer();
        showStatus('计时已开始');
    }

    function pauseTimer() {
        if (timerIntervalId) {
            window.clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
        isTimerRunning = false;
        renderTimer();
        showStatus('计时已暂停');
    }

    function resetTimer() {
        if (timerIntervalId) {
            window.clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
        isTimerRunning = false;
        applyTimerMinutes(false);
        timerRemainingSeconds = timerDurationSeconds;
        renderTimer();
        showStatus(isTimerAlarmActive ? '请翻到本单元最后一页关闭提示' : '计时器已重置');
    }

    function tickTimer() {
        timerRemainingSeconds = Math.max(0, timerRemainingSeconds - 1);
        renderTimer();

        if (timerRemainingSeconds === 0) {
            if (timerIntervalId) {
                window.clearInterval(timerIntervalId);
                timerIntervalId = null;
            }
            isTimerRunning = false;
            startTimerAlarm();
            renderTimer();
            showStatus(canDismissTimerAlarm() ? '计时结束，可关闭提示' : '计时结束，请翻到本单元最后一页关闭提示');
        }
    }

    function applyTimerMinutes(shouldRender = true) {
        const minutes = clampTimerMinutes(timerMinutesInput?.value);
        timerDurationSeconds = minutes * 60;

        if (timerMinutesInput && String(timerMinutesInput.value) !== String(minutes)) {
            timerMinutesInput.value = String(minutes);
        }

        if (!isTimerRunning) {
            timerRemainingSeconds = timerDurationSeconds;
        }

        if (shouldRender) {
            renderTimer();
        }
    }

    function clampTimerMinutes(value) {
        const parsed = Number.parseInt(String(value || ''), 10);
        if (!Number.isFinite(parsed)) {
            return 25;
        }
        return Math.min(180, Math.max(1, parsed));
    }

    function renderTimer() {
        if (!timerDisplay || !timerState || !timerToggleBtn) {
            return;
        }

        timerDisplay.textContent = formatTimerTime(timerRemainingSeconds);
        timerToggleBtn.textContent = isTimerRunning ? '暂停' : '开始';
        if (timerPanel) {
            timerPanel.classList.toggle('timer-alarm', isTimerAlarmActive);
        }
        updateTimerDismissButton();

        if (isTimerAlarmActive) {
            timerState.textContent = canDismissTimerAlarm()
                ? '计时结束，可关闭提示'
                : '计时结束，翻到最后一页关闭';
        } else if (isTimerRunning) {
            timerState.textContent = '专注计时中';
        } else if (timerRemainingSeconds === 0) {
            timerState.textContent = '本轮计时完成';
        } else if (timerRemainingSeconds < timerDurationSeconds) {
            timerState.textContent = '计时已暂停';
        } else {
            timerState.textContent = '设置时长后开始计时';
        }
    }

    function formatTimerTime(totalSeconds) {
        const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function startTimerAlarm() {
        isTimerAlarmActive = true;
        playTimerBeep();

        if (timerAlarmIntervalId) {
            window.clearInterval(timerAlarmIntervalId);
        }

        timerAlarmIntervalId = window.setInterval(() => {
            if (isTimerAlarmActive) {
                playTimerBeep();
            }
        }, 2500);

        updateTimerDismissButton();
    }

    function dismissTimerAlarm() {
        if (!isTimerAlarmActive) {
            return;
        }

        if (!canDismissTimerAlarm()) {
            showStatus('只有翻到本单元最后一页才能关闭提示');
            return;
        }

        stopTimerAlarm(true);
        showStatus('提示音已关闭');
    }

    function stopTimerAlarm(shouldRender = true) {
        if (timerAlarmIntervalId) {
            window.clearInterval(timerAlarmIntervalId);
            timerAlarmIntervalId = null;
        }
        isTimerAlarmActive = false;

        if (shouldRender) {
            renderTimer();
        } else {
            updateTimerDismissButton();
        }
    }

    function updateTimerDismissButton() {
        if (!timerDismissBtn) {
            return;
        }

        const canDismiss = canDismissTimerAlarm();
        timerDismissBtn.classList.toggle('hidden', !canDismiss);
    }

    function canDismissTimerAlarm() {
        return Boolean(
            isTimerAlarmActive
            && (
                currentQueue.length === 0
                || isRepeatMode
                || currentIndex >= currentQueue.length - 1
            )
        );
    }

    function primeTimerAudio() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            return;
        }

        try {
            if (!timerAudioContext) {
                timerAudioContext = new AudioContextClass();
            }
            if (timerAudioContext.state === 'suspended') {
                timerAudioContext.resume();
            }
        } catch (error) {
            timerAudioContext = null;
        }
    }

    function playTimerBeep() {
        primeTimerAudio();
        if (!timerAudioContext) {
            return;
        }

        try {
            const oscillator = timerAudioContext.createOscillator();
            const gainNode = timerAudioContext.createGain();
            const now = timerAudioContext.currentTime;

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            oscillator.connect(gainNode);
            gainNode.connect(timerAudioContext.destination);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } catch (error) {
            // Browsers can block audio in some contexts; the visual timer still works.
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});

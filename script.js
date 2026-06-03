document.addEventListener('DOMContentLoaded', () => {
    const REFLECTION_STORAGE_KEY = 'wordReflections';
    const FAVORITE_STORAGE_KEY = 'wordFavorites';
    const KNOWN_STORAGE_KEY = 'wordKnown';
    const FORMSPREE_URL = 'https://formspree.io/f/mvzwzrdn';

    let allWords = [];
    let currentQueue = [];
    let currentWord = null;
    let isRepeatMode = false;
    let currentIndex = 0;
    let favoriteStore = loadFavoriteStore();
    let knownStore = loadKnownStore();

    const unitSelect = document.getElementById('unit-select');
    const repeatToggle = document.getElementById('repeat-toggle');
    const favoritesOnlyToggle = document.getElementById('favorites-only-toggle');
    const hideKnownToggle = document.getElementById('hide-known-toggle');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    const searchGroup = document.getElementById('search-group');
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
    const progressFill = document.getElementById('progress-fill');
    const statusMsg = document.getElementById('status-msg');
    const favoriteBtn = document.getElementById('favorite-btn');
    const knownBtn = document.getElementById('known-btn');
    const heroMode = document.getElementById('hero-mode');
    const heroUnit = document.getElementById('hero-unit');
    const heroProgress = document.getElementById('hero-progress');
    const currentUnitPill = document.getElementById('current-unit-pill');

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
        isRepeatMode = repeatToggle.checked;
        if (isRepeatMode && currentQueue.length === 0 && allWords.length > 0) {
            initSession();
        }
        updateProgress();
        updateDashboardMeta();
    });

    bind(favoritesOnlyToggle, 'change', () => {
        initSession();
        if (favoritesOnlyToggle.checked) {
            showStatus('已切换到收藏模式');
        }
    });

    bind(hideKnownToggle, 'change', () => {
        initSession();
        showStatus(hideKnownToggle.checked ? '已开启不看熟词模式' : '已关闭不看熟词模式');
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

    bind(confusingBtn, 'click', () => {
        if (!currentWord) {
            return;
        }
        confusingSection.classList.toggle('hidden');
        showStatus(confusingSection.classList.contains('hidden') ? '已收起易混词' : '已展开易混词');
    });

    bind(favoriteBtn, 'click', toggleCurrentFavorite);
    bind(knownBtn, 'click', toggleCurrentKnown);

    bind(skipReflectionBtn, 'click', () => {
        reflectionModal.classList.add('hidden');
        reflectionInput.value = '';
        userNameInput.value = '';
    });

    bind(saveReflectionBtn, 'click', () => {
        const text = reflectionInput.value.trim();
        const userName = userNameInput.value.trim() || '匿名同学';
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
        if (confirm('确定要清空全部学习心得吗？此操作无法撤销。')) {
            localStorage.removeItem(REFLECTION_STORAGE_KEY);
            updateReflectionList();
            showStatus('学习心得已清空');
        }
    });

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

        wordMeaning.textContent = getEmptyStateMessage(selectedUnit);

        currentUnitPill.textContent = selectedUnit === 'all' ? '全部单元' : selectedUnit;
        wordMeaning.classList.remove('hidden');
        updateFavoriteButton();
        updateKnownButton();
    }

    function showFinished() {
        currentWord = null;
        wordText.textContent = '本轮学习完成';
        wordPhonetic.textContent = '';
        wordPhonetic.classList.add('hidden');
        wordMeaning.textContent = '你可以重新开始、切换单元，或者写下这次学习心得。';
        wordMeaning.classList.remove('hidden');
        confusingText.innerHTML = '';
        confusingBtn.classList.add('hidden');
        confusingSection.classList.add('hidden');
        currentUnitPill.textContent = '已完成';
        showStatus('恭喜，当前学习队列已完成');
        updateFavoriteButton();
        updateKnownButton();
        updateProgress();
        updateDashboardMeta();

        setTimeout(() => {
            reflectionModal.classList.remove('hidden');
            reflectionInput.focus();
        }, 350);
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

        if (FORMSPREE_URL.includes('YOUR_FORM_ID')) {
            alert('学习心得已保存在本地。如需自动发送，请在 script.js 中配置 Formspree 地址。');
            return;
        }

        try {
            const response = await fetch(FORMSPREE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `新的学习心得：${userName}（${dateStr}）`,
                    ...reflectionData
                })
            });

            if (response.ok) {
                alert('学习心得已成功保存并发送。');
            } else {
                throw new Error('Formspree response was not ok.');
            }
        } catch (error) {
            console.error('Error sending reflection:', error);
            alert('学习心得已保存在本地，但发送失败，请稍后检查网络。');
        }
    }

    function updateReflectionList() {
        const reflections = JSON.parse(localStorage.getItem(REFLECTION_STORAGE_KEY) || '[]');
        reflectionList.innerHTML = '';

        if (reflections.length === 0) {
            reflectionList.innerHTML = '<p style="color:#69819d;text-align:center;">暂时还没有学习心得记录。</p>';
            return;
        }

        [...reflections].reverse().forEach((item) => {
            const div = document.createElement('div');
            div.className = 'reflection-item';
            div.innerHTML = `
                <span class="reflection-date">${item.date} ${item.time} · ${item.unit} · ${item.name || '匿名同学'}</span>
                <p>${String(item.content || '').replace(/\n/g, '<br>')}</p>
            `;
            reflectionList.appendChild(div);
        });
    }

    function downloadAllReflections() {
        const reflections = JSON.parse(localStorage.getItem(REFLECTION_STORAGE_KEY) || '[]');
        if (!reflections.length) {
            alert('当前没有可导出的学习心得。');
            return;
        }

        let content = '=== English Book 学习心得汇总 ===\n\n';
        reflections.forEach((item) => {
            content += `日期: ${item.date} ${item.time}\n`;
            content += `姓名: ${item.name || '匿名同学'}\n`;
            content += `单元: ${item.unit}\n`;
            content += `内容: ${item.content}\n`;
            content += '----------------------------\n';
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        a.href = url;
        a.download = `english-book-reflections-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
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

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});

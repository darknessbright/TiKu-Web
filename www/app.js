// 题库练习APP - 主逻辑文件

// ==================== 数据管理器 ====================
const DataManager = {
    // 默认进度数据
    defaultProgress: {
        lastPosition: 0,
        practicedIds: [],
        correctCount: 0,
        wrongCount: 0,
        dailyTarget: 100,
        dailyCompleted: 0,
        lastDate: '',
        fontSize: 'medium'
    },

    // 加载进度
    loadProgress() {
        try {
            const data = localStorage.getItem('progress');
            if (data) {
                const progress = JSON.parse(data);
                // 确保所有字段存在
                return { ...this.defaultProgress, ...progress };
            }
        } catch (e) {
            console.error('加载进度失败:', e);
        }
        return { ...this.defaultProgress };
    },

    // 保存进度
    saveProgress(progress) {
        try {
            localStorage.setItem('progress', JSON.stringify(progress));
        } catch (e) {
            console.error('保存进度失败:', e);
        }
    },

    // 加载错题
    loadMistakes() {
        try {
            const data = localStorage.getItem('mistakes');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('加载错题失败:', e);
        }
        return [];
    },

    // 保存错题
    saveMistakes(mistakes) {
        try {
            localStorage.setItem('mistakes', JSON.stringify(mistakes));
        } catch (e) {
            console.error('保存错题失败:', e);
        }
    },

    // 记录答题
    recordAnswer(questionId, isCorrect) {
        const progress = this.loadProgress();

        if (!progress.practicedIds.includes(questionId)) {
            progress.practicedIds.push(questionId);
        }

        if (isCorrect) {
            progress.correctCount++;
        } else {
            progress.wrongCount++;
        }

        // 检查并重置每日进度
        const today = new Date().toISOString().split('T')[0];
        if (progress.lastDate !== today) {
            progress.dailyCompleted = 0;
            progress.lastDate = today;
        }
        progress.dailyCompleted++;

        this.saveProgress(progress);
        return progress;
    },

    // 添加错题
    addMistake(questionId) {
        const mistakes = this.loadMistakes();
        if (!mistakes.find(m => m.questionId === questionId)) {
            mistakes.push({
                questionId: questionId,
                addedTime: new Date().toLocaleString('zh-CN')
            });
            this.saveMistakes(mistakes);
            return true;
        }
        return false;
    },

    // 移除错题
    removeMistake(questionId) {
        let mistakes = this.loadMistakes();
        mistakes = mistakes.filter(m => m.questionId !== questionId);
        this.saveMistakes(mistakes);
    },

    // 获取正确率
    getCorrectRate() {
        const progress = this.loadProgress();
        const total = progress.correctCount + progress.wrongCount;
        return total > 0 ? Math.round(progress.correctCount / total * 100) : 0;
    },

    // 获取每日进度
    getDailyProgress() {
        const progress = this.loadProgress();
        const today = new Date().toISOString().split('T')[0];
        if (progress.lastDate !== today) {
            progress.dailyCompleted = 0;
            progress.lastDate = today;
            this.saveProgress(progress);
        }
        return { completed: progress.dailyCompleted, target: progress.dailyTarget };
    },

    // 清除进度
    clearProgress() {
        const fontSize = this.loadProgress().fontSize;
        this.saveProgress({ ...this.defaultProgress, fontSize });
    },

    // 清空错题
    clearMistakes() {
        this.saveMistakes([]);
    }
};

// ==================== 应用状态 ====================
const AppState = {
    currentScreen: 'home',
    currentIndex: 0,           // 当前题目索引
    questionOrder: [],         // 题目顺序（支持乱序）
    mode: 'sequential',        // 练习模式: sequential, random, mistakes
    selectedOption: null,      // 当前选中的选项
    answered: false,           // 是否已答题
    mistakesList: []           // 错题专项模式的题目列表
};

// ==================== 工具函数 ====================
function showScreen(screenName) {
    // 隐藏所有屏幕
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    // 显示目标屏幕
    document.getElementById(screenName + '-screen').style.display = 'flex';
    AppState.currentScreen = screenName;
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getQuestionById(id) {
    return QUESTIONS.find(q => q.id === id);
}

// ==================== 首页逻辑 ====================
function initHomeScreen() {
    const progress = DataManager.loadProgress();
    const daily = DataManager.getDailyProgress();

    // 更新今日进度
    document.getElementById('home-daily-progress').textContent =
        `今日进度: ${daily.completed} / ${daily.target} 题`;

    // 更新上次位置提示
    document.getElementById('last-position-hint').textContent =
        `(上次: 第${progress.lastPosition + 1}题)`;
}

function setupHomeEvents() {
    // 继续练习
    document.getElementById('btn-continue').addEventListener('click', () => {
        const progress = DataManager.loadProgress();
        startPractice('sequential', progress.lastPosition);
    });

    // 顺序练习
    document.getElementById('btn-sequential').addEventListener('click', () => {
        startPractice('sequential', 0);
    });

    // 乱序练习
    document.getElementById('btn-random').addEventListener('click', () => {
        startPractice('random', 0);
    });

    // 错题专项
    document.getElementById('btn-mistakes-practice').addEventListener('click', () => {
        startPractice('mistakes', 0);
    });

    // 错题本
    document.getElementById('btn-mistakes').addEventListener('click', () => {
        showMistakesScreen();
    });

    // 设置
    document.getElementById('btn-settings').addEventListener('click', () => {
        showSettingsScreen();
    });
}

// ==================== 练习页逻辑 ====================
function startPractice(mode, startIndex) {
    AppState.mode = mode;
    AppState.currentIndex = startIndex;
    AppState.selectedOption = null;
    AppState.answered = false;

    // 准备题目顺序
    if (mode === 'random') {
        AppState.questionOrder = shuffleArray(QUESTIONS.map(q => q.id));
    } else if (mode === 'mistakes') {
        const mistakes = DataManager.loadMistakes();
        AppState.mistakesList = mistakes.map(m => m.questionId);
        if (AppState.mistakesList.length === 0) {
            alert('暂无错题！');
            return;
        }
        AppState.questionOrder = AppState.mistakesList;
    } else {
        AppState.questionOrder = QUESTIONS.map(q => q.id);
    }

    showScreen('practice');
    displayQuestion();
}

function displayQuestion() {
    if (AppState.currentIndex >= AppState.questionOrder.length) {
        alert('已完成所有题目！');
        showScreen('home');
        initHomeScreen();
        return;
    }

    const questionId = AppState.questionOrder[AppState.currentIndex];
    const question = getQuestionById(questionId);

    if (!question) {
        console.error('题目不存在:', questionId);
        return;
    }

    // 更新题号
    document.getElementById('question-number').textContent =
        `第 ${AppState.currentIndex + 1} 题 / 共 ${AppState.questionOrder.length} 题`;

    // 更新题目内容
    document.getElementById('question-text').textContent = question.question;

    // 生成选项
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const options = question.options;
    const optionKeys = Object.keys(options).sort();

    optionKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${key}. ${options[key]}`;
        btn.dataset.option = key;
        btn.addEventListener('click', () => selectOption(key));
        optionsContainer.appendChild(btn);
    });

    // 重置状态
    AppState.selectedOption = null;
    AppState.answered = false;
    document.getElementById('feedback-text').textContent = '';
    document.getElementById('feedback-text').className = '';
}

function selectOption(option) {
    if (AppState.answered) return;

    // 更新选中状态
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.option === option) {
            btn.classList.add('selected');
        }
    });

    AppState.selectedOption = option;
    submitAnswer();
}

function submitAnswer() {
    if (AppState.answered || !AppState.selectedOption) return;

    AppState.answered = true;

    const questionId = AppState.questionOrder[AppState.currentIndex];
    const question = getQuestionById(questionId);
    const isCorrect = AppState.selectedOption === question.answer;

    // 记录答题结果
    DataManager.recordAnswer(questionId, isCorrect);

    // 如果答错，添加到错题本
    if (!isCorrect) {
        DataManager.addMistake(questionId);
    }

    // 显示结果
    const feedbackText = document.getElementById('feedback-text');
    feedbackText.textContent = isCorrect ? '✓ 正确!' : `✗ 错误! 正确答案是 ${question.answer}`;
    feedbackText.className = isCorrect ? 'correct' : 'wrong';

    // 高亮选项
    document.querySelectorAll('.option-btn').forEach(btn => {
        if (btn.dataset.option === question.answer) {
            btn.classList.add('correct');
        } else if (btn.dataset.option === AppState.selectedOption) {
            btn.classList.add('wrong');
        }
    });

    // 更新上次位置
    if (AppState.mode === 'sequential') {
        const progress = DataManager.loadProgress();
        progress.lastPosition = AppState.currentIndex;
        DataManager.saveProgress(progress);
    }
}

function setupPracticeEvents() {
    // 上一题
    document.getElementById('btn-prev').addEventListener('click', () => {
        if (AppState.currentIndex > 0) {
            AppState.currentIndex--;
            displayQuestion();
        }
    });

    // 下一题
    document.getElementById('btn-next').addEventListener('click', () => {
        if (AppState.currentIndex < AppState.questionOrder.length - 1) {
            AppState.currentIndex++;
            displayQuestion();
        } else if (AppState.answered) {
            alert('已完成所有题目！');
            showScreen('home');
            initHomeScreen();
        }
    });

    // 返回首页
    document.getElementById('btn-home-from-practice').addEventListener('click', () => {
        showScreen('home');
        initHomeScreen();
    });
}

// ==================== 错题本逻辑 ====================
function showMistakesScreen() {
    const mistakes = DataManager.loadMistakes();

    // 更新错题数量
    document.getElementById('mistakes-count').textContent = `共 ${mistakes.length} 道错题`;

    // 生成错题列表
    const listContainer = document.getElementById('mistakes-list');
    listContainer.innerHTML = '';

    if (mistakes.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>暂无错题</p></div>';
    } else {
        mistakes.forEach(mistake => {
            const question = getQuestionById(mistake.questionId);
            if (question) {
                const item = document.createElement('div');
                item.className = 'mistake-item';
                item.innerHTML = `
                    <span class="question-preview">${mistake.questionId}. ${question.question}</span>
                    <button class="remove-btn" data-id="${mistake.questionId}">删除</button>
                `;
                listContainer.appendChild(item);
            }
        });

        // 绑定删除事件
        listContainer.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                DataManager.removeMistake(id);
                showMistakesScreen();
            });
        });
    }

    showScreen('mistakes');
}

function setupMistakesEvents() {
    // 添加错题
    document.getElementById('btn-add-mistake').addEventListener('click', () => {
        const input = document.getElementById('add-mistake-input');
        const id = parseInt(input.value);

        if (isNaN(id) || id < 1 || id > QUESTIONS.length) {
            alert('请输入有效的题号 (1-' + QUESTIONS.length + ')');
            return;
        }

        if (DataManager.addMistake(id)) {
            input.value = '';
            showMistakesScreen();
        } else {
            alert('该题目已在错题本中');
        }
    });

    // 返回首页
    document.getElementById('btn-home-from-mistakes').addEventListener('click', () => {
        showScreen('home');
        initHomeScreen();
    });
}

// ==================== 设置页逻辑 ====================
function showSettingsScreen() {
    const progress = DataManager.loadProgress();
    const daily = DataManager.getDailyProgress();
    const mistakes = DataManager.loadMistakes();

    // 更新每日进度
    document.getElementById('settings-daily-progress').textContent =
        `今日: ${daily.completed} / ${daily.target}`;

    // 更新目标输入框
    document.getElementById('target-input').value = progress.dailyTarget;

    // 更新字体大小按钮
    document.querySelectorAll('.font-size-buttons .btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === progress.fontSize);
    });

    // 更新统计
    document.getElementById('stats-total').textContent = QUESTIONS.length;
    document.getElementById('stats-practiced').textContent = progress.practicedIds.length;
    document.getElementById('stats-rate').textContent = DataManager.getCorrectRate() + '%';
    document.getElementById('stats-mistakes').textContent = mistakes.length;

    showScreen('settings');
}

function setupSettingsEvents() {
    // 保存目标
    document.getElementById('btn-save-target').addEventListener('click', () => {
        const target = parseInt(document.getElementById('target-input').value);
        if (target >= 1 && target <= QUESTIONS.length) {
            const progress = DataManager.loadProgress();
            progress.dailyTarget = target;
            DataManager.saveProgress(progress);
            document.getElementById('settings-daily-progress').textContent =
                `今日: ${progress.dailyCompleted} / ${target}`;
            alert('保存成功!');
        } else {
            alert('请输入有效的目标 (1-' + QUESTIONS.length + ')');
        }
    });

    // 字体大小切换
    document.querySelectorAll('.font-size-buttons .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.size;
            const progress = DataManager.loadProgress();
            progress.fontSize = size;
            DataManager.saveProgress(progress);

            // 更新按钮状态
            document.querySelectorAll('.font-size-buttons .btn').forEach(b => {
                b.classList.toggle('active', b === btn);
            });

            // 应用字体大小
            applyFontSize(size);
        });
    });

    // 清除进度
    document.getElementById('btn-clear-progress').addEventListener('click', () => {
        if (confirm('确定要清除所有学习进度吗？此操作不可恢复。')) {
            DataManager.clearProgress();
            alert('进度已清除');
            showSettingsScreen();
        }
    });

    // 清空错题
    document.getElementById('btn-clear-mistakes').addEventListener('click', () => {
        if (confirm('确定要清空错题本吗？此操作不可恢复。')) {
            DataManager.clearMistakes();
            alert('错题本已清空');
            showSettingsScreen();
        }
    });

    // 返回首页
    document.getElementById('btn-home-from-settings').addEventListener('click', () => {
        showScreen('home');
        initHomeScreen();
    });
}

// ==================== 字体大小 ====================
function applyFontSize(size) {
    const app = document.getElementById('app');
    app.classList.remove('font-small', 'font-large');
    if (size !== 'medium') {
        app.classList.add('font-' + size);
    }
}

// ==================== 初始化 ====================
function init() {
    // 应用保存的字体大小
    const progress = DataManager.loadProgress();
    applyFontSize(progress.fontSize);

    // 设置事件监听
    setupHomeEvents();
    setupPracticeEvents();
    setupMistakesEvents();
    setupSettingsEvents();

    // 初始化首页
    initHomeScreen();

    console.log('题库练习APP 初始化完成');
    console.log('题库总数:', QUESTIONS.length);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

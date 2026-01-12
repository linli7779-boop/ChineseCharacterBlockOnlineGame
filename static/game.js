// Game constants
const Mode = {
    ROTATE: 0,
    PINYIN: 1,
    IDIOM: 2
};

// Utility function to strip tone marks from pinyin
function stripToneMarks(text) {
    const toneMap = {
        'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
        'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
        'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
        'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
        'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
        'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
        'ü': 'v'
    };
    return text.toLowerCase().split('').map(
        c => toneMap[c] || c
    ).join('');
}

// Utility function to get tone mark from pinyin
function getToneMark(pinyin) {
    const toneChars = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü';
    for (let char of pinyin) {
        if (toneChars.includes(char)) {
            return char;
        }
    }
    return null;
}

// Utility function to set tone mark on a vowel
function setToneMark(vowel, tone) {
    const toneMap = {
        'a': ['ā', 'á', 'ǎ', 'à'],
        'e': ['ē', 'é', 'ě', 'è'],
        'i': ['ī', 'í', 'ǐ', 'ì'],
        'o': ['ō', 'ó', 'ǒ', 'ò'],
        'u': ['ū', 'ú', 'ǔ', 'ù'],
        'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
    };
    const baseVowel = stripToneMarks(vowel);
    if (toneMap[baseVowel] && tone >= 1 && tone <= 4) {
        return toneMap[baseVowel][tone - 1];
    }
    return vowel;
}

// Generate wrong tone pinyin
function generateWrongTone(pinyin) {
    const toneChars = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü';
    let result = pinyin;
    let foundTone = false;

    for (let i = 0; i < result.length; i++) {
        if (toneChars.includes(result[i])) {
            const baseVowel = stripToneMarks(result[i]);
            const currentTone = toneChars.indexOf(result[i]) % 4 + 1;
            let newTone = (currentTone % 4) + 1; // Next tone
            result = result.substring(0, i) +
                setToneMark(baseVowel, newTone) +
                result.substring(i + 1);
            foundTone = true;
            break;
        }
    }

    // If no tone mark found, add one
    if (!foundTone) {
        const vowels = 'aeiouv';
        for (let i = 0; i < result.length; i++) {
            if (vowels.includes(result[i].toLowerCase())) {
                result = result.substring(0, i) +
                    setToneMark(result[i], 2) +
                    result.substring(i + 1);
                break;
            }
        }
    }

    return result;
}

// Generate wrong initial pinyin
function generateWrongInitial(pinyin) {
    const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
        'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch',
        'sh', 'r', 'z', 'c', 's', 'y', 'w'];
    const wrongInitials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
        'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch',
        'sh', 'r', 'z', 'c', 's', 'y', 'w'];

    let stripped = stripToneMarks(pinyin);
    let currentInitial = '';

    // Extract initial (first 1-2 characters)
    if (stripped.startsWith('zh') || stripped.startsWith('ch') ||
        stripped.startsWith('sh')) {
        currentInitial = stripped.substring(0, 2);
        stripped = stripped.substring(2);
    } else {
        currentInitial = stripped[0];
        stripped = stripped.substring(1);
    }

    // Find a different initial
    let newInitial = currentInitial;
    while (newInitial === currentInitial && wrongInitials.length > 1) {
        newInitial = wrongInitials[
            Math.floor(Math.random() * wrongInitials.length)];
    }

    // Reconstruct with tone mark
    const toneChar = getToneMark(pinyin);
    if (toneChar) {
        const baseVowel = stripToneMarks(toneChar);
        const toneIndex = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü'.indexOf(toneChar);
        const tone = toneIndex >= 0 ? (toneIndex % 4) + 1 : 1;
        const newToneChar = setToneMark(baseVowel, tone);
        return newInitial + stripped.replace(baseVowel, newToneChar);
    }

    return newInitial + stripped;
}

// Generate wrong vowel pinyin
function generateWrongVowel(pinyin) {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'v'];
    const wrongVowels = ['a', 'e', 'i', 'o', 'u', 'v'];

    let stripped = stripToneMarks(pinyin);
    let toneChar = getToneMark(pinyin);
    let baseVowel = '';
    let vowelIndex = -1;

    // Find the vowel with tone mark
    if (toneChar) {
        baseVowel = stripToneMarks(toneChar);
        for (let i = 0; i < stripped.length; i++) {
            if (stripped[i] === baseVowel) {
                vowelIndex = i;
                break;
            }
        }
    } else {
        // Find first vowel
        for (let i = 0; i < stripped.length; i++) {
            if (vowels.includes(stripped[i])) {
                baseVowel = stripped[i];
                vowelIndex = i;
                break;
            }
        }
    }

    if (vowelIndex >= 0) {
        // Find a different vowel
        let newVowel = baseVowel;
        while (newVowel === baseVowel && wrongVowels.length > 1) {
            newVowel = wrongVowels[
                Math.floor(Math.random() * wrongVowels.length)];
        }

        // Preserve tone if exists
        if (toneChar) {
            const toneIndex = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü'.indexOf(toneChar);
            const tone = toneIndex >= 0 ? (toneIndex % 4) + 1 : 1;
            const newToneChar = setToneMark(newVowel, tone);
            return stripped.substring(0, vowelIndex) +
                newToneChar +
                stripped.substring(vowelIndex + 1);
        }

        return stripped.substring(0, vowelIndex) +
            newVowel +
            stripped.substring(vowelIndex + 1);
    }

    return pinyin; // Fallback
}

// Generate 4 pinyin options (correct + 3 wrong ones)
function generatePinyinOptions(correctPinyin) {
    const options = [
        correctPinyin,
        generateWrongTone(correctPinyin),
        generateWrongInitial(correctPinyin),
        generateWrongVowel(correctPinyin)
    ];

    // Shuffle array
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    // Find correct index after shuffling
    const correctIndex = options.indexOf(correctPinyin);

    return { options, correctIndex };
}

// Block class
class Block {
    constructor(x, y, size, char, angle = 0) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.char = char;
        this.angle = angle;
        this.vy = 0.0;
        this.settled = false;
    }

    rect() {
        return {
            left: this.x,
            top: this.y,
            right: this.x + this.size,
            bottom: this.y + this.size,
            width: this.size,
            height: this.size
        };
    }
}

// Grid class
class Grid {
    constructor(left, top, width, height, cell) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
        this.cell = cell;
        this.cols = Math.floor(width / cell);
        this.rows = Math.floor(height / cell);
        this.occupied = Array(this.rows).fill(null).map(
            () => Array(this.cols).fill(null)
        );
    }

    clear() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.occupied[r][c] = null;
            }
        }
    }

    canMove(rect) {
        if (rect.left < this.left ||
            rect.right > this.left + this.width) {
            return false;
        }
        if (rect.bottom > this.top + this.height) {
            return false;
        }
        const c0 = Math.max(0,
            Math.floor((rect.left - this.left) / this.cell));
        const c1 = Math.min(this.cols - 1,
            Math.floor((rect.right - 1 - this.left) / this.cell));
        const r0 = Math.max(0,
            Math.floor((rect.top - this.top) / this.cell));
        const r1 = Math.min(this.rows - 1,
            Math.floor((rect.bottom - 1 - this.top) / this.cell));
        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                if (this.occupied[r][c] !== null) {
                    return false;
                }
            }
        }
        return true;
    }

    settle(block) {
        let gridX = Math.floor((block.x - this.left) / this.cell);
        let gridY = Math.floor((block.y - this.top) / this.cell);
        gridX = Math.max(0, Math.min(this.cols - 1, gridX));
        gridY = Math.max(0, Math.min(this.rows - 1, gridY));
        this.occupied[gridY][gridX] = block.char;
    }

    reachedTop() {
        if (this.rows < 2) {
            for (let c = 0; c < this.cols; c++) {
                if (this.occupied[0][c] !== null) {
                    return true;
                }
            }
        } else {
            for (let c = 0; c < this.cols; c++) {
                if (this.occupied[1][c] !== null) {
                    return true;
                }
            }
        }
        return false;
    }
}

// Main Game class
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set initial canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.charLevels = [];
        this.idiomLevels = [];
        this.idiomLevels = [];

        this.running = true;
        this.mode = null;
        this.score = 0;
        this.level = 1;
        this.rightCount = 0;
        this.targetRight = 1;
        this.showMessageUntil = 0;
        this.message = '';
        this.currentInstruction = '';

        // Layout - will be set by resizeCanvas
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Initial sizing - resizeCanvas will handle proper sizing
        const isMobile = this.isMobile();
        if (isMobile) {
            this.sidebarW = Math.floor(this.width * 0.20);
        } else {
            this.sidebarW = Math.floor(this.width / 5);
        }
        this.playW = this.width - this.sidebarW;

        let blockSize;
        if (isMobile) {
            const minCols = 7;
            const calculatedSize = Math.floor(this.playW / minCols);
            const heightBasedSize = Math.floor(this.height / 12);
            blockSize = Math.min(calculatedSize, heightBasedSize);
            blockSize = Math.max(blockSize, 30);
        } else {
            blockSize = Math.floor(this.height / 10);
        }

        // Cut first column: grid starts one blockSize to the right
        const gridLeft = this.sidebarW + blockSize;
        const gridWidth = this.playW - blockSize;

        this.grid = new Grid(
            gridLeft, 0, gridWidth, this.height, blockSize
        );

        // State for modes
        this.currentBlocks = [];
        this.currentChar = null;
        this.currentPinyin = null;
        this.typed = '';
        this.pinyinOptions = []; // Array of 4 pinyin options
        this.pinyinCorrectIndex = -1; // Index of correct option
        this.idiomTarget = null;
        this.idiomClickIndex = 0;
        this.idiomClickedBlocks = [];
        this.idiomSuccessUntil = 0;
        this.pinyinSuccessUntil = 0;
        this.usedChars = new Set();
        this.settledPinyin = new Map(); // Track pinyin by grid position
        this.idiomHintEnabled = new Map(); // Track pronunciation hint per level

        // Speech synthesis state
        this.speechEnabled = false;
        this.speechQueue = [];
        this.voicesLoaded = false;

        // Physics
        this.gravity = 0.25;
        this.fallSpeed = 2.0;
        this.fastFallSpeed = 8.0;

        // Effects
        this.effects = [];

        // Control state
        this.keys = {};
        this.controlButtons = {
            left: false,
            right: false,
            down: false,
            rotate: false
        };
        this.lastControlAction = {
            left: 0,
            right: 0,
            rotate: 0
        };

        this.setupEventListeners();
        this.setupLevelMenus();
        this.lastTime = performance.now();
        this.dataLoaded = false;
        this.loadLevelData().then(() => {
            this.dataLoaded = true;
            console.log('Game ready');
        });
        this.gameLoop();
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    getFontSize(baseSize) {
        // Scale font size based on screen width
        const scale = this.isMobile() ?
            Math.min(window.innerWidth / 400, 1.0) : 1.0;
        return Math.max(Math.floor(baseSize * scale), 12);
    }

    resizeCanvas() {
        const isMobile = this.isMobile();
        // Use visual viewport or window dimensions, accounting for mobile browser UI
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const vw = window.innerWidth || document.documentElement.clientWidth;
        this.canvas.width = vw;
        this.canvas.height = vh;
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Calculate sidebar width first
        if (isMobile) {
            this.sidebarW = Math.floor(this.width * 0.20);
        } else {
            this.sidebarW = Math.floor(this.width / 5);
        }
        this.playW = this.width - this.sidebarW;

        // Calculate block size
        let blockSize;
        if (isMobile) {
            const minCols = 7;
            const calculatedSize = Math.floor(this.playW / minCols);
            const heightBasedSize = Math.floor(this.height / 12);
            blockSize = Math.min(calculatedSize, heightBasedSize);
            blockSize = Math.max(blockSize, 30);
        } else {
            blockSize = Math.floor(this.height / 10);
        }

        // Cut first column: grid starts one blockSize to the right of sidebar
        // This visually cuts off the first column of the grid
        const gridLeft = this.sidebarW + blockSize;
        const gridWidth = this.playW - blockSize; // Reduce width by one column

        if (this.grid) {
            this.grid = new Grid(
                gridLeft, 0, gridWidth, this.height, blockSize
            );
            if (this.mode !== null) {
                this.grid.clear();
            }
        }
    }

    async loadLevelData() {
        this.charLevels = [];
        this.idiomLevels = [];
        // Load character levels
        for (let i = 1; i <= 14; i++) {
            try {
                const response = await fetch(`/api/levels/${i}`);
                if (!response.ok) {
                    console.warn(`Failed to load level ${i}: ${response.status}`);
                    this.charLevels.push({});
                    continue;
                }
                const data = await response.json();
                this.charLevels.push(data);
                if (Object.keys(data).length > 0) {
                    console.log(`Loaded level ${i} with ${Object.keys(data).length} characters`);
                }
            } catch (e) {
                console.error(`Error loading level ${i}:`, e);
                this.charLevels.push({});
            }
        }
        // Load idiom levels
        for (let i = 1; i <= 6; i++) {
            try {
                const response = await fetch(`/api/idioms/${i}`);
                if (!response.ok) {
                    console.warn(`Failed to load idiom level ${i}: ${response.status}`);
                    this.idiomLevels.push([]);
                    continue;
                }
                const data = await response.json();
                this.idiomLevels.push(data);
                if (data.length > 0) {
                    console.log(`Loaded idiom level ${i} with ${data.length} idioms. ` +
                        `First idiom: ${data[0]}`);
                }
            } catch (e) {
                console.error(`Error loading idiom level ${i}:`, e);
                this.idiomLevels.push([]);
            }
        }
        console.log('Level data loading complete');
    }

    initSpeech() {
        if (!this.speechEnabled && 'speechSynthesis' in window) {
            // Try to load voices immediately
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                this.voicesLoaded = true;
            } else {
                // Wait for voices to load
                const onVoicesChanged = () => {
                    this.voicesLoaded = true;
                    window.speechSynthesis.removeEventListener(
                        'voiceschanged', onVoicesChanged);
                };
                window.speechSynthesis.addEventListener(
                    'voiceschanged', onVoicesChanged);
                // Also try to get voices after a short delay
                setTimeout(() => {
                    if (window.speechSynthesis.getVoices().length > 0) {
                        this.voicesLoaded = true;
                    }
                }, 100);
            }
            this.speechEnabled = true;
            // Process any queued speech
            this.processSpeechQueue();
        }
    }

    setupEventListeners() {
        // Initialize speech on any user interaction
        const initEvents = ['click', 'touchstart', 'keydown'];
        initEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.initSpeech();
            }, { once: true });
        });

        // About button
        const btnAbout = document.getElementById('btn-about');
        if (btnAbout) {
            btnAbout.addEventListener('click', (e) => {
                e.stopPropagation();
                this.initSpeech();
                this.toggleAboutModal();
            });
            btnAbout.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initSpeech();
                this.toggleAboutModal();
            });
        }

        // Mode buttons - show level menu on click
        document.getElementById('btn-rotate').addEventListener(
            'click', (e) => {
                e.stopPropagation();
                this.initSpeech();
                this.hideAboutModal();
                this.toggleLevelMenu('rotate');
            }
        );
        document.getElementById('btn-pinyin').addEventListener(
            'click', (e) => {
                e.stopPropagation();
                this.initSpeech();
                this.hideAboutModal();
                this.toggleLevelMenu('pinyin');
            }
        );
        document.getElementById('btn-idiom').addEventListener(
            'click', (e) => {
                e.stopPropagation();
                this.initSpeech();
                this.hideAboutModal();
                this.toggleLevelMenu('idiom');
            }
        );

        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.game-btn-container')) {
                this.closeAllLevelMenus();
            }
            // Close about modal when clicking on background
            const aboutModal = document.getElementById('about-modal');
            if (aboutModal && aboutModal.classList.contains('show')) {
                if (e.target === aboutModal) {
                    // Clicked on the modal background
                    this.hideAboutModal();
                }
            }
        });

        // Pinyin option buttons
        for (let i = 0; i < 4; i++) {
            const btn = document.getElementById(`pinyin-option-${i}`);
            btn.addEventListener('click', () => {
                this.initSpeech();
                this.handlePinyinOptionClick(i);
            });
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.initSpeech();
                this.handlePinyinOptionClick(i);
            });
        }

        // Control buttons
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnDown = document.getElementById('btn-down');
        const btnRotate = document.getElementById('btn-rotate-control');
        const btnDemo = document.getElementById('btn-demo');

        btnLeft.addEventListener('click', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.handleLeft();
        });
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.handleLeft();
        });

        btnRight.addEventListener('click', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.handleRight();
        });
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.handleRight();
        });

        btnDown.addEventListener('mousedown', () => {
            this.initSpeech();
            this.controlButtons.down = true;
        });
        btnDown.addEventListener('mouseup', () => {
            this.controlButtons.down = false;
        });
        btnDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.controlButtons.down = true;
        });
        btnDown.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.controlButtons.down = false;
        });

        btnRotate.addEventListener('click', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.handleRotate();
        });
        btnRotate.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.handleRotate();
        });

        btnDemo.addEventListener('click', (e) => {
            e.preventDefault();
            this.showVideoModal();
        });
        btnDemo.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.showVideoModal();
        });

        // Close video modal
        const closeVideoBtn = document.getElementById('close-video-btn');
        const videoModal = document.getElementById('video-modal');
        if (closeVideoBtn) {
            closeVideoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideVideoModal();
            });
            closeVideoBtn.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.hideVideoModal();
            });
        }
        if (videoModal) {
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) {
                    this.hideVideoModal();
                }
            });
        }

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (this.mode === Mode.ROTATE && e.key === ' ') {
                e.preventDefault();
                if (this.currentBlocks.length > 0) {
                    const blk = this.currentBlocks[0];
                    blk.angle = (blk.angle + 90) % 360;
                }
            }
            // Typing removed for PINYIN mode - now uses multiple choice buttons
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Canvas click for idiom mode - use mousedown for better responsiveness
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.initSpeech();
            this.onCanvasClick(e);
        });
        // Also handle click as fallback
        this.canvas.addEventListener('click', (e) => {
            if (this.mode === Mode.IDIOM) {
                e.preventDefault();
                this.onCanvasClick(e);
            }
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.initSpeech();
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.onCanvasClick({ offsetX: x, offsetY: y });
        });
    }

    handleLeft() {
        const now = Date.now();
        if (now - this.lastControlAction.left < 100) {
            return; // Prevent rapid clicks
        }
        this.lastControlAction.left = now;
        if (this.currentBlocks.length > 0 &&
            (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN)) {
            const blk = this.currentBlocks[0];
            const newRect = {
                ...blk.rect(),
                left: blk.x - this.grid.cell,
                right: blk.x - this.grid.cell + blk.size
            };
            if (this.grid.canMove(newRect)) {
                blk.x = newRect.left;
            }
        }
    }

    handleRight() {
        const now = Date.now();
        if (now - this.lastControlAction.right < 100) {
            return;
        }
        this.lastControlAction.right = now;
        if (this.currentBlocks.length > 0 &&
            (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN)) {
            const blk = this.currentBlocks[0];
            const newRect = {
                ...blk.rect(),
                left: blk.x + this.grid.cell,
                right: blk.x + this.grid.cell + blk.size
            };
            if (this.grid.canMove(newRect)) {
                blk.x = newRect.left;
            }
        }
    }

    handleRotate() {
        const now = Date.now();
        if (now - this.lastControlAction.rotate < 100) {
            return;
        }
        this.lastControlAction.rotate = now;
        if (this.mode === Mode.ROTATE && this.currentBlocks.length > 0) {
            const blk = this.currentBlocks[0];
            blk.angle = (blk.angle + 90) % 360;
        }
    }

    onCanvasClick(e) {
        if (this.mode !== Mode.IDIOM || !this.idiomTarget) {
            return;
        }
        if (this.idiomClickIndex >= this.idiomTarget.length ||
            this.idiomSuccessUntil > 0) {
            return;
        }

        // Get accurate click coordinates
        // Convert from screen coordinates to canvas internal coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        // Always use clientX/clientY for consistency
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const expected = this.idiomTarget[this.idiomClickIndex];
        for (const blk of this.currentBlocks) {
            if (blk.settled || this.idiomClickedBlocks.includes(blk)) {
                continue;
            }
            const rect = blk.rect();
            // Add small margin for easier clicking (5% of block size)
            const margin = blk.size * 0.05;
            if (x >= rect.left - margin && x < rect.right + margin &&
                y >= rect.top - margin && y < rect.bottom + margin) {
                if (blk.char === expected) {
                    if (!this.idiomClickedBlocks.includes(blk)) {
                        this.idiomClickedBlocks.push(blk);
                    }
                    this.idiomClickIndex++;
                    if (this.idiomClickIndex >= this.idiomTarget.length) {
                        let allCorrect = true;
                        if (this.idiomClickedBlocks.length ===
                            this.idiomTarget.length) {
                            for (let i = 0; i < this.idiomClickedBlocks.length;
                                i++) {
                                if (this.idiomClickedBlocks[i].char !==
                                    this.idiomTarget[i]) {
                                    allCorrect = false;
                                    break;
                                }
                            }
                        } else {
                            allCorrect = false;
                        }

                        if (allCorrect) {
                            for (const clickedBlk of
                                this.idiomClickedBlocks) {
                                clickedBlk.settled = true;
                                clickedBlk.vy = 0;
                            }
                            const groupX = this.grid.left +
                                Math.floor(this.grid.width / 2) -
                                Math.floor(
                                    (this.idiomClickedBlocks.length *
                                        blk.size) / 2
                                );
                            const groupY = this.grid.top + this.grid.cell;
                            for (let i = 0;
                                i < this.idiomClickedBlocks.length; i++) {
                                this.idiomClickedBlocks[i].x =
                                    groupX + i * blk.size;
                                this.idiomClickedBlocks[i].y = groupY;
                            }
                            // Speak the complete idiom when correctly completed
                            if (this.idiomTarget) {
                                this.speakChinese(this.idiomTarget);
                            }
                            this.awardPoints();
                            this.idiomSuccessUntil = Date.now() + 1000;
                        } else {
                            for (const clickedBlk of
                                this.idiomClickedBlocks) {
                                if (this.currentBlocks.includes(clickedBlk)) {
                                    clickedBlk.settled = false;
                                    clickedBlk.vy = this.fallSpeed * 0.1;
                                }
                            }
                            this.idiomClickedBlocks = [];
                            this.idiomClickIndex = 0;
                        }
                    }
                } else {
                    for (const clickedBlk of this.idiomClickedBlocks) {
                        if (this.currentBlocks.includes(clickedBlk)) {
                            clickedBlk.settled = false;
                            clickedBlk.vy = this.fallSpeed * 0.1;
                        }
                    }
                    this.idiomClickedBlocks = [];
                    this.idiomClickIndex = 0;
                }
                return;
            }
        }
    }

    setupLevelMenus() {
        // Setup level menu for ROTATE mode (Levels 1-14)
        const rotateMenu = document.getElementById('level-menu-rotate');
        for (let i = 1; i <= 14; i++) {
            const item = document.createElement('div');
            item.className = 'level-menu-item';
            item.textContent = `Level ${i}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllLevelMenus();
                this.hideAboutModal();
                this.startMode(Mode.ROTATE, i);
            });
            rotateMenu.appendChild(item);
        }

        // Setup level menu for PINYIN mode (Levels 1-14)
        const pinyinMenu = document.getElementById('level-menu-pinyin');
        for (let i = 1; i <= 14; i++) {
            const item = document.createElement('div');
            item.className = 'level-menu-item';
            item.textContent = `Level ${i}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllLevelMenus();
                this.hideAboutModal();
                this.startMode(Mode.PINYIN, i);
            });
            pinyinMenu.appendChild(item);
        }

        // Setup level menu for IDIOM mode (Levels 1-6)
        const idiomMenu = document.getElementById('level-menu-idiom');
        for (let i = 1; i <= 6; i++) {
            const item = document.createElement('div');
            item.className = 'level-menu-item';
            item.textContent = `Level ${i}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllLevelMenus();
                this.hideAboutModal();
                this.idiomHintEnabled.set(i, true);
                this.startMode(Mode.IDIOM, i);
            });
            idiomMenu.appendChild(item);
        }
    }

    toggleLevelMenu(mode) {
        // Close all menus first
        this.closeAllLevelMenus();

        // Toggle the selected menu
        const menuId = `level-menu-${mode}`;
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    closeAllLevelMenus() {
        const menus = document.querySelectorAll('.level-menu');
        menus.forEach(menu => menu.classList.remove('show'));
    }

    toggleAboutModal() {
        const modal = document.getElementById('about-modal');
        if (modal) {
            modal.classList.toggle('show');
        }
    }

    hideAboutModal() {
        const modal = document.getElementById('about-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    showVideoModal() {
        const modal = document.getElementById('video-modal');
        const video = document.getElementById('demo-video');
        if (modal && video) {
            modal.classList.add('show');
            // Reset and play video
            video.currentTime = 0;
            video.play().catch(err => {
                console.log('Video autoplay failed:', err);
            });
        }
    }

    hideVideoModal() {
        const modal = document.getElementById('video-modal');
        const video = document.getElementById('demo-video');
        if (modal) {
            modal.classList.remove('show');
        }
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
    }

    startMode(mode, startLevel = 1) {
        if (!this.dataLoaded) {
            this.message = 'Loading game data...\nPlease wait.';
            this.showMessageUntil = Date.now() + 2000;
            console.log('Data not loaded yet, waiting...');
            // Try again after a short delay
            setTimeout(() => {
                if (this.dataLoaded) {
                    this.startMode(mode, startLevel);
                } else {
                    this.message = 'Failed to load game data.\n' +
                        'Please refresh the page.';
                    this.showMessageUntil = Date.now() + 5000;
                }
            }, 500);
            return;
        }
        this.mode = mode;
        this.level = startLevel;
        console.log(`startMode called with mode=${mode}, startLevel=${startLevel}, setting this.level=${this.level}`);
        this.score = 0;
        this.rightCount = 0;
        this.setTargetRight();
        this.grid.clear();
        this.usedChars.clear();
        this.settledPinyin.clear();

        let instructionText = '';
        if (mode === Mode.ROTATE) {
            instructionText = 'Rotate blocks (Space or ↻) to correct ' +
                'orientation.';
        } else if (mode === Mode.PINYIN) {
            instructionText = 'Select the correct pinyin from the four options on the left side.';
        } else if (mode === Mode.IDIOM) {
            instructionText = 'Click characters in correct idiom order.';
        }
        this.updateInstruction(instructionText);
        this.updatePinyinButtons(); // Hide/show pinyin buttons
        this.closeAllLevelMenus(); // Close level menu after selection
        this.spawnRound();
    }

    setTargetRight() {
        if (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN) {
            const dataset = this.charLevels[this.level - 1] || {};
            const n = Math.max(1,
                Math.floor(Object.keys(dataset).length * 0.1));
            this.targetRight = n;
        } else {
            const dataset = this.idiomLevels[this.level - 1] || [];
            const n = Math.max(1, Math.floor(dataset.length * 0.1));
            this.targetRight = n;
        }
    }

    nextLevel() {
        let maxLevel;
        if (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN) {
            maxLevel = 14;
        } else {
            maxLevel = 6;
        }
        if (this.level < maxLevel) {
            this.level++;
            this.rightCount = 0;
            this.setTargetRight();
            this.grid.clear();
            this.message = 'Next Level';
            this.showMessageUntil = Date.now() + 1000;
            this.usedChars.clear();
            this.settledPinyin.clear();
            this.spawnRound();
        } else {
            this.message = 'All levels complete!';
            this.showMessageUntil = Date.now() + 1500;
        }
    }

    awardPoints() {
        const base = 10 * this.level;
        this.score += base;
        this.rightCount++;
        if ((this.mode === Mode.ROTATE || this.mode === Mode.PINYIN) &&
            this.currentChar) {
            this.usedChars.add(this.currentChar);
        }

        let cx, cy;
        if (this.mode === Mode.IDIOM &&
            this.idiomClickedBlocks.length > 0) {
            const firstBlk = this.idiomClickedBlocks[0];
            const lastBlk = this.idiomClickedBlocks[
                this.idiomClickedBlocks.length - 1];
            cx = Math.floor((firstBlk.x + lastBlk.x + lastBlk.size) / 2);
            cy = firstBlk.y + Math.floor(firstBlk.size / 2);
        } else if ((this.mode === Mode.ROTATE ||
            this.mode === Mode.PINYIN) &&
            this.currentBlocks.length > 0) {
            const blk = this.currentBlocks[0];
            cx = blk.x + Math.floor(blk.size / 2);
            cy = blk.y + Math.floor(blk.size / 2);
        } else {
            cx = this.grid.left + Math.floor(this.grid.width / 2);
            cy = this.grid.top + this.grid.cell;
        }
        this.effects.push({
            x: cx,
            y: cy,
            radius: 4,
            maxRadius: 48,
            created: Date.now()
        });
        this.updateScoreDisplay();
    }

    spawnRound() {
        this.currentBlocks = [];
        this.currentChar = null;
        this.currentPinyin = null;
        this.typed = '';
        this.pinyinOptions = [];
        this.pinyinCorrectIndex = -1;
        this.idiomTarget = null;
        this.idiomClickIndex = 0;
        this.idiomClickedBlocks = [];
        this.idiomSuccessUntil = 0;
        this.pinyinSuccessUntil = 0;

        const size = this.grid.cell;
        if (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN) {
            if (this.level - 1 >= this.charLevels.length) {
                this.message = 'Level data not available';
                this.showMessageUntil = Date.now() + 2000;
                return;
            }
            const dataset = this.charLevels[this.level - 1] || {};
            if (Object.keys(dataset).length === 0) {
                this.message = 'No characters available for this level.\n' +
                    'Please add level data files.';
                this.showMessageUntil = Date.now() + 3000;
                console.warn(`Level ${this.level} data is empty`);
                return;
            }
            let available = {};
            for (const [ch, py] of Object.entries(dataset)) {
                if (!this.usedChars.has(ch)) {
                    available[ch] = py;
                }
            }
            if (Object.keys(available).length === 0) {
                this.usedChars.clear();
                available = dataset;
            }
            const entries = Object.entries(available);
            const [ch, py] = entries[
                Math.floor(Math.random() * entries.length)];
            let angle = 0;
            if (this.mode === Mode.ROTATE) {
                angle = [90, 180, 270][
                    Math.floor(Math.random() * 3)];
            }
            const x = this.grid.left +
                Math.floor(Math.random() * this.grid.cols) * size;
            const block = new Block(
                Math.min(x, this.grid.left + this.grid.width - size),
                0, size, ch, angle
            );
            this.currentBlocks.push(block);
            this.currentChar = ch;
            this.currentPinyin = py;

            // Generate pinyin options for PINYIN mode
            if (this.mode === Mode.PINYIN && py) {
                const { options, correctIndex } =
                    generatePinyinOptions(py);
                this.pinyinOptions = options;
                this.pinyinCorrectIndex = correctIndex;
                this.updatePinyinButtons();
            } else {
                this.updatePinyinButtons(); // Hide buttons for other modes
            }
            console.log(`Spawned block with character: ${ch}, pinyin: ${py}, angle: ${angle}`);
        } else {
            if (this.level - 1 >= this.idiomLevels.length) {
                this.message = 'Level data not available';
                this.showMessageUntil = Date.now() + 2000;
                return;
            }
            const idioms = this.idiomLevels[this.level - 1] || [];
            if (idioms.length === 0) {
                this.message = 'No idioms available for this level.\n' +
                    'Please add idiom level data files.';
                this.showMessageUntil = Date.now() + 3000;
                console.warn(`Idiom level ${this.level} data is empty`);
                return;
            }
            console.log(`Using idiom level ${this.level}, ` +
                `array index ${this.level - 1}, ` +
                `loaded ${idioms.length} idioms. ` +
                `First idiom in array: ${idioms[0]}`);
            const target = idioms[Math.floor(Math.random() * idioms.length)];
            console.log(`Selected idiom: ${target}`);
            this.idiomTarget = target;

            // Speak the idiom if pronunciation hint is enabled
            const hintEnabled = this.idiomHintEnabled.get(this.level) === true;
            if (hintEnabled && target) {
                this.speakChinese(target);
            }

            const chars = target.split('');
            const originalChars = [...chars];
            for (let i = 0; i < 10; i++) {
                for (let j = chars.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [chars[j], chars[k]] = [chars[k], chars[j]];
                }
                if (chars.join('') !== originalChars.join('')) {
                    break;
                }
            }
            const cols = [];
            const availableCols = Array.from(
                { length: this.grid.cols }, (_, i) => i);
            for (let i = 0; i < Math.min(4, this.grid.cols); i++) {
                const idx = Math.floor(
                    Math.random() * availableCols.length);
                cols.push(availableCols.splice(idx, 1)[0]);
            }
            cols.sort((a, b) => a - b);
            for (let i = 0; i < Math.min(chars.length, 4); i++) {
                const x = this.grid.left + cols[i] * size;
                const block = new Block(x, 0, size, chars[i], 0);
                this.currentBlocks.push(block);
            }
        }
    }

    update(dt) {
        const inPinyinDelay = this.mode === Mode.PINYIN &&
            this.pinyinSuccessUntil > 0 &&
            Date.now() < this.pinyinSuccessUntil;

        if (!inPinyinDelay) {
            // Keyboard controls for left/right
            if (this.currentBlocks.length > 0 &&
                (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN)) {
                const blk = this.currentBlocks[0];
                if (this.keys['ArrowLeft'] || this.keys['Left']) {
                    const newRect = {
                        ...blk.rect(),
                        left: blk.x - this.grid.cell,
                        right: blk.x - this.grid.cell + blk.size
                    };
                    if (this.grid.canMove(newRect)) {
                        blk.x = newRect.left;
                    }
                    this.keys['ArrowLeft'] = false;
                    this.keys['Left'] = false;
                }
                if (this.keys['ArrowRight'] || this.keys['Right']) {
                    const newRect = {
                        ...blk.rect(),
                        left: blk.x + this.grid.cell,
                        right: blk.x + this.grid.cell + blk.size
                    };
                    if (this.grid.canMove(newRect)) {
                        blk.x = newRect.left;
                    }
                    this.keys['ArrowRight'] = false;
                    this.keys['Right'] = false;
                }
            }

            const speedY = (this.controlButtons.down ||
                this.keys['ArrowDown'] ||
                this.keys['Down']) ?
                this.fastFallSpeed : this.fallSpeed;
            let actualSpeedY = speedY;
            if (this.mode === Mode.IDIOM) {
                actualSpeedY = speedY * 0.1; // One fifth of previous 0.5 rate
            } else if (this.mode === Mode.ROTATE ||
                this.mode === Mode.PINYIN) {
                // Slow down falling rate for ROTATE and PINYIN modes
                actualSpeedY = speedY * 0.5;
            }

            for (const blk of this.currentBlocks) {
                if (blk.settled) {
                    continue;
                }
                if (this.mode === Mode.IDIOM &&
                    this.idiomClickedBlocks.includes(blk) &&
                    this.idiomClickIndex >= this.idiomTarget.length &&
                    this.idiomClickedBlocks.every(b => b.settled)) {
                    continue;
                }

                const bottomY = blk.y + blk.size;
                const maxBottom = this.grid.top + this.grid.height;

                if (bottomY >= maxBottom) {
                    blk.y = maxBottom - blk.size;
                    blk.vy = 0;
                    blk.settled = true;
                    if (this.mode === Mode.ROTATE) {
                        if (blk.angle % 360 === 0) {
                            // Correct orientation - speak the character
                            if (blk.char) {
                                this.speakChinese(blk.char);
                            }
                            this.awardPoints();
                            this.currentBlocks = [];
                            this.spawnRound();
                            continue;
                        }
                    }
                    this.grid.settle(blk);
                    // Store pinyin for settled block in PINYIN mode
                    if (this.mode === Mode.PINYIN && this.currentPinyin) {
                        const gridX = Math.floor(
                            (blk.x - this.grid.left) / this.grid.cell);
                        const gridY = Math.floor(
                            (blk.y - this.grid.top) / this.grid.cell);
                        this.settledPinyin.set(
                            `${gridX},${gridY}`, this.currentPinyin);
                    }
                    // Speak character when it reaches the bottom
                    if (blk.char &&
                        (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN)) {
                        this.speakChinese(blk.char);
                    }
                    // For idiom mode without hint, speak when blocks reach bottom
                    if (this.mode === Mode.IDIOM && this.idiomTarget) {
                        const hintEnabled = this.idiomHintEnabled.get(this.level) === true;
                        if (!hintEnabled) {
                            // Speak the idiom when all blocks reach bottom
                            if (this.currentBlocks.length === 1) {
                                // Last block reaching bottom, speak the idiom
                                this.speakChinese(this.idiomTarget);
                            }
                        }
                    }
                    this.currentBlocks = this.currentBlocks.filter(
                        b => b !== blk);
                    if (this.mode === Mode.PINYIN) {
                        this.spawnRound();
                    } else if (this.mode === Mode.ROTATE) {
                        this.spawnRound();
                    } else if (this.mode === Mode.IDIOM) {
                        if (this.currentBlocks.length === 0) {
                            this.spawnRound();
                        }
                    }
                    continue;
                }

                const c0 = Math.max(0,
                    Math.floor((blk.x - this.grid.left) / this.grid.cell));
                const c1 = Math.min(this.grid.cols - 1,
                    Math.floor((blk.x + blk.size - 1 - this.grid.left) /
                        this.grid.cell));
                const currentRow = Math.floor(
                    (bottomY - this.grid.top) / this.grid.cell);
                let blockBelow = false;

                if (currentRow < this.grid.rows - 1) {
                    const rowBelow = currentRow + 1;
                    for (let c = c0; c <= c1; c++) {
                        if (this.grid.occupied[rowBelow][c] !== null) {
                            blockBelow = true;
                            const targetY = this.grid.top +
                                rowBelow * this.grid.cell - blk.size;
                            blk.y = targetY;
                            blk.vy = 0;
                            blk.settled = true;
                            if (this.mode === Mode.ROTATE) {
                                if (blk.angle % 360 === 0) {
                                    // Correct orientation - speak the character
                                    if (blk.char) {
                                        this.speakChinese(blk.char);
                                    }
                                    this.awardPoints();
                                    this.currentBlocks = [];
                                    this.spawnRound();
                                    break;
                                }
                            }
                            this.grid.settle(blk);
                            if (this.mode === Mode.PINYIN &&
                                this.currentPinyin) {
                                const gridX = Math.floor(
                                    (blk.x - this.grid.left) /
                                    this.grid.cell);
                                const gridY = Math.floor(
                                    (blk.y - this.grid.top) /
                                    this.grid.cell);
                                this.settledPinyin.set(
                                    `${gridX},${gridY}`,
                                    this.currentPinyin);
                            }
                            // Speak character when it reaches the bottom
                            if (blk.char &&
                                (this.mode === Mode.ROTATE || this.mode === Mode.PINYIN)) {
                                this.speakChinese(blk.char);
                            }
                            // For idiom mode without hint, speak when blocks reach bottom
                            if (this.mode === Mode.IDIOM && this.idiomTarget) {
                                const hintEnabled = this.idiomHintEnabled.get(this.level) === true;
                                if (!hintEnabled) {
                                    // Speak the idiom when all blocks reach bottom
                                    if (this.currentBlocks.length === 1) {
                                        // Last block reaching bottom, speak the idiom
                                        this.speakChinese(this.idiomTarget);
                                    }
                                }
                            }
                            this.currentBlocks = this.currentBlocks.filter(
                                b => b !== blk);
                            if (this.mode === Mode.PINYIN) {
                                this.spawnRound();
                            } else if (this.mode === Mode.ROTATE) {
                                this.spawnRound();
                            } else if (this.mode === Mode.IDIOM) {
                                if (this.currentBlocks.length === 0) {
                                    this.spawnRound();
                                }
                            }
                            break;
                        }
                    }
                }
                if (blockBelow) {
                    continue;
                }

                const newRect = {
                    ...blk.rect(),
                    top: blk.y + actualSpeedY,
                    bottom: blk.y + actualSpeedY + blk.size
                };
                if (this.grid.canMove(newRect)) {
                    blk.y = newRect.top;
                } else {
                    let gridY = Math.floor(
                        (blk.y - this.grid.top) / this.grid.cell);
                    gridY = Math.max(0,
                        Math.min(this.grid.rows - 1, gridY));
                    const targetY = this.grid.top + gridY * this.grid.cell;
                    blk.y = targetY;
                    blk.vy = 0;
                    blk.settled = true;
                    if (this.mode === Mode.ROTATE) {
                        if (blk.angle % 360 === 0) {
                            // Correct orientation - speak the character
                            if (blk.char) {
                                this.speakChinese(blk.char);
                            }
                            this.awardPoints();
                            this.currentBlocks = [];
                            this.spawnRound();
                        } else {
                            this.grid.settle(blk);
                            // Speak character when it settles (even if wrong orientation)
                            if (blk.char) {
                                this.speakChinese(blk.char);
                            }
                            this.spawnRound();
                        }
                    } else if (this.mode === Mode.PINYIN) {
                        this.grid.settle(blk);
                        if (this.currentPinyin) {
                            const gridX = Math.floor(
                                (blk.x - this.grid.left) / this.grid.cell);
                            const gridY = Math.floor(
                                (blk.y - this.grid.top) / this.grid.cell);
                            this.settledPinyin.set(
                                `${gridX},${gridY}`, this.currentPinyin);
                        }
                        // Speak character when it reaches the bottom
                        if (blk.char) {
                            this.speakChinese(blk.char);
                        }
                        this.spawnRound();
                    } else if (this.mode === Mode.IDIOM) {
                        this.grid.settle(blk);
                        // For idiom mode without hint, speak when all blocks settle
                        if (this.idiomTarget) {
                            const hintEnabled = this.idiomHintEnabled.get(this.level) === true;
                            if (!hintEnabled) {
                                // Speak the idiom when all blocks settle
                                if (this.currentBlocks.length === 1) {
                                    // Last block settling, speak the idiom
                                    this.speakChinese(this.idiomTarget);
                                }
                            }
                        }
                        this.currentBlocks = this.currentBlocks.filter(
                            b => b !== blk);
                        if (this.currentBlocks.length === 0) {
                            this.spawnRound();
                        }
                    } else {
                        this.grid.settle(blk);
                    }
                }
            }

            if (this.grid.reachedTop()) {
                this.message = 'Game Over';
                this.showMessageUntil = Date.now() + 6500;
                this.mode = null;
                this.currentBlocks = [];
                this.grid.clear();
                this.updateInstruction('');
            }
        }

        if (this.mode === Mode.PINYIN &&
            this.pinyinSuccessUntil > 0 &&
            Date.now() >= this.pinyinSuccessUntil) {
            this.currentBlocks = [];
            this.spawnRound();
        }

        if (this.mode === Mode.IDIOM &&
            this.idiomSuccessUntil > 0 &&
            Date.now() >= this.idiomSuccessUntil) {
            this.currentBlocks = [];
            this.idiomClickedBlocks = [];
            this.spawnRound();
        }

        const now = Date.now();
        this.effects = this.effects.filter(effect => {
            const age = now - effect.created;
            if (age < 600 && effect.radius < effect.maxRadius) {
                effect.radius += 2;
                return true;
            }
            return false;
        });
    }

    drawBackground() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Clouds
        this.ctx.fillStyle = '#FFFFFF';
        for (let cx = 40; cx < this.width; cx += 180) {
            this.ctx.beginPath();
            this.ctx.arc(cx, 80, 24, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(cx + 24, 80, 20, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(cx + 10, 64, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Grass hill
        this.ctx.fillStyle = '#4CBB17';
        const hillHeight = 60;
        const hillTopY = this.height - hillHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        const numPoints = 20;
        for (let i = 0; i <= numPoints; i++) {
            const x = (i / numPoints) * this.width;
            const curveOffset = 15 * Math.sin((i / numPoints) * Math.PI);
            const y = hillTopY + curveOffset;
            this.ctx.lineTo(x, y);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawPlayfield() {
        // Grid lines
        this.ctx.strokeStyle = '#C8C8C8';
        this.ctx.lineWidth = 1;
        for (let r = 0; r <= this.grid.rows; r++) {
            const y = this.grid.top + r * this.grid.cell;
            this.ctx.beginPath();
            this.ctx.moveTo(this.grid.left, y);
            this.ctx.lineTo(this.grid.left + this.grid.width, y);
            this.ctx.stroke();
        }
        for (let c = 0; c <= this.grid.cols; c++) {
            const x = this.grid.left + c * this.grid.cell;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.grid.top);
            this.ctx.lineTo(x, this.grid.top + this.grid.height);
            this.ctx.stroke();
        }

        // Settled blocks
        for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
                const ch = this.grid.occupied[r][c];
                if (ch !== null) {
                    const x = this.grid.left + c * this.grid.cell;
                    const y = this.grid.top + r * this.grid.cell;
                    this.drawBlock(x, y, this.grid.cell, ch, 0);
                    // Draw pinyin for settled blocks in PINYIN mode
                    if (this.mode === Mode.PINYIN) {
                        const key = `${c},${r}`;
                        const pinyin = this.settledPinyin.get(key);
                        if (pinyin) {
                            this.ctx.fillStyle = '#3232DC';
                            this.ctx.font = `${this.getFontSize(20)}px Arial`;
                            this.ctx.textAlign = 'center';
                            this.ctx.textBaseline = 'bottom';
                            this.ctx.fillText(
                                pinyin,
                                x + this.grid.cell / 2,
                                y - 4
                            );
                        }
                    }
                }
            }
        }

        // Falling blocks
        if (this.mode !== Mode.PINYIN ||
            this.pinyinSuccessUntil === 0 ||
            Date.now() < this.pinyinSuccessUntil) {
            for (const blk of this.currentBlocks) {
                if (this.mode === Mode.IDIOM &&
                    this.idiomClickedBlocks.includes(blk) &&
                    blk.settled) {
                    continue;
                }
                this.drawBlock(blk.x, blk.y, blk.size, blk.char, blk.angle);
            }
        }

        // Draw clicked idiom blocks
        if (this.mode === Mode.IDIOM &&
            this.idiomClickedBlocks.length > 0 &&
            (this.idiomSuccessUntil === 0 ||
                Date.now() < this.idiomSuccessUntil)) {
            for (const blk of this.idiomClickedBlocks) {
                this.drawBlock(blk.x, blk.y, blk.size, blk.char, blk.angle);
            }
        }

        // Score and level are displayed in HTML, not on canvas

        // Center messages
        if (Date.now() < this.showMessageUntil && this.message) {
            const lines = this.message.split('\n');
            const fontSize = this.getFontSize(24);
            const lineHeight = fontSize + 4;
            const totalHeight = lines.length * lineHeight;
            let yStart = Math.floor(
                (this.grid.top + this.grid.height - totalHeight) / 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            for (let i = 0; i < lines.length; i++) {
                const x = this.grid.left + Math.floor(this.grid.width / 2);
                const y = yStart + i * lineHeight;
                this.ctx.fillText(lines[i], x, y);
            }
        }

        // Draw effects
        for (const effect of this.effects) {
            this.ctx.strokeStyle = '#FF8C00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y,
                Math.max(1, effect.radius), 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    drawBlock(x, y, size, ch, angle) {
        if (!ch) {
            console.warn('Attempted to draw block with no character');
            return;
        }
        this.ctx.save();
        this.ctx.translate(x + size / 2, y + size / 2);
        this.ctx.rotate((angle * Math.PI) / 180);
        this.ctx.fillStyle = '#000000';
        // Use a larger font size and ensure Chinese fonts are available
        // Scale font size based on block size and screen size
        const baseFontSize = Math.max(size - 8, this.getFontSize(20));
        const fontSize = this.isMobile() ?
            Math.max(baseFontSize * 0.9, size * 0.6) : baseFontSize;
        this.ctx.font = `${fontSize}px 'SimHei', 'Microsoft YaHei', 'SimSun', 'STHeiti', 'Arial Unicode MS', Arial, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        try {
            this.ctx.fillText(ch, 0, 0);
        } catch (e) {
            console.error('Error drawing character:', ch, e);
            // Fallback: draw a box
            this.ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
        }
        this.ctx.restore();
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent =
            `Score: ${this.score}`;
        document.getElementById('level').textContent =
            `Level: ${this.level}`;
    }

    updateInstruction(text) {
        const instructionElement = document.getElementById('instruction-text');
        if (instructionElement) {
            if (text) {
                instructionElement.textContent = 'Instruction: ' + text;
            } else {
                instructionElement.textContent = '';
            }
        }
    }

    handlePinyinOptionClick(index) {
        if (this.mode !== Mode.PINYIN ||
            this.pinyinOptions.length === 0 ||
            this.pinyinCorrectIndex < 0) {
            return;
        }

        if (index === this.pinyinCorrectIndex) {
            // Correct answer
            this.awardPoints();
            this.pinyinSuccessUntil = Date.now() + 1000;
        } else {
            // Wrong answer - could add feedback here if needed
        }
    }

    updatePinyinButtons() {
        const container = document.getElementById('pinyin-options-container');
        if (!container) return;

        if (this.mode === Mode.PINYIN &&
            this.pinyinOptions.length === 4) {
            container.style.display = 'flex';
            for (let i = 0; i < 4; i++) {
                const btn = document.getElementById(`pinyin-option-${i}`);
                if (btn) {
                    btn.textContent = this.pinyinOptions[i];
                    btn.style.display = 'block';
                }
            }
        } else {
            container.style.display = 'none';
            for (let i = 0; i < 4; i++) {
                const btn = document.getElementById(`pinyin-option-${i}`);
                if (btn) {
                    btn.style.display = 'none';
                }
            }
        }
    }

    processSpeechQueue() {
        if (!this.speechEnabled || this.speechQueue.length === 0) {
            return;
        }

        while (this.speechQueue.length > 0) {
            const text = this.speechQueue.shift();
            this.speakChineseInternal(text);
        }
    }

    speakChinese(text) {
        if (!text) return;

        // If speech is not enabled yet, queue it
        if (!this.speechEnabled) {
            this.speechQueue.push(text);
            return;
        }

        this.speakChineseInternal(text);
    }

    speakChineseInternal(text) {
        // Use Web Speech API to pronounce Chinese characters/idioms
        if (!('speechSynthesis' in window) || !text) {
            return;
        }

        try {
            // Cancel any ongoing speech to avoid overlap
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN'; // Chinese (Mandarin)
            utterance.rate = 0.8; // Slightly slower for clarity
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Function to set voice and speak
            const speakWithVoice = () => {
                try {
                    // Try to find a Chinese voice if available
                    const voices = window.speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        const chineseVoice = voices.find(voice =>
                            voice.lang.startsWith('zh') ||
                            voice.name.toLowerCase().includes('chinese')
                        );
                        if (chineseVoice) {
                            utterance.voice = chineseVoice;
                        }
                    }
                    window.speechSynthesis.speak(utterance);
                } catch (e) {
                    console.warn('Error speaking:', e);
                }
            };

            // On mobile, voices may need time to load
            if (this.voicesLoaded) {
                speakWithVoice();
            } else {
                // Try to get voices
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    this.voicesLoaded = true;
                    speakWithVoice();
                } else {
                    // Wait for voices to load, but also try immediately
                    const onVoicesChanged = () => {
                        this.voicesLoaded = true;
                        speakWithVoice();
                        window.speechSynthesis.removeEventListener(
                            'voiceschanged', onVoicesChanged);
                    };
                    window.speechSynthesis.addEventListener(
                        'voiceschanged', onVoicesChanged);
                    // Also try to speak immediately (some browsers work without waiting)
                    setTimeout(() => {
                        if (!this.voicesLoaded) {
                            speakWithVoice();
                        }
                    }, 50);
                }
            }
        } catch (e) {
            console.warn('Error in speakChinese:', e);
        }
    }

    gameLoop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000.0;
        this.lastTime = now;

        if (this.running) {
            if (this.mode !== null) {
                this.update(dt);
            }
            this.drawBackground();
            this.drawPlayfield();
        }

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});


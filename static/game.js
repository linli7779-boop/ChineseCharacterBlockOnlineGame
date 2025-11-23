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
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.charLevels = [];
        this.idiomLevels = [];
        this.loadLevelData();

        this.running = true;
        this.mode = null;
        this.score = 0;
        this.level = 1;
        this.rightCount = 0;
        this.targetRight = 1;
        this.showMessageUntil = 0;
        this.message = '';
        this.currentInstruction = '';

        // Layout
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.sidebarW = Math.floor(this.width / 5);
        this.playW = this.width - this.sidebarW;

        const blockSize = Math.floor(this.height / 10);
        this.grid = new Grid(
            this.sidebarW, 0, this.playW, this.height, blockSize
        );

        // State for modes
        this.currentBlocks = [];
        this.currentChar = null;
        this.currentPinyin = null;
        this.typed = '';
        this.idiomTarget = null;
        this.idiomClickIndex = 0;
        this.idiomClickedBlocks = [];
        this.idiomSuccessUntil = 0;
        this.pinyinSuccessUntil = 0;
        this.usedChars = new Set();
        this.settledPinyin = new Map(); // Track pinyin by grid position

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
        this.lastTime = performance.now();
        this.dataLoaded = false;
        this.loadLevelData().then(() => {
            this.dataLoaded = true;
            console.log('Game ready');
        });
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.sidebarW = Math.floor(this.width / 5);
        this.playW = this.width - this.sidebarW;
        const blockSize = Math.floor(this.height / 10);
        if (this.grid) {
            this.grid = new Grid(
                this.sidebarW, 0, this.playW, this.height, blockSize
            );
            if (this.mode !== null) {
                this.grid.clear();
            }
        }
    }

    async loadLevelData() {
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
                    console.log(`Loaded idiom level ${i} with ${data.length} idioms`);
                }
            } catch (e) {
                console.error(`Error loading idiom level ${i}:`, e);
                this.idiomLevels.push([]);
            }
        }
        console.log('Level data loading complete');
    }

    setupEventListeners() {
        // Mode buttons
        document.getElementById('btn-rotate').addEventListener(
            'click', () => this.startMode(Mode.ROTATE)
        );
        document.getElementById('btn-pinyin').addEventListener(
            'click', () => this.startMode(Mode.PINYIN)
        );
        document.getElementById('btn-idiom').addEventListener(
            'click', () => this.startMode(Mode.IDIOM)
        );

        // Control buttons
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnDown = document.getElementById('btn-down');
        const btnRotate = document.getElementById('btn-rotate-control');

        btnLeft.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLeft();
        });
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleLeft();
        });

        btnRight.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRight();
        });
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleRight();
        });

        btnDown.addEventListener('mousedown', () => {
            this.controlButtons.down = true;
        });
        btnDown.addEventListener('mouseup', () => {
            this.controlButtons.down = false;
        });
        btnDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.controlButtons.down = true;
        });
        btnDown.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.controlButtons.down = false;
        });

        btnRotate.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRotate();
        });
        btnRotate.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleRotate();
        });

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
            if (this.mode === Mode.PINYIN) {
                if (e.key === 'Backspace') {
                    this.typed = this.typed.slice(0, -1);
                } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                    this.typed += e.key.toLowerCase();
                    if (this.currentPinyin &&
                        stripToneMarks(this.currentPinyin) === this.typed) {
                        this.awardPoints();
                        this.pinyinSuccessUntil = Date.now() + 1000;
                    }
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Canvas click for idiom mode
        this.canvas.addEventListener('click', (e) => {
            this.onCanvasClick(e);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.onCanvasClick({offsetX: x, offsetY: y});
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

        const x = e.offsetX || e.clientX - 
            this.canvas.getBoundingClientRect().left;
        const y = e.offsetY || e.clientY - 
            this.canvas.getBoundingClientRect().top;

        const expected = this.idiomTarget[this.idiomClickIndex];
        for (const blk of this.currentBlocks) {
            if (blk.settled || this.idiomClickedBlocks.includes(blk)) {
                continue;
            }
            const rect = blk.rect();
            if (x >= rect.left && x < rect.right &&
                y >= rect.top && y < rect.bottom) {
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
                            this.awardPoints();
                            this.idiomSuccessUntil = Date.now() + 1000;
                        } else {
                            for (const clickedBlk of 
                                 this.idiomClickedBlocks) {
                                if (this.currentBlocks.includes(clickedBlk)) {
                                    clickedBlk.settled = false;
                                    clickedBlk.vy = this.fallSpeed * 0.5;
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
                            clickedBlk.vy = this.fallSpeed * 0.5;
                        }
                    }
                    this.idiomClickedBlocks = [];
                    this.idiomClickIndex = 0;
                }
                return;
            }
        }
    }

    startMode(mode) {
        if (!this.dataLoaded) {
            this.message = 'Loading game data...\nPlease wait.';
            this.showMessageUntil = Date.now() + 2000;
            console.log('Data not loaded yet, waiting...');
            // Try again after a short delay
            setTimeout(() => {
                if (this.dataLoaded) {
                    this.startMode(mode);
                } else {
                    this.message = 'Failed to load game data.\n' +
                        'Please refresh the page.';
                    this.showMessageUntil = Date.now() + 5000;
                }
            }, 500);
            return;
        }
        this.mode = mode;
        this.level = 1;
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
            instructionText = 'Type pinyin for the character above the block.';
        } else if (mode === Mode.IDIOM) {
            instructionText = 'Click characters in correct idiom order.';
        }
        this.updateInstruction(instructionText);
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
            const x = this.sidebarW + 
                Math.floor(Math.random() * this.grid.cols) * size;
            const block = new Block(
                Math.min(x, this.sidebarW + this.grid.width - size),
                0, size, ch, angle
            );
            this.currentBlocks.push(block);
            this.currentChar = ch;
            this.currentPinyin = py;
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
            const target = idioms[Math.floor(Math.random() * idioms.length)];
            this.idiomTarget = target;
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
                {length: this.grid.cols}, (_, i) => i);
            for (let i = 0; i < Math.min(4, this.grid.cols); i++) {
                const idx = Math.floor(
                    Math.random() * availableCols.length);
                cols.push(availableCols.splice(idx, 1)[0]);
            }
            cols.sort((a, b) => a - b);
            for (let i = 0; i < Math.min(chars.length, 4); i++) {
                const x = this.sidebarW + cols[i] * size;
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
                actualSpeedY = speedY * 0.5;
            } else if (this.mode === Mode.ROTATE || 
                      this.mode === Mode.PINYIN) {
                // Slow down falling rate for ROTATE and PINYIN modes
                actualSpeedY = speedY * 0.7;
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
                            this.awardPoints();
                            this.currentBlocks = [];
                            this.spawnRound();
                        } else {
                            this.grid.settle(blk);
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
                        this.spawnRound();
                    } else if (this.mode === Mode.IDIOM) {
                        this.grid.settle(blk);
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
                            this.ctx.font = '20px Arial';
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
                // Draw typed pinyin above block in PINYIN mode
                if (this.mode === Mode.PINYIN &&
                    this.typed &&
                    (this.pinyinSuccessUntil === 0 ||
                     Date.now() < this.pinyinSuccessUntil)) {
                    this.ctx.fillStyle = '#3232DC';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'bottom';
                    this.ctx.fillText(
                        this.typed,
                        blk.x + blk.size / 2,
                        blk.y - 4
                    );
                }
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

        // HUD: score and level
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        const scoreText = `Score: ${this.score}`;
        const levelText = `Level: ${this.level}`;
        const sx = this.grid.left + this.grid.width - 10;
        this.ctx.fillText(scoreText, sx, 8);
        this.ctx.font = '14px Arial';
        this.ctx.fillText(levelText, sx, 32);

        // Center messages
        if (Date.now() < this.showMessageUntil && this.message) {
            const lines = this.message.split('\n');
            const lineHeight = 24;
            const totalHeight = lines.length * lineHeight;
            let yStart = Math.floor(
                (this.grid.top + this.grid.height - totalHeight) / 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '24px Arial';
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
        const fontSize = Math.max(size - 8, 20);
        this.ctx.font = `${fontSize}px 'SimHei', 'Microsoft YaHei', 'SimSun', 'STHeiti', 'Arial Unicode MS', Arial, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        try {
            this.ctx.fillText(ch, 0, 0);
        } catch (e) {
            console.error('Error drawing character:', ch, e);
            // Fallback: draw a box
            this.ctx.fillRect(-size/4, -size/4, size/2, size/2);
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


document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.querySelector('.game-container');
    const gameOverScreen = document.getElementById('game-over-screen');

    // Buttons
    const startButton = document.getElementById('start-button');
    const retryButton = document.getElementById('retry-button');

    // Game Elements
    const canvas = document.getElementById('game-canvas');
    const context = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const nextCanvas = document.getElementById('next-canvas');
    const nextContext = nextCanvas.getContext('2d');
    const scoreList = document.getElementById('score-list');

    // Audio Elements
    const bgm = document.getElementById('bgm');
    const rotateSound = document.getElementById('rotate-sound');
    const clearSound = document.getElementById('clear-sound');
    const dropSound = document.getElementById('drop-sound');
    const gameOverSound = document.getElementById('game-over-sound');
    const top1Sound = document.getElementById('top1-sound');

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;

    const IMAGE_PATHS = {
        WORK: "work.jpg",
        KARAKUSA: "karakusa.jpg",
        ROUND: "round.jpg",
        SQUARE: "square.jpg",
        SOBAKO: "sobako.jpg",
    };

    let images = {};
    let imagesLoaded = 0;
    const totalImages = Object.keys(IMAGE_PATHS).length;

    let TETROMINOS = [];

    function populateTetrominos() {
        const common = [
            { shape: [[1, 1, 1, 1]], image: images.KARAKUSA }, // I
            { shape: [[0, 1, 0], [1, 1, 1]], image: images.ROUND },   // T
            { shape: [[1, 1, 0], [0, 1, 1]], image: images.KARAKUSA }, // S
            { shape: [[0, 1, 1], [1, 1, 0]], image: images.ROUND },   // Z
            { shape: [[1, 0, 0], [1, 1, 1]], image: images.KARAKUSA }, // J
            { shape: [[0, 0, 1], [1, 1, 1]], image: images.ROUND },   // L
            { shape: [[1, 1], [1, 1]], image: images.SQUARE },   // O
            { shape: [[1, 1, 1], [1, 1, 1]], image: images.WORK }, // work (6-cell block)
        ];

        const rare = [
            { shape: [[1]], image: images.SOBAKO }, // 1-cell rare block
        ];

        // To make sobako rare, we add common blocks multiple times.
        TETROMINOS = [];
        for (let i = 0; i < 5; i++) { // Add common blocks 5 times
            TETROMINOS.push(...common);
        }
        TETROMINOS.push(...rare); // Add rare blocks once
    }

    let board, score, currentTetromino, currentX, currentY, nextTetromino, gameInterval;

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();
        drawCurrentTetromino();
    }

    function drawBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    context.drawImage(board[y][x].image, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }

    function drawCurrentTetromino() {
        const { shape, image } = currentTetromino;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    context.drawImage(image, (currentX + x) * BLOCK_SIZE, (currentY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }

    function drawNextShape() {
        nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const { shape, image } = nextTetromino;
        const blockSize = 20;
        const shapeWidth = shape[0].length * blockSize;
        const shapeHeight = shape.length * blockSize;
        const startX = (nextCanvas.width - shapeWidth) / 2;
        const startY = (nextCanvas.height - shapeHeight) / 2;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    nextContext.drawImage(image, startX + x * blockSize, startY + y * blockSize, blockSize, blockSize);
                }
            }
        }
    }

    function newShape() {
        currentTetromino = nextTetromino;
        currentX = Math.floor(COLS / 2) - Math.floor(currentTetromino.shape[0].length / 2);
        currentY = 0;

        const rand = Math.floor(Math.random() * TETROMINOS.length);
        nextTetromino = TETROMINOS[rand];

        if (collision()) {
            endGame();
            return;
        }
        drawNextShape();
    }

    function update() {
        currentY++;
        if (collision()) {
            currentY--;
            solidify();
            removeLines();
            newShape();
        }
        draw();
    }

    function collision() {
        const { shape } = currentTetromino;
        const blockW = shape[0].length;
        const blockH = shape.length;

        for (let y = 0; y < blockH; y++) {
            for (let x = 0; x < blockW; x++) {
                if (!shape[y][x]) continue;

                let newX = currentX + x;
                let newY = currentY + y;

                if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                if (newY < 0) continue;
                if (board[newY][newX] !== 0) return true;
            }
        }
        return false;
    }

    function solidify() {
        const { shape, image } = currentTetromino;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    board[currentY + y][currentX + x] = { image };
                }
            }
        }
        playSound(dropSound);
    }

    function removeLines() {
        let linesRemoved = 0;
        let bonusScore = 0; // To accumulate bonus for sobako lines
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            let isLineFull = true;
            let hasSobako = false;
            for (let x = 0; x < COLS; x++) {
                if (board[y][x] === 0) {
                    isLineFull = false;
                    continue; // Continue checking other cells in the line
                }
                if (board[y][x].image === images.SOBAKO) {
                    hasSobako = true;
                }
            }

            if (isLineFull) {
                linesRemoved++;
                if (hasSobako) {
                    bonusScore += 20; // Additional 20 points for sobako line (10 + 20 = 30)
                }
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                y++; // Re-check the same row index as it's now a new line
            }
        }
        if (linesRemoved > 0) {
            score += (linesRemoved * 10) + bonusScore;
            scoreElement.textContent = score;
            playSound(clearSound);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (!gameInterval) return;

        if (e.code === 'ArrowLeft') {
            currentX--;
            if (collision()) currentX++;
        } else if (e.code === 'ArrowRight') {
            currentX++;
            if (collision()) currentX--;
        } else if (e.code === 'ArrowDown') {
            currentY++;
            if (collision()) currentY--;
        } else if (e.code === 'Space') {
            e.preventDefault();
            const rotated = [];
            const shape = currentTetromino.shape;
            for (let i = 0; i < shape[0].length; i++) {
                const newRow = [];
                for (let j = shape.length - 1; j >= 0; j--) {
                    newRow.push(shape[j][i]);
                }
                rotated.push(newRow);
            }
            const prevShape = currentTetromino.shape;
            currentTetromino.shape = rotated;
            if (collision()) {
                currentTetromino.shape = prevShape;
            } else {
                playSound(rotateSound);
            }
        }
        draw();
    });

    function getLeaderboard() {
        const scores = localStorage.getItem('tetrisScores');
        return scores ? JSON.parse(scores) : [];
    }

    function updateLeaderboard(newScore) {
        const scores = getLeaderboard();
        scores.push(newScore);
        scores.sort((a, b) => b - a);
        localStorage.setItem('tetrisScores', JSON.stringify(scores.slice(0, 3)));
        displayLeaderboard();
    }

    function displayLeaderboard() {
        const scores = getLeaderboard();
        scoreList.innerHTML = '';
        scores.slice(0, 3).forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            scoreList.appendChild(li);
        });
    }

    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed: " + e));
    }

    function initGame() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0;
        scoreElement.textContent = score;
        populateTetrominos();
        const rand1 = Math.floor(Math.random() * TETROMINOS.length);
        const rand2 = Math.floor(Math.random() * TETROMINOS.length);
        currentTetromino = TETROMINOS[rand1];
        nextTetromino = TETROMINOS[rand2];
        currentX = Math.floor(COLS / 2) - Math.floor(currentTetromino.shape[0].length / 2);
        currentY = 0;
        drawNextShape();
        draw();
    }

    function startGame() {
        initGame();
        gameContainer.style.display = 'flex';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameInterval = setInterval(update, 500);
        bgm.play().catch(e => console.log("BGM play failed: " + e));
    }

    function endGame() {
        clearInterval(gameInterval);
        gameInterval = null;
        bgm.pause();
        
        updateLeaderboard(score);
        const currentLeaderboard = getLeaderboard();
        if (currentLeaderboard.length > 0 && score === currentLeaderboard[0]) {
            playSound(top1Sound);
        } else {
            playSound(gameOverSound);
        }

        finalScoreElement.textContent = score;
        gameContainer.style.display = 'none';
        gameOverScreen.style.display = 'flex';
    }

    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', startGame);

    // Touch controls event listeners
    document.getElementById('move-left').addEventListener('click', () => {
        if (!gameInterval) return;
        currentX--;
        if (collision()) currentX++;
        draw();
    });

    document.getElementById('move-right').addEventListener('click', () => {
        if (!gameInterval) return;
        currentX++;
        if (collision()) currentX--;
        draw();
    });

    document.getElementById('move-down').addEventListener('click', () => {
        if (!gameInterval) return;
        currentY++;
        if (collision()) currentY--;
        draw();
    });

    document.getElementById('rotate').addEventListener('click', () => {
        if (!gameInterval) return;
        const rotated = [];
        const shape = currentTetromino.shape;
        for (let i = 0; i < shape[0].length; i++) {
            const newRow = [];
            for (let j = shape.length - 1; j >= 0; j--) {
                newRow.push(shape[j][i]);
            }
            rotated.push(newRow);
        }
        const prevShape = currentTetromino.shape;
        currentTetromino.shape = rotated;
        if (collision()) {
            currentTetromino.shape = prevShape;
        } else {
            playSound(rotateSound);
        }
        draw();
    });

    document.getElementById('drop').addEventListener('click', () => {
        if (!gameInterval) return;
        while (!collision()) {
            currentY++;
        }
        currentY--;
        solidify();
        removeLines();
        newShape();
        draw();
    });

    // Load images and then initialize
    for (let key in IMAGE_PATHS) {
        images[key] = new Image();
        images[key].src = IMAGE_PATHS[key];
        images[key].onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                populateTetrominos();
                displayLeaderboard();
            }
        };
        images[key].onerror = () => console.error(`Failed to load image: ${IMAGE_PATHS[key]}`);
    }
});

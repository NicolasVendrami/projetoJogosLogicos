const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let lives = 3;
let gameRunning = false;
let isPaused = false;
let currentLevel = 1;
let characterX = 100;
let characterY = 100;
const characterSpeed = 4;
const enemySpeed = characterSpeed * 0.6; // 60% da velocidade do personagem
const projectileSpeed = 10;
const fireBreathCooldown = 5000; // 5 segundos
let projectiles = [];
let enemies = [];
let hearts = [];
let canShoot = true;
let shootCooldown = 300;
let canUseFireBreath = false;
let fireBreathActive = false;
let fireBreathTimer = 0;
let lastFireBreathTime = 0; // Para o cooldown do fire breath

const characterImage = new Image();
characterImage.src = 'images/character.png';

const enemyImage = new Image();
enemyImage.src = 'images/enemy.png';

const strongEnemyImage = new Image();
strongEnemyImage.src = 'images/strong_enemy.png';

const heartImage = new Image();
heartImage.src = 'images/heart.png';

const castleBackground = new Image();
castleBackground.src = 'images/castle_background.jpg';

const anotherBackground = new Image();
anotherBackground.src = 'images/another_background.jpg'; // Outra imagem de fundo

let backgroundImage = castleBackground;
let characterDirection = 'right';

const shootSound = new Audio('sounds/shoot.mp3');
const hitSound = new Audio('sounds/hit.mp3');
const fireBreathSound = new Audio('sounds/fire_breath.mp3');

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    f: false
};

function loadImages() {
    return new Promise((resolve, reject) => {
        let imagesLoaded = 0;
        const totalImages = 6;

        const imageLoadHandler = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                resolve();
            }
        };

        const imageErrorHandler = () => {
            reject('Erro ao carregar imagens. Verifique os caminhos.');
        };

        characterImage.onload = imageLoadHandler;
        enemyImage.onload = imageLoadHandler;
        strongEnemyImage.onload = imageLoadHandler;
        castleBackground.onload = imageLoadHandler;
        heartImage.onload = imageLoadHandler;
        anotherBackground.onload = imageLoadHandler;

        characterImage.onerror = imageErrorHandler;
        enemyImage.onerror = imageErrorHandler;
        strongEnemyImage.onerror = imageErrorHandler;
        castleBackground.onerror = imageErrorHandler;
        heartImage.onerror = imageErrorHandler;
        anotherBackground.onerror = imageErrorHandler;
    });
}

function drawBackground() {
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function changeBackground() {
    backgroundImage = anotherBackground;
}

function drawCharacter(x, y, direction) {
    ctx.save();
    ctx.translate(x + 25, y + 25);
    if (direction === 'left') {
        ctx.rotate(Math.PI);
    }
    ctx.drawImage(characterImage, -25, -25, 50, 50);
    ctx.restore();
}

function drawEnemy(x, y) {
    ctx.drawImage(enemyImage, x, y, 50, 50);
}

function drawStrongEnemy(x, y) {
    ctx.drawImage(strongEnemyImage, x, y, 50, 50);
}

function drawHeart(x, y) {
    ctx.drawImage(heartImage, x, y, 30, 30);
}

function drawProjectile(projectile) {
    ctx.fillStyle = 'red';
    ctx.fillRect(projectile.x, projectile.y, 10, 5);
}

function drawFireBreath(x, y, direction) {
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    if (direction === 'right') {
        ctx.moveTo(x + 25, y + 25);
        ctx.lineTo(x + 100, y + 10);
        ctx.lineTo(x + 100, y + 40);
    } else {
        ctx.moveTo(x + 25, y + 25);
        ctx.lineTo(x - 50, y + 10);
        ctx.lineTo(x - 50, y + 40);
    }
    ctx.closePath();
    ctx.fill();
}

function updateScore(points) {
    score += points;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    document.getElementById('score').innerText = `Pontuação: ${score} | Recorde: ${highScore}`;

    // Atualiza o nível com base na pontuação
    let newLevel = currentLevel;
    if (score >= 10 && score < 30) {
        newLevel = 2;
    } else if (score >= 30 && score < 70) {
        newLevel = 3;
    } else if (score >= 70) {
        newLevel = 4 + Math.floor((score - 70) / 40); // Nivel 4 com 70 pontos, nivel 5 com 110 pontos, e assim por diante
    }

    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
        document.getElementById('level').innerText = `Nível: ${currentLevel}`;
        triggerGlowEffect();
        if (currentLevel == 2) {
            changeBackground();
        }
    }

    if (currentLevel >= 3) {
        canUseFireBreath = true;
    }
}

function updateLives() {
    const hearts = '❤️'.repeat(lives);
    document.getElementById('lives').innerText = hearts;
}

function endGame() {
    gameRunning = false;
    document.getElementById('stats').style.display = 'block';
    document.getElementById('finalScore').innerText = `Pontuação final: ${score}`;
}

function restartGame() {
    document.getElementById('stats').style.display = 'none';
    score = 0;
    lives = 3;
    projectiles = [];
    enemies = [];
    hearts = [];
    gameRunning = true;
    isPaused = false;
    currentLevel = 1;
    backgroundImage = castleBackground;
    document.getElementById('score').innerText = `Pontuação: ${score} | Recorde: ${highScore}`;
    document.getElementById('level').innerText = `Nível: ${currentLevel}`;
    updateLives();
    spawnEnemies();
    gameLoop();
}

function moveCharacter() {
    if (keys.w) characterY -= characterSpeed;
    if (keys.s) characterY += characterSpeed;
    if (keys.a) {
        characterX -= characterSpeed;
        characterDirection = 'left';
    }
    if (keys.d) {
        characterX += characterSpeed;
        characterDirection = 'right';
    }
    // Restringir personagem dentro dos limites do canvas
    characterX = Math.max(0, Math.min(characterX, canvas.width - 50));
    characterY = Math.max(0, Math.min(characterY, canvas.height - 50));
}

function shootProjectile() {
    if (canShoot) {
        const projectile = {
            x: characterX + (characterDirection === 'right' ? 50 : -10),
            y: characterY + 20,
            direction: characterDirection
        };
        projectiles.push(projectile);
        canShoot = false;
        shootSound.play();
        setTimeout(() => {
            canShoot = true;
        }, shootCooldown);
    }
}

function moveProjectiles() {
    for (const projectile of projectiles) {
        if (projectile.direction === 'right') {
            projectile.x += projectileSpeed;
        } else {
            projectile.x -= projectileSpeed;
        }
    }
    projectiles = projectiles.filter(p => p.x >= 0 && p.x <= canvas.width);
}

function activateFireBreath() {
    if (canUseFireBreath && Date.now() - lastFireBreathTime >= fireBreathCooldown) {
        fireBreathActive = true;
        fireBreathSound.play();
        setTimeout(() => {
            fireBreathActive = false;
        }, 3000); // Duração do sopro de fogo
        lastFireBreathTime = Date.now();
    }
}

function spawnEnemy() {
    const x = Math.random() < 0.5 ? 0 : canvas.width - 50;
    const y = Math.random() * (canvas.height - 50);
    const enemyType = Math.random() < 0.3 ? 'strong' : 'normal';
    const enemy = { x, y, type: enemyType };
    enemies.push(enemy);
}

function moveEnemies() {
    for (const enemy of enemies) {
        const dx = characterX - enemy.x;
        const dy = characterY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = enemy.type === 'strong' ? enemySpeed * 1.2 : enemySpeed;
        enemy.x += (dx / distance) * speed;
        enemy.y += (dy / distance) * speed;
    }
}

function spawnHeart() {
    const x = Math.random() * (canvas.width - 30);
    const y = Math.random() * (canvas.height - 30);
    hearts.push({ x, y });
}

function checkCollisions() {
    for (const enemy of enemies) {
        const dx = characterX - enemy.x;
        const dy = characterY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50) {
            lives--;
            hitSound.play();
            if (lives === 0) {
                endGame();
                return;
            }
            updateLives();
            enemies = enemies.filter(e => e !== enemy);
        }
    }

    for (const projectile of projectiles) {
        for (const enemy of enemies) {
            const dx = projectile.x - enemy.x;
            const dy = projectile.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 50) {
                updateScore(enemy.type === 'strong' ? 10 : 5);
                enemies = enemies.filter(e => e !== enemy);
                projectiles = projectiles.filter(p => p !== projectile);
                break;
            }
        }
    }

    for (const heart of hearts) {
        const dx = characterX - heart.x;
        const dy = characterY - heart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50) {
            lives = Math.min(lives + 1, 3);
            updateLives();
            hearts = hearts.filter(h => h !== heart);
        }
    }
}

function drawGame() {
    drawBackground();
    drawCharacter(characterX, characterY, characterDirection);
    for (const enemy of enemies) {
        if (enemy.type === 'strong') {
            drawStrongEnemy(enemy.x, enemy.y);
        } else {
            drawEnemy(enemy.x, enemy.y);
        }
    }
    for (const projectile of projectiles) {
        drawProjectile(projectile);
    }
    for (const heart of hearts) {
        drawHeart(heart.x, heart.y);
    }
    if (fireBreathActive) {
        drawFireBreath(characterX, characterY, characterDirection);
    }
}

function gameLoop() {
    if (gameRunning) {
        if (!isPaused) {
            moveCharacter();
            moveProjectiles();
            moveEnemies();
            checkCollisions();
            drawGame();
        }
        requestAnimationFrame(gameLoop);
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'w') keys.w = true;
    if (event.key === 'a') keys.a = true;
    if (event.key === 's') keys.s = true;
    if (event.key === 'd') keys.d = true;
    if (event.key === ' ') shootProjectile();
    if (event.key === 'f') activateFireBreath();
    if (event.key === 'p') togglePause();
    if (event.key === 'Shift') keys.shift = true;
    if (event.key === 'Enter') {
        if (!gameRunning) startGame();
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'w') keys.w = false;
    if (event.key === 'a') keys.a = false;
    if (event.key === 's') keys.s = false;
    if (event.key === 'd') keys.d = false;
    if (event.key === 'Shift') keys.shift = false;
});

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseButton').innerText = isPaused ? 'Despausar' : 'Pausar';
}

function showControls() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('controlsMenu').style.display = 'block';
}

function startGame() {
    document.getElementById('controlsMenu').style.display = 'none';
    document.getElementById('startMenu').style.display = 'none';
    gameRunning = true;
    spawnEnemies();
    gameLoop();
}

function triggerGlowEffect() {
    const gameContainer = document.getElementById('gameContainer');
    gameContainer.classList.add('glow');
    setTimeout(() => gameContainer.classList.remove('glow'), 1000);
}

function spawnEnemies() {
    spawnEnemy(); // Spawna o primeiro inimigo imediatamente
    setInterval(() => {
        if (gameRunning && !isPaused) {
            spawnEnemy();
        }
    }, 2000); // Spawna um inimigo a cada 2 segundos
}

loadImages().then(() => {
    document.getElementById('startMenu').style.display = 'block';
}).catch(error => {
    console.error(error);
});

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
let enemiesKilled = 0; // Contador de inimigos mortos
let isQuestionVisible = false;
let questionsCorrect = 0; // Contador de perguntas acertadas
let showControlsMenu = false; // Controla a exibição dos controles
let correctAnswers = 0;
let incorrectAnswers = 0;
let totalEnemiesSpawned = 0;




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

const thirdBackground = new Image();
thirdBackground.src = 'images/thirdBackground.jpeg';

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

const questions = [
    { question: "Qual é a capital do Brasil?", answer: "brasilia" },
    { question: "Quantos lados tem um triângulo?", answer: "3" },
    { question: "Qual é a cor do céu?", answer: "azul" },
    { question: "Quanto é 2 + 2?", answer: "4" }
];

const controlsStyle = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    color: 'white',
    fontFamily: 'MedievalFont', // Substitua por uma fonte medieval
    fontSize: '16px',
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

function winGame() {
    gameRunning = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configurações de estilo para a tela de vitória
    ctx.font = '40px Arial';
    ctx.fillStyle = 'green';
    ctx.textAlign = 'center';

    // Exibir "Você Venceu!"
    ctx.fillText('Você Venceu!', canvas.width / 2, canvas.height / 2 - 80);

    // Configurações de estilo para as estatísticas
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';

    // Exibir estatísticas
    ctx.fillText('Pontuação Final: ' + score, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('Inimigos Mortos: ' + enemiesKilled, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Perguntas Certas: ' + correctAnswers, canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('Perguntas Erradas: ' + incorrectAnswers, canvas.width / 2, canvas.height / 2 + 100);
}

function checkWinCondition() {
    // Exemplo de condição de vitória: pontuação >= 100
    if (score >= 60) {
        winGame();
    }
    // Você pode adicionar outras condições, como número de inimigos mortos, nível, etc.
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

function changeBackgroundAgain() {
    backgroundImage = thirdBackground;
}

function drawCharacter(x, y, direction) {
    ctx.save();
    ctx.translate(x + 25, y + 25);
    if (direction === 'left') {
        ctx.scale(-1, 1); // Espelha horizontalmente
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
    if (projectile.direction === 'right') {
        ctx.fillRect(projectile.x, projectile.y, 10, 5);
    } else {
        ctx.fillRect(projectile.x, projectile.y, -10, 5);
    }
}
function drawFireBreath(x, y, direction) {
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    if (direction === 'right') {
        ctx.moveTo(x + 25, y + 25);
        ctx.lineTo(x + 75, y - 25);
        ctx.lineTo(x + 75, y + 75);
    } else {
        ctx.moveTo(x + 25, y + 25);
        ctx.lineTo(x - 50, y - 25);
        ctx.lineTo(x - 50, y + 75);
    }
    ctx.closePath();
    ctx.fill();
}


function updateStats() {
    document.getElementById('score').innerText = `Pontuação: ${score} | Recorde: ${highScore} | Perguntas Acertadas: ${correctAnswers}`;
    document.getElementById('lives').innerText = `❤️❤️❤️`;
    document.getElementById('level').innerText = `Nível: ${currentLevel}`;
    document.getElementById('enemiesKilled').innerText = `Inimigos Mortos: ${enemiesKilled}`;
}

function updateScore(points) {
    score += points;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    document.getElementById('score').innerText = `Pontuação: ${score} | Recorde: ${highScore} | Perguntas Acertadas: ${correctAnswers}`;

    // Exibir pergunta a cada 20 pontos
    if (score % 20 === 0) {
        isQuestionVisible = true;
        showQuestion();
    }

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
        if (currentLevel == 2) {
            changeBackground();
        }
    }

    if (currentLevel >= 3) {
        canUseFireBreath = true;
        changeBackgroundAgain();
    }
}


function updateLives() {
    const hearts = '❤️'.repeat(lives);
    document.getElementById('lives').innerText = hearts;
}

function endGame() {
    gameRunning = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configurações de estilo para a tela de game over
    ctx.font = '40px Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    
    // Exibir "Game Over"
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 140);
    
    // Configurações de estilo para as estatísticas
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    
    showFinalScore();
}

function calculatePercentages() {
    let killPercentage = totalEnemiesSpawned > 0 ? (enemiesKilled / totalEnemiesSpawned) * 100 : 0;
    let totalQuestionsAnswered = correctAnswers + incorrectAnswers;
    let questionAccuracy = totalQuestionsAnswered > 0 ? (correctAnswers / totalQuestionsAnswered) * 100 : 0;

    return {
        killPercentage: killPercentage.toFixed(2),
        questionAccuracy: questionAccuracy.toFixed(2)
    };
}


function showFinalScore() {
    const { killPercentage, questionAccuracy } = calculatePercentages();
    ctx.fillText('Pontuação Final: ' + score, canvas.width / 2, canvas.height / 2 - 100);
    ctx.fillText('Inimigos Mortos: ' + enemiesKilled, canvas.width / 2, canvas.height / 2 - 60);
    ctx.fillText('Total de Inimigos Spawnados: ' + totalEnemiesSpawned, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('Porcentagem de Inimigos Mortos: ' + killPercentage + '%', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Porcentagem de Acertos das Perguntas: ' + questionAccuracy + '%', canvas.width / 2, canvas.height / 2 + 140);
    ctx.fillText('Perguntas Certas: ' + correctAnswers, canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('Perguntas Erradas: ' + incorrectAnswers, canvas.width / 2, canvas.height / 2 + 100);
}



function restartGame() {
    score = 0;
    lives = 3;
    enemies = [];
    projectiles = [];
    currentLevel = 1;
    characterX = 100;
    characterY = 100;
    canUseFireBreath = false;
    fireBreathActive = false;
    fireBreathTimer = 0;
    lastFireBreathTime = 0;
    enemiesKilled = 0;
    questionsCorrect = 0; // Reinicia o contador de perguntas acertadas
    showControlsMenu = false; // Esconde os controles

    updateStats();

    document.getElementById('stats').style.display = 'none';
    gameRunning = true;
    isPaused = false;

    spawnEnemies();
    gameLoop();

    document.getElementById('restartButton').addEventListener('click', () => {
        document.getElementById('stats').style.display = 'none';
        document.getElementById('score').innerText = 'Pontuação: 0 | Recorde: ' + localStorage.getItem('highScore');
        document.getElementById('lives').innerText = '❤️❤️❤️';
        document.getElementById('level').innerText = 'Nível: 1';
        correctAnswers = 0;
        incorrectAnswers = 0;
        gameRunning = true;
        isPaused = false;
        score = 0;
        lives = 3;
        enemies = [];
        strongEnemies = [];
        projectiles = [];
        currentLevel = 1;
        characterX = 100;
        characterY = 100;
        canUseFireBreath = false;
        fireBreathActive = false;
        fireBreathTimer = 0;
        lastFireBreathTime = 0;
        enemiesKilled = 0;
        spawnEnemies();
        gameLoop();
    });

}

function moveCharacter() {
    if (keys.shift) {
        if (keys.w) characterY -= characterSpeed + 2;
        if (keys.s) characterY += characterSpeed + 2;
        if (keys.a) characterX -= characterSpeed + 2;
        if (keys.d) characterX += characterSpeed + 2;
    } else {
        if (keys.w) characterY -= characterSpeed;
        if (keys.s) characterY += characterSpeed;
        if (keys.a) characterX -= characterSpeed;
        if (keys.d) characterX += characterSpeed;
    }

    if (keys.a) characterDirection = 'left';
    if (keys.d) characterDirection = 'right';

    characterX = Math.max(0, Math.min(canvas.width - 50, characterX));
    characterY = Math.max(0, Math.min(canvas.height - 50, characterY));
}

function moveEnemies() {
    enemies.forEach((enemy) => {
        const dx = characterX - enemy.x;
        const dy = characterY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveX = (dx / dist) * enemySpeed;
        const moveY = (dy / dist) * enemySpeed;
        enemy.x += moveX;
        enemy.y += moveY;
    });
}

function handleCollisions() {
    // Verifica se os inimigos colidem com o personagem
    enemies.forEach((enemy, index) => {
        if (characterX < enemy.x + 50 && characterX + 50 > enemy.x &&
            characterY < enemy.y + 50 && characterY + 50 > enemy.y) {
            enemies.splice(index, 1);
            lives -= 1;
            hitSound.play();
            updateLives();
            if (lives <= 0) {
                endGame();
            }
        }
    });

    // Verifica se os projéteis colidem com os inimigos
    projectiles.forEach((projectile, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (projectile.x < enemy.x + 50 && projectile.x + 10 > enemy.x &&
                projectile.y < enemy.y + 50 && projectile.y + 5 > enemy.y) {
                if (enemy.health > 1) {
                    enemy.health -= 1; // Inimigo `strong` perde 1 de vida
                    projectiles.splice(pIndex, 1);
                } else {
                    enemies.splice(eIndex, 1);
                    projectiles.splice(pIndex, 1);
                    updateScore(2); // 2 pontos por inimigo `strong` morto
                    hitSound.play();
                    enemiesKilled += 1;
                }
            }
        });
    });

    // Verifica se o personagem colide com os corações
    hearts.forEach((heart, hIndex) => {
        if (characterX < heart.x + 30 && characterX + 50 > heart.x &&
            characterY < heart.y + 30 && characterY + 50 > heart.y) {
            hearts.splice(hIndex, 1);
            lives += 1;
            updateLives();
        }
    });
}

function handleQuestionAnswer(isCorrect) {
    if (isCorrect) {
        lives++;
        correctAnswers++;
        alert("Resposta correta! Você ganhou uma vida.");
    } else {
        lives--;
        incorrectAnswers++;
        alert("Resposta incorreta! Você perdeu uma vida.");
    }
    updateLives();

    if (lives <= 0) {
        gameRunning = false;
        endGame();
    }

    isQuestionVisible = false;
}


function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (!gameRunning) {
        if (showControlsMenu) {
            handleControlsClick(mouseX, mouseY);
        }
    }
}

function handleControlsClick(x, y) {
    if (showControlsMenu) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (x >= centerX - 30 && x <= centerX + 30 && y >= centerY + 160 && y <= centerY + 200) {
            showControlsMenu = false;
        }
    }
}

function handleFireBreath() {
    if (fireBreathActive) {
        const breathX = characterDirection === 'right' ? characterX : characterX;
        const breathY = characterY;

        // Verifica se o Fire Breath colide com os inimigos
        enemies.forEach((enemy, eIndex) => {
            if (characterDirection === 'right' && enemy.x > breathX && enemy.x < breathX + 75 && enemy.y > breathY - 40 && enemy.y < breathY + 40 ||
                characterDirection === 'left' && enemy.x < breathX + 50 && enemy.x > breathX - 50 && enemy.y > breathY - 40 && enemy.y < breathY + 40) {
                enemies.splice(eIndex, 1);
                updateScore(2); // Fire Breath dá 2 pontos por inimigo atingido
                hitSound.play();
                enemiesKilled += 1;
            }
        });

        drawFireBreath(characterX, characterY, characterDirection); // Desenha o fire breath

        fireBreathTimer += 1;
        if (fireBreathTimer >= 60) {
            fireBreathActive = false;
            fireBreathTimer = 0;
        }
    }
}



function gameLoop() {
    if (!gameRunning) return;
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    drawBackground();
    moveCharacter();
    moveEnemies();
    handleCollisions();
    handleFireBreath();

    drawCharacter(characterX, characterY, characterDirection);

    enemies.forEach(enemy => {
        if (enemy.health > 1) {
            drawStrongEnemy(enemy.x, enemy.y);
        } else {
            drawEnemy(enemy.x, enemy.y);
        }
    });

    hearts.forEach(heart => drawHeart(heart.x, heart.y));
    projectiles.forEach((projectile, pIndex) => {
        drawProjectile(projectile);
        if (projectile.direction === 'right') {
            projectile.x += projectileSpeed;
        } else {
            projectile.x -= projectileSpeed;
        }

        // Remove projéteis que saem da tela
        if (projectile.x > canvas.width || projectile.x < 0) {
            projectiles.splice(pIndex, 1);
        }
    });

    drawControls();

    // Exibir pergunta se necessário
    if (isQuestionVisible) {
        return; // Não avança o loop enquanto a pergunta estiver visível
    }

    checkWinCondition();

    requestAnimationFrame(gameLoop);
}


function showQuestion() {
    const questionIndex = Math.floor(Math.random() * questions.length);
    const { question, answer } = questions[questionIndex];

    const userAnswer = prompt(question);
    const isCorrect = userAnswer && userAnswer.toLowerCase() === answer.toLowerCase();
    handleQuestionAnswer(isCorrect);
}


function askQuestion() {
    const questionIndex = Math.floor(Math.random() * questions.length);
    const { question, answer } = questions[questionIndex];
    const playerAnswer = prompt(question);

    const isCorrect = playerAnswer && playerAnswer.toLowerCase() === answer.toLowerCase();
    handleQuestionAnswer(isCorrect);
}



function drawControls() {
    if (showControlsMenu) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Controles', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '16px Arial';
        ctx.fillText('W - Cima', canvas.width / 2, canvas.height / 2);
        ctx.fillText('A - Esquerda', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('S - Baixo', canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('D - Direita', canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText('Shift - Correr', canvas.width / 2, canvas.height / 2 + 80);
        ctx.fillText('Espaço - Atirar', canvas.width / 2, canvas.height / 2 + 100);
        ctx.fillText('F - Fire Breath', canvas.width / 2, canvas.height / 2 + 120);
        ctx.fillText('P - Pausar', canvas.width / 2, canvas.height / 2 + 140);
        ctx.fillText('Voltar', canvas.width / 2, canvas.height / 2 + 180);
    }
}


function startGame() {
    document.getElementById('startMenu').style.display = 'none';
    gameRunning = true;
    isPaused = false;
    restartGame();
}


function showControls() {
    showControlsMenu = true;
}
function hideControls() {
    isPaused = false;
    gameRunning = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa a tela para continuar o jogo
}


function togglePause() {
    isPaused = !isPaused;
}

function spawnEnemies() {
    setInterval(() => {
        if (!gameRunning || isPaused) return;

        let x, y;
        const side = Math.floor(Math.random() * 4); // Escolhe um lado aleatório (0: cima, 1: direita, 2: baixo, 3: esquerda)
        switch (side) {
            case 0: // Cima
                x = Math.random() * (canvas.width - 50);
                y = -50;
                break;
            case 1: // Direita
                x = canvas.width;
                y = Math.random() * (canvas.height - 50);
                break;
            case 2: // Baixo
                x = Math.random() * (canvas.width - 50);
                y = canvas.height;
                break;
            case 3: // Esquerda
                x = -50;
                y = Math.random() * (canvas.height - 50);
                break;
        }

        totalEnemiesSpawned++;


        const enemyType = Math.random() < 0.8 ? 'normal' : 'strong'; // 80% de chance de ser um inimigo normal

        if (enemyType === 'strong') {
            enemies.push({ x, y, health: 3 }); // Inimigo forte tem mais saúde
        } else {
            enemies.push({ x, y, health: 1 });
        }
    }, 2000);
}


function shootProjectile() {
    if (canShoot) {
        const projectile = { x: characterX + 25, y: characterY + 25, direction: characterDirection };
        projectiles.push(projectile);
        shootSound.play();
        canShoot = false;
        setTimeout(() => {
            canShoot = true;
        }, shootCooldown);
    }
}

function activateFireBreath() {
    if (canUseFireBreath && !fireBreathActive && Date.now() - lastFireBreathTime > fireBreathCooldown) {
        fireBreathActive = true;
        fireBreathSound.play();
        lastFireBreathTime = Date.now();
    }
}

function handleFireBreath() {
    if (fireBreathActive) {
        const breathX = characterDirection === 'right' ? characterX + 50 : characterX - 50;
        const breathY = characterY + 25;

        // Verifica se o Fire Breath colide com os inimigos
        enemies.forEach((enemy, eIndex) => {
            if (characterDirection === 'right' && enemy.x > breathX && enemy.x < breathX + 100 && enemy.y > breathY - 15 && enemy.y < breathY + 15 ||
                characterDirection === 'left' && enemy.x < breathX && enemy.x > breathX - 100 && enemy.y > breathY - 15 && enemy.y < breathY + 15) {
                enemies.splice(eIndex, 1);
                updateScore(2); // Fire Breath dá 2 pontos por inimigo atingido
                hitSound.play();
                enemiesKilled += 1;
            }
        });

        drawFireBreath(breathX, breathY, characterDirection); // Desenha o fire breath

        // Verifica se o Fire Breath colide com o mago
        if (characterDirection === 'right' && characterX < breathX + 100 && characterX + 50 > breathX && characterY < breathY + 15 && characterY + 50 > breathY ||
            characterDirection === 'left' && characterX < breathX && characterX + 50 > breathX - 100 && characterY < breathY + 15 && characterY + 50 > breathY) {
            // Se o mago estiver na área do fire breath, não causa dano
            return;
        }

        fireBreathTimer += 1;
        if (fireBreathTimer >= 60) {
            fireBreathActive = false;
            fireBreathTimer = 0;
        }
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'w') keys.w = true;
    if (event.key === 'a') keys.a = true;
    if (event.key === 's') keys.s = true;
    if (event.key === 'd') keys.d = true;
    if (event.key === 'Shift') keys.shift = true;
    if (event.key === ' ') shootProjectile();
    if (event.key === 'f') activateFireBreath();
    if (event.key === 'p') togglePause();
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'w') keys.w = false;
    if (event.key === 'a') keys.a = false;
    if (event.key === 's') keys.s = false;
    if (event.key === 'd') keys.d = false;
    if (event.key === 'Shift') keys.shift = false;
});

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (mouseX > canvas.width - 210 && mouseX < canvas.width - 10 && mouseY > canvas.height - 70 && mouseY < canvas.height - 10) {
        hideControls();
    }
});

document.addEventListener('mousedown', handleMouseDown);

loadImages().then(() => {
    document.getElementById('startMenu').style.display = 'block';
    document.getElementById('controlsMenu').style.display = 'none'; // Esconder o menu de controles inicialmente
    document.getElementById('startButton').addEventListener('click', showControls); // Adicionar evento de clique para mostrar os controles
    gameLoop(); // Iniciar o loop do jogo
});
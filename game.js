const config = {
    type: Phaser.AUTO, width: 1200, height: 800, parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);

let gameState = 'menu';
let totalCowsEverSaved = parseInt(localStorage.getItem('totalCowsEverSaved')) || 0;
let totalGoldenCowsEver = parseInt(localStorage.getItem('totalGoldenCowsEver')) || 0;

let horse, cowboy, gun;
let enemies, bullets, bgDecorations, powerUps, wolfSkeletons;
let cows = [], cowsToCollect, goldenCows;
let deadCows = [], eatingWolves = [];
let dogCompanion = null;
let baseHorseSpeed = 200, baseFireRate = 300, nextFireTime = 0;
let mouseX = 600, mouseY = 400, horseHP = 3;
let score = 0, highScore = parseInt(localStorage.getItem('cowboyHighScore')) || 0;
let gameTime = 0, bossActive = false, lastBossSpawn = 0;
let totalCowsCollected = 0, cowsForSkills = 0, goldenCowsCollected = 0;
let activePowerUp = null, powerUpTimer = 0, powerUpText = null;
let skillButtons = [], activeSkills = {};
let menuUI = null, gameUI = null, bossDarkOverlay = null;
let wolfSpawnRate = 800, powerUpSpawnRate = 25000;
let lastDifficultyIncrease = 0, lastPowerUpSpawn = 0;

let achievements = {
    firstBlood: false, shepherd: false, godOfWar: false,
    survivor: false, goldenFever: false, hunter: false, legend: false,
    bullfighter: false
};
let wolvesKilled = 0;
let bullsKilled = 0;

const MAP_SIZE = 6000;
const MAP_HALF = MAP_SIZE / 2;
const MAP_LIMIT = MAP_HALF - 200;

let bulls = [];
let bloodStains = [];
let dustParticles = [];
let lastDustTime = 0;

function preload() {}

function create() {
    this.physics.world.setBounds(-MAP_HALF, -MAP_HALF, MAP_SIZE, MAP_SIZE);
    this.add.rectangle(0, 0, MAP_SIZE, MAP_SIZE, 0x7EC850);
    createForestBorders.call(this);
    showMainMenu.call(this);
}

function createForestBorders() {
    let g = this.add.graphics();
    let colors = [0x2D5016, 0x1A3D0F, 0x3A6B1E];
    for (let i = 0; i < 400; i++) {
        let side = Phaser.Math.Between(0, 3);
        let x, y;
        if (side === 0) { x = Phaser.Math.Between(-MAP_HALF, MAP_HALF); y = Phaser.Math.Between(-MAP_HALF, -MAP_HALF + 400); }
        else if (side === 1) { x = Phaser.Math.Between(-MAP_HALF, MAP_HALF); y = Phaser.Math.Between(MAP_HALF - 400, MAP_HALF); }
        else if (side === 2) { x = Phaser.Math.Between(-MAP_HALF, -MAP_HALF + 400); y = Phaser.Math.Between(-MAP_HALF, MAP_HALF); }
        else { x = Phaser.Math.Between(MAP_HALF - 400, MAP_HALF); y = Phaser.Math.Between(-MAP_HALF, MAP_HALF); }
        g.fillStyle(colors[Phaser.Math.Between(0, 2)], 0.8);
        g.fillCircle(x, y, Phaser.Math.Between(30, 70));
    }
    g.fillStyle(0x2D5016, 0.5);
    g.fillRect(-MAP_HALF, -MAP_HALF, MAP_SIZE, 200);
    g.fillRect(-MAP_HALF, MAP_HALF - 200, MAP_SIZE, 200);
    g.fillRect(-MAP_HALF, -MAP_HALF, 200, MAP_SIZE);
    g.fillRect(MAP_HALF - 200, -MAP_HALF, 200, MAP_SIZE);
}

function showMainMenu() {
    gameState = 'menu';
    if (menuUI) { menuUI.destroy(); menuUI = null; }
    menuUI = this.add.container(600, 400);
    menuUI.add(this.add.text(0, -250, '🤠 КОВБОЙ И СТАДО 🐄', { fontSize: '56px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5));
    menuUI.add(this.add.text(0, -180, '🏆 Рекорд: ' + highScore, { fontSize: '28px', fill: '#ffffff' }).setOrigin(0.5));
    menuUI.add(this.add.text(0, -140, '🐄 Всего спасено: ' + totalCowsEverSaved, { fontSize: '24px', fill: '#aaffaa' }).setOrigin(0.5));
    menuUI.add(this.add.text(0, -110, '✨ Золотых: ' + totalGoldenCowsEver, { fontSize: '24px', fill: '#FFD700' }).setOrigin(0.5));
    
    let playBtn = this.add.rectangle(0, 0, 250, 70, 0x228B22, 0.9);
    playBtn.setStrokeStyle(4, 0x00FF00);
    menuUI.add(playBtn);
    menuUI.add(this.add.text(0, 0, '▶ ИГРАТЬ', { fontSize: '32px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    playBtn.setInteractive();
    playBtn.on('pointerover', () => playBtn.setFillStyle(0x32CD32));
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x228B22));
    playBtn.on('pointerdown', () => startGame.call(this));
    
    menuUI.add(this.add.text(0, 150, 'Собирай коров и защищай стадо от волков!\nЛови золотых коров ✨ для бонусов!', { fontSize: '18px', fill: '#aaaaaa', align: 'center' }).setOrigin(0.5));
}

function createHorse() {
    let parts = [
        this.add.ellipse(0, 0, 28, 40, 0x8B4513),
        this.add.rectangle(0, -18, 10, 15, 0x8B4513),
        this.add.ellipse(0, -28, 14, 18, 0x8B4513),
        this.add.triangle(-5, -36, 0, 0, -3, -8, 3, -8, 0x6B3410),
        this.add.triangle(5, -36, 0, 0, -3, -8, 3, -8, 0x6B3410),
        this.add.circle(-3, -30, 1.5, 0x000000),
        this.add.circle(3, -30, 1.5, 0x000000),
        this.add.rectangle(0, -10, 8, 20, 0x3D2817),
        this.add.rectangle(0, 22, 6, 15, 0x3D2817),
        this.add.rectangle(-8, 12, 4, 12, 0x6B3410),
        this.add.rectangle(8, 12, 4, 12, 0x6B3410),
        this.add.rectangle(-8, 18, 4, 12, 0x6B3410),
        this.add.rectangle(8, 18, 4, 12, 0x6B3410)
    ];
    return this.add.container(0, 0, parts);
}

function createCowboy() {
    let cb = this.add.rectangle(0, 0, 20, 24, 0x8B0000);
    let ch = this.add.circle(0, -18, 9, 0xFFCCAA);
    let hb = this.add.ellipse(0, -26, 28, 8, 0x654321);
    let ht = this.add.rectangle(0, -30, 14, 10, 0x654321);
    let bn = this.add.triangle(0, -8, -8, 0, 8, 0, 0, 8, 0xCC0000);
    let g = this.add.rectangle(14, 0, 16, 5, 0x222222);
    gun = g;
    return this.add.container(0, 0, [cb, ch, hb, ht, bn, g]);
}

function updateCowboyWeapon() {
    if (!activePowerUp) {
        if (gun) gun.destroy();
        gun = this.add.rectangle(14, 0, 16, 5, 0x222222);
        cowboy.add(gun);
        return;
    }
    if (gun) gun.destroy();
    let toRemove = [];
    cowboy.list.forEach((child, idx) => { if (idx > 4) toRemove.push(child); });
    toRemove.forEach(c => c.destroy());
    
    let wt = activePowerUp.type;
    if (wt === 'shotgun') { gun = this.add.rectangle(18, 0, 24, 6, 0x8B0000); cowboy.add(this.add.rectangle(30, 0, 8, 4, 0x444444)); }
    else if (wt === 'machinegun') { gun = this.add.rectangle(18, 0, 22, 5, 0x000088); cowboy.add(this.add.rectangle(15, 5, 4, 8, 0x0000AA)); }
    else if (wt === 'minigun') { gun = this.add.rectangle(20, 0, 28, 8, 0x654321); cowboy.add(this.add.rectangle(34, -2, 10, 3, 0x8B4513)); cowboy.add(this.add.rectangle(34, 2, 10, 3, 0x8B4513)); }
    else if (wt === 'multishot') { gun = this.add.rectangle(16, 0, 20, 10, 0xFF6600); cowboy.add(this.add.rectangle(26, 0, 6, 12, 0xFF8800)); }
    else { gun = this.add.rectangle(14, 0, 16, 5, 0x222222); }
    cowboy.add(gun);
}

function clampToMap(obj) {
    if (obj.x < -MAP_LIMIT) obj.x = -MAP_LIMIT;
    if (obj.x > MAP_LIMIT) obj.x = MAP_LIMIT;
    if (obj.y < -MAP_LIMIT) obj.y = -MAP_LIMIT;
    if (obj.y > MAP_LIMIT) obj.y = MAP_LIMIT;
}

function randomMapPos(distMin, distMax) {
    let a = Math.random() * Math.PI * 2;
    let d = Phaser.Math.Between(distMin, distMax);
    let x = horse.x + Math.cos(a) * d;
    let y = horse.y + Math.sin(a) * d;
    x = Phaser.Math.Clamp(x, -MAP_LIMIT, MAP_LIMIT);
    y = Phaser.Math.Clamp(y, -MAP_LIMIT, MAP_LIMIT);
    return { x, y };
}

function startGame() {
    document.querySelectorAll('button').forEach(b => b.remove());
    
    gameState = 'playing';
    if (menuUI) { menuUI.destroy(); menuUI = null; }
    
    score = 0; gameTime = 0; bossActive = false; lastBossSpawn = 0;
    totalCowsCollected = 0; cowsForSkills = 0; goldenCowsCollected = 0;
    cows = []; deadCows = []; eatingWolves = [];
    activePowerUp = null; powerUpTimer = 0;
    activeSkills = {}; dogCompanion = null;
    bossDarkOverlay = null;
    wolfSpawnRate = 800; powerUpSpawnRate = 25000;
    lastDifficultyIncrease = 0; lastPowerUpSpawn = 0;
    horseHP = 3;
    wolvesKilled = 0; bullsKilled = 0;
    bulls = []; bloodStains = []; dustParticles = [];
    lastDustTime = 0;
    
    achievements = {
        firstBlood: false, shepherd: false, godOfWar: false,
        survivor: false, goldenFever: false, hunter: false, legend: false,
        bullfighter: false
    };
    
    horse = createHorse.call(this);
    this.physics.add.existing(horse);
    horse.body.setCollideWorldBounds(true);
    horse.body.setSize(28, 40);
    horse.body.setAllowGravity(false);

    cowboy = createCowboy.call(this);
    horse.add(cowboy);

    enemies = this.physics.add.group();
    bullets = this.physics.add.group();
    bgDecorations = this.add.group();
    wolfSkeletons = this.add.group();
    cowsToCollect = this.physics.add.group();
    goldenCows = this.physics.add.group();
    powerUps = this.physics.add.group();

    this.physics.add.overlap(horse, enemies, hitEnemy, null, this);
    this.physics.add.overlap(bullets, enemies, hitBulletEnemy, null, this);
    this.physics.add.overlap(horse, cowsToCollect, collectCow, null, this);
    this.physics.add.overlap(horse, goldenCows, collectGoldenCow, null, this);
    this.physics.add.overlap(horse, powerUps, collectPowerUp, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,S,A,D');
    this.input.on('pointermove', (p) => { mouseX = p.x; mouseY = p.y; });
    this.input.on('pointerdown', (pointer) => {
        if (pointer.leftButtonDown() && gameState === 'playing') checkSkillButtonClick.call(this, pointer);
    });

    this.time.addEvent({ delay: 1000, callback: spawnObstacle, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 800, callback: spawnEnemy, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 150, callback: spawnBgDecoration, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 2000, callback: spawnBgHill, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 2500, callback: spawnGrassPatch, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 3000, callback: spawnCow, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 45000, callback: spawnGoldenCow, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 30000, callback: spawnBull, callbackScope: this, loop: true });

    gameUI = this.add.container(0, 0);
    gameUI.setScrollFactor(0);
    
    this.hpText = this.add.text(10, 10, '', { fontSize: '32px', fill: '#ff0000' });
    gameUI.add(this.hpText);
    updateHPDisplay.call(this);
    this.scoreText = this.add.text(10, 50, 'Счет: 0', { fontSize: '24px', fill: '#ffffff' });
    gameUI.add(this.scoreText);
    this.cowCountText = this.add.text(10, 80, 'Коровы: 0', { fontSize: '24px', fill: '#ffffff' });
    gameUI.add(this.cowCountText);
    this.goldenCowText = this.add.text(10, 110, '✨ 0/3', { fontSize: '20px', fill: '#FFD700' });
    gameUI.add(this.goldenCowText);
    this.timeText = this.add.text(10, 140, 'Время: 0:00', { fontSize: '24px', fill: '#ffffff' });
    gameUI.add(this.timeText);
    powerUpText = this.add.text(600, 50, '', { fontSize: '32px', fill: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);
    gameUI.add(powerUpText);

    this.bossHPBar = this.add.graphics();
    this.bossHPBar.setScrollFactor(0);
    this.bossHPBar.setDepth(1000);
    gameUI.add(this.bossHPBar);
    this.bossHPText = this.add.text(600, 20, '', { fontSize: '18px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    gameUI.add(this.bossHPText);

    createSkillButtons.call(this);
    this.cameras.main.startFollow(horse, true, 0.1, 0.1);
    this.cameras.main.setBounds(-MAP_HALF, -MAP_HALF, MAP_SIZE, MAP_SIZE);
}

function spawnBull() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(500, 900);
    let bull = createBull.call(this, pos.x, pos.y);
    bulls.push(bull);
}

function createBull(x, y) {
    let body = this.add.ellipse(0, 0, 35, 45, 0x4A2511);
    let head = this.add.ellipse(0, -25, 22, 20, 0x5C2E0E);
    let hornL = this.add.triangle(-10, -32, 0, 0, -8, -15, -2, -8, 0xDDDDAA);
    let hornR = this.add.triangle(10, -32, 0, 0, 8, -15, 2, -8, 0xDDDDAA);
    let noseL = this.add.circle(-4, -20, 2, 0x000000);
    let noseR = this.add.circle(4, -20, 2, 0x000000);
    let eyeL = this.add.circle(-6, -28, 2, 0x000000);
    let eyeR = this.add.circle(6, -28, 2, 0x000000);
    let tail = this.add.rectangle(0, 25, 4, 12, 0x3A1D0A);
    
    let container = this.add.container(x, y, [body, head, hornL, hornR, noseL, noseR, eyeL, eyeR, tail]);
    container.hp = 5;
    container.angry = false;
    container.attackTimer = 0;
    container.angle = 0;
    container.wanderTarget = null;
    return container;
}

function killBull(bull, byBoss = false) {
    let bx = bull.x, by = bull.y, angle = bull.angle;
    let idx = bulls.indexOf(bull);
    if (idx >= 0) bulls.splice(idx, 1);
    
    let skeleton = this.add.graphics();
    skeleton.lineStyle(3, 0xDDDDDD, 0.8);
    skeleton.strokeCircle(0, -30, 12);
    skeleton.lineBetween(-8, -38, -15, -50);
    skeleton.lineBetween(8, -38, 15, -50);
    skeleton.strokeCircle(-4, -32, 2);
    skeleton.strokeCircle(4, -32, 2);
    skeleton.lineBetween(0, -18, 0, 20);
    for (let i = 0; i < 4; i++) skeleton.strokeEllipse(-8, -10 + i * 8, 16, 6);
    skeleton.strokeEllipse(0, 25, 14, 8);
    skeleton.lineBetween(-7, 30, -10, 50);
    skeleton.lineBetween(7, 30, 10, 50);
    
    let skelContainer = this.add.container(bx, by, [skeleton]);
    skelContainer.angle = angle;
    skelContainer.alpha = 0.6;
    wolfSkeletons.add(skelContainer);
    this.tweens.add({ targets: skelContainer, alpha: 0, duration: 8000, onComplete: () => skelContainer.destroy() });
    
    bull.destroy();
    bullsKilled++;
    score += 50;
    
    if (bullsKilled >= 3 && !achievements.bullfighter) {
        achievements.bullfighter = true;
        showAchievement.call(this, '🐂 ТОРЕАДОР!');
    }
    
    let flash = this.add.circle(bx, by, 20, 0xFF8800, 0.8);
    this.tweens.add({ targets: flash, alpha: 0, scale: 3, duration: 400, onComplete: () => flash.destroy() });
    let txt = this.add.text(bx, by - 30, '+50 ', { fontSize: '24px', fill: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: by - 80, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
}

function hitBull(bull) {
    bull.hp--;
    bull.angry = true;
    
    let flash = this.add.circle(bull.x, bull.y, 15, 0xFF4400, 0.8);
    this.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 300, onComplete: () => flash.destroy() });
    
    let hpText = this.add.text(bull.x, bull.y - 30, bull.hp + '/5', { fontSize: '20px', fill: '#FF4400', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: hpText, y: bull.y - 60, alpha: 0, duration: 800, onComplete: () => hpText.destroy() });
    
    if (bull.hp <= 0) {
        killBull.call(this, bull);
    } else if (bull.hp === 4) {
        let warnText = this.add.text(bull.x, bull.y - 50, '🐂 БЫК РАЗОЗЛЁН!', { fontSize: '24px', fill: '#FF0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        this.tweens.add({ targets: warnText, y: bull.y - 100, alpha: 0, duration: 1500, onComplete: () => warnText.destroy() });
    }
}

function spawnDustParticle() {
    let offsetX = Phaser.Math.Between(-10, 10);
    let offsetY = Phaser.Math.Between(15, 25);
    let dust = this.add.circle(horse.x + offsetX, horse.y + offsetY, Phaser.Math.Between(3, 6), 0xBBAA88, 0.6);
    dustParticles.push({ sprite: dust, life: 1.0 });
}

function updateDustParticles() {
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        let p = dustParticles[i];
        p.life -= 0.03;
        if (p.sprite && p.sprite.active) {
            p.sprite.alpha = p.life * 0.6;
            p.sprite.scaleX = 1 + (1 - p.life) * 0.5;
            p.sprite.scaleY = 1 + (1 - p.life) * 0.5;
        }
        if (p.life <= 0) {
            if (p.sprite && p.sprite.active) p.sprite.destroy();
            dustParticles.splice(i, 1);
        }
    }
}

function createBloodStain(x, y) {
    let stain = this.add.graphics();
    stain.fillStyle(0x660000, 0.7);
    stain.fillEllipse(0, 0, Phaser.Math.Between(20, 35), Phaser.Math.Between(15, 25));
    for (let i = 0; i < 4; i++) {
        let bx = Phaser.Math.Between(-20, 20);
        let by = Phaser.Math.Between(-15, 15);
        stain.fillCircle(bx, by, Phaser.Math.Between(2, 5));
    }
    stain.setPosition(x, y);
    stain.alpha = 0.8;
    bloodStains.push(stain);
}

function updateBloodStains() {
    for (let i = bloodStains.length - 1; i >= 0; i--) {
        let stain = bloodStains[i];
        stain.alpha -= 0.002;
        if (stain.alpha <= 0) {
            stain.destroy();
            bloodStains.splice(i, 1);
        }
    }
}

function spawnGrassPatch() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(600, 1200);
    let patch = this.add.graphics();
    let w = Phaser.Math.Between(150, 300), h = Phaser.Math.Between(80, 150);
    let colors = [0x6DB844, 0x72C04A, 0x68B040, 0x75C84D];
    patch.fillStyle(colors[Phaser.Math.Between(0, 3)], 0.4);
    patch.fillEllipse(0, 0, w, h);
    patch.fillStyle(0x8FD860, 0.2);
    patch.fillEllipse(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
    patch.setPosition(pos.x, pos.y);
    bgDecorations.add(patch);
}

function spawnBgHill() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(700, 1300);
    let hill = this.add.graphics();
    let w = Phaser.Math.Between(120, 250), h = Phaser.Math.Between(60, 120);
    hill.fillStyle(0x3D5A20, 0.3); hill.fillEllipse(5, 10, w * 1.1, h * 0.5);
    let colors = [0x5A9A30, 0x62A535, 0x528F2B];
    hill.fillStyle(colors[Phaser.Math.Between(0, 2)], 0.7); hill.fillEllipse(0, 0, w, h);
    hill.fillStyle(0x7EC850, 0.4); hill.fillEllipse(-w * 0.2, -h * 0.2, w * 0.5, h * 0.5);
    hill.fillStyle(0x3D5A20, 0.3); hill.fillEllipse(w * 0.25, h * 0.25, w * 0.4, h * 0.4);
    hill.setPosition(pos.x, pos.y);
    bgDecorations.add(hill);
}

function spawnBgDecoration() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(500, 1100);
    let t = Phaser.Math.Between(0, 9);
    let deco = this.add.graphics();
    if (t === 0) {
        let blades = Phaser.Math.Between(5, 7);
        for (let i = 0; i < blades; i++) {
            let bx = (Math.random() - 0.5) * 8, h = Phaser.Math.Between(12, 20), lean = (Math.random() - 0.5) * 6;
            deco.lineStyle(2, 0x4A7A2A, 0.8); deco.lineBetween(bx, 0, bx + lean, -h);
        }
    } else if (t === 1) {
        deco.lineStyle(2, 0x5DA83A, 0.7);
        deco.lineBetween(0, 0, -3, -8); deco.lineBetween(0, 0, 0, -10); deco.lineBetween(0, 0, 3, -8);
    } else if (t === 2) {
        deco.fillStyle(0x3D5A20, 0.3); deco.fillEllipse(2, 3, 8, 4);
        deco.lineStyle(1, 0x4A7A2A, 0.8); deco.lineBetween(0, 0, 0, -8);
        deco.fillStyle(0xDD2222, 0.9);
        deco.fillCircle(-2, -10, 3); deco.fillCircle(2, -10, 3); deco.fillCircle(0, -12, 3); deco.fillCircle(0, -8, 3);
        deco.fillStyle(0x222222, 1); deco.fillCircle(0, -10, 1.5);
    } else if (t === 3) {
        deco.fillStyle(0x3D5A20, 0.3); deco.fillEllipse(2, 3, 8, 4);
        deco.lineStyle(1, 0x4A7A2A, 0.8); deco.lineBetween(0, 0, 0, -7);
        deco.fillStyle(0xFFDD00, 0.9);
        deco.fillCircle(-2, -9, 2.5); deco.fillCircle(2, -9, 2.5); deco.fillCircle(0, -11, 2.5); deco.fillCircle(0, -7, 2.5);
        deco.fillStyle(0xFF8800, 1); deco.fillCircle(0, -9, 1.5);
    } else if (t === 4) {
        deco.fillStyle(0x3D5A20, 0.3); deco.fillEllipse(2, 3, 8, 4);
        deco.lineStyle(1, 0x4A7A2A, 0.8); deco.lineBetween(0, 0, 0, -8);
        deco.fillStyle(0x9944CC, 0.9);
        deco.fillCircle(-2, -10, 3); deco.fillCircle(2, -10, 3); deco.fillCircle(0, -12, 3); deco.fillCircle(0, -8, 3);
        deco.fillStyle(0xFFFF00, 1); deco.fillCircle(0, -10, 1.5);
    } else if (t === 5) {
        deco.fillStyle(0x3D5A20, 0.3); deco.fillEllipse(2, 3, 8, 4);
        deco.lineStyle(1, 0x4A7A2A, 0.8); deco.lineBetween(0, 0, 0, -8);
        deco.fillStyle(0xFFFFFF, 0.9);
        for (let i = 0; i < 6; i++) { let a = (Math.PI * 2 / 6) * i; deco.fillCircle(Math.cos(a) * 3, -10 + Math.sin(a) * 3, 2); }
        deco.fillStyle(0xFFCC00, 1); deco.fillCircle(0, -10, 2);
    } else if (t === 6) {
        deco.fillStyle(0x3D5A20, 0.4); deco.fillEllipse(3, 5, 18, 8);
        deco.fillStyle(0x4A7A2A, 0.9);
        deco.fillCircle(0, -5, 8); deco.fillCircle(-5, -3, 6); deco.fillCircle(5, -3, 6);
        deco.fillStyle(0x6DB844, 0.5); deco.fillCircle(-2, -7, 4);
    } else if (t === 7) {
        deco.fillStyle(0x3D5A20, 0.4); deco.fillEllipse(2, 3, 14, 6);
        deco.fillStyle(0x6B8E4A, 0.8); deco.fillEllipse(0, 0, 12, 8);
        deco.fillStyle(0x7EA85A, 0.5); deco.fillEllipse(-2, -2, 6, 4);
    } else if (t === 8) {
        deco.fillStyle(0x3D5A20, 0.3); deco.fillEllipse(2, 3, 8, 4);
        deco.lineStyle(1, 0x4A7A2A, 0.8); deco.lineBetween(0, 0, 1, -10);
        deco.fillStyle(0x4488DD, 0.9);
        deco.fillTriangle(-3, -10, 3, -10, 0, -15); deco.fillTriangle(-2, -10, 2, -10, 0, -7);
    } else {
        deco.fillStyle(0x3D5A20, 0.3); deco.fillEllipse(2, 3, 8, 4);
        deco.lineStyle(1, 0x4A7A2A, 0.8); deco.lineBetween(0, 0, 0, -8);
        deco.fillStyle(0xFF69B4, 0.9);
        deco.fillCircle(-2, -10, 3); deco.fillCircle(2, -10, 3); deco.fillCircle(0, -12, 3); deco.fillCircle(0, -8, 3);
        deco.fillStyle(0xFFFF00, 1); deco.fillCircle(0, -10, 1.5);
    }
    deco.setPosition(pos.x, pos.y);
    bgDecorations.add(deco);
}

function spawnObstacle() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(500, 900);
    let g = this.add.graphics();
    g.fillStyle(0x3D5A20, 0.4); g.fillEllipse(5, 10, 50, 20);
    if (Phaser.Math.Between(0, 1) === 0) {
        g.fillStyle(0x654321, 1); g.fillRect(-6, 0, 12, 30);
        g.fillStyle(0x228B22, 1);
        g.fillCircle(0, -15, 20); g.fillCircle(-12, -10, 15); g.fillCircle(12, -10, 15); g.fillCircle(0, -25, 18);
        g.fillStyle(0x32CD32, 0.5); g.fillCircle(-5, -20, 8); g.fillCircle(8, -12, 6);
    } else {
        g.fillStyle(0x4A7A2A, 1);
        g.fillCircle(0, 0, 25); g.fillCircle(-15, 5, 18); g.fillCircle(15, 5, 18); g.fillCircle(0, -10, 20);
        g.fillStyle(0x6DB844, 0.5); g.fillCircle(-5, -8, 10); g.fillCircle(8, 2, 8);
    }
    g.setPosition(pos.x, pos.y);
    bgDecorations.add(g);
}

function createLightningEffect() {
    cows.forEach((cow, index) => {
        this.time.delayedCall(index * 80, () => {
            if (!cow || !cow.active) return;
            let lightning = this.add.graphics();
            lightning.lineStyle(3, 0x00FFFF, 1);
            let x = cow.x, y = cow.y;
            lightning.beginPath(); lightning.moveTo(x, y);
            for (let i = 1; i <= 8; i++) lightning.lineTo(x + (Math.random() - 0.5) * 40, y - i * 30);
            lightning.strokePath();
            let glow = this.add.circle(cow.x, cow.y, 20, 0x00FFFF, 0.8);
            this.tweens.add({ targets: [lightning, glow], alpha: 0, duration: 400, onComplete: () => { lightning.destroy(); glow.destroy(); } });
        });
    });
    if (cows.length > 0) {
        let avgX = cows.reduce((s, c) => s + c.x, 0) / cows.length;
        let avgY = cows.reduce((s, c) => s + c.y, 0) / cows.length;
        let bigFlash = this.add.circle(avgX, avgY - 100, 50, 0x00FFFF, 0.6);
        this.tweens.add({ targets: bigFlash, scale: 3, alpha: 0, duration: 600, onComplete: () => bigFlash.destroy() });
        this.cameras.main.shake(300, 0.015);
    }
}

function spawnGoldenCow() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(400, 700);
    let glow = this.add.circle(0, 0, 25, 0xFFFF00, 0.3);
    glow.setStrokeStyle(2, 0xFFD700, 0.8);
    let cow = this.add.container(pos.x, pos.y, [glow,
        this.add.rectangle(0, 0, 15, 20, 0xFFD700),
        this.add.circle(-4, -2, 3, 0xFFA500), this.add.circle(3, 4, 2.5, 0xFFA500),
        this.add.rectangle(0, -12, 8, 9, 0xFFD700),
        this.add.triangle(-3, -16, 0, 0, -2, -4, 2, -4, 0xFFFF00), this.add.triangle(3, -16, 0, 0, -2, -4, 2, -4, 0xFFFF00),
        this.add.circle(-2, -13, 1, 0x000000), this.add.circle(2, -13, 1, 0x000000)
    ]);
    cow.isGolden = true; cow.fleeSpeed = 2.5;
    goldenCows.add(cow);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.1, duration: 500, yoyo: true, repeat: -1 });
    this.time.delayedCall(30000, () => { if (cow && cow.active) cow.destroy(); });
}

function collectGoldenCow(h, cow) {
    cow.destroy();
    goldenCowsCollected++;
    totalGoldenCowsEver++;
    localStorage.setItem('totalGoldenCowsEver', totalGoldenCowsEver);
    score += 50;
    this.goldenCowText.setText('✨ ' + goldenCowsCollected + '/3');
    
    if (goldenCowsCollected >= 3 && !achievements.goldenFever) {
        achievements.goldenFever = true;
        showAchievement.call(this, '✨ ЗОЛОТАЯ ЛИХОРАДКА!');
    }
    
    if (goldenCowsCollected >= 3) {
        goldenCowsCollected = 0;
        this.goldenCowText.setText('✨ 0/3');
        horseHP = Math.min(horseHP + 1, 5);
        updateHPDisplay.call(this);
        let t = this.add.text(600, 300, '✨ +1 ЖИЗНЬ!', { fontSize: '48px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0);
        this.tweens.add({ targets: t, y: 200, alpha: 0, scale: 1.5, duration: 2000, onComplete: () => t.destroy() });
    }
    
    for (let i = 0; i < 5; i++) {
        let newCow = createCow.call(this, horse.x, horse.y + 50 + i * 10);
        cows.push(newCow);
    }
    
    let flash = this.add.circle(horse.x, horse.y, 20, 0xFFD700, 0.9);
    this.tweens.add({ targets: flash, alpha: 0, scale: 3, duration: 400, onComplete: () => flash.destroy() });
    let bonusText = this.add.text(horse.x, horse.y - 60, '+5 🐄 +50', { fontSize: '24px', fill: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: bonusText, y: horse.y - 120, alpha: 0, duration: 1000, onComplete: () => bonusText.destroy() });
}

function showAchievement(text) {
    let t = this.add.text(600, 250, ' ' + text, { fontSize: '36px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: t, y: 150, alpha: 0, scale: 1.3, duration: 2500, onComplete: () => t.destroy() });
}

function createSkillButtons() {
    skillButtons = [];
    let skills = [
        { id: 'rapidFire', icon: '⚡x2', cost: 3, y: 730 },
        { id: 'dogCompanion', icon: '🐕Собака', cost: 6, y: 660 },
        { id: 'explosion', icon: '💥Взрыв', cost: 9, y: 590 }
    ];
    skills.forEach(s => {
        let btn = this.add.container(1050, s.y);
        let bg = this.add.rectangle(0, 0, 110, 60, 0x333333, 0.8);
        bg.setStrokeStyle(3, 0x666666);
        let txt = this.add.text(0, -10, s.icon, { fontSize: '18px', fill: '#666666' }).setOrigin(0.5);
        let cost = this.add.text(0, 15, s.cost + ' коров', { fontSize: '13px', fill: '#666666' }).setOrigin(0.5);
        btn.add([bg, txt, cost]);
        btn.setScrollFactor(0);
        btn.skillId = s.id;
        btn.cost = s.cost;
        btn.isActive = false;
        btn.btnX = 1050;
        btn.btnY = s.y;
        btn.btnW = 110;
        btn.btnH = 60;
        skillButtons.push(btn);
        gameUI.add(btn);
    });
}

function checkSkillButtonClick(pointer) {
    for (let btn of skillButtons) {
        let halfW = btn.btnW / 2;
        let halfH = btn.btnH / 2;
        if (pointer.x >= btn.btnX - halfW && pointer.x <= btn.btnX + halfW &&
            pointer.y >= btn.btnY - halfH && pointer.y <= btn.btnY + halfH) {
            if (cowsForSkills >= btn.cost) {
                activateSkill.call(this, btn.skillId, btn.cost);
                cowsForSkills -= btn.cost;
                updateSkillButtons.call(this);
                return;
            }
        }
    }
}

function updateSkillButtons() {
    for (let btn of skillButtons) {
        let ok = cowsForSkills >= btn.cost;
        btn.isActive = ok;
        let c = ok ? '#00ff00' : '#666666';
        let border = ok ? 0x00ff00 : 0x666666;
        btn.list[0].setStrokeStyle(3, border);
        btn.list[1].setColor(c);
        btn.list[2].setColor(c);
    }
}

function activateSkill(skillId, cost) {
    removeCowsFromHerd.call(this, cost);
    createLightningEffect.call(this);
    if (skillId === 'rapidFire') {
        activeSkills.rapidFire = true;
        this.time.delayedCall(15000, () => { activeSkills.rapidFire = false; });
        showSkillText.call(this, '⚡ x2 СКОРОСТРЕЛЬНОСТЬ 15С!');
    } else if (skillId === 'dogCompanion') {
        spawnDogCompanion.call(this, 10000);
        showSkillText.call(this, '🐕 СОБАКА-ОХОТНИК!');
    } else if (skillId === 'explosion') {
        triggerExplosion.call(this);
        showSkillText.call(this, '💥 ВЗРЫВ 500px!');
    }
}

function removeCowsFromHerd(count) {
    let removed = 0;
    while (removed < count && cows.length > 0) {
        let cow = cows.pop();
        if (cow) {
            let sp = this.add.circle(cow.x, cow.y, 10, 0x00FFFF, 0.8);
            this.tweens.add({ targets: [cow, sp], alpha: 0, scale: 1.5, duration: 300, onComplete: () => { cow.destroy(); sp.destroy(); } });
        }
        removed++;
    }
}

function showSkillText(text) {
    let t = this.add.text(600, 300, text, { fontSize: '48px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: t, y: 200, alpha: 0, scale: 1.5, duration: 2000, onComplete: () => t.destroy() });
}

function spawnDogCompanion(duration = 10000) {
    if (dogCompanion) dogCompanion.destroy();
    let dog = this.add.container(horse.x + 450, horse.y, [
        this.add.ellipse(0, 0, 16, 22, 0x8B4513), this.add.ellipse(0, -12, 12, 14, 0xA0522D),
        this.add.triangle(-4, -18, 0, 0, -3, -6, 3, -6, 0x6B3410), this.add.triangle(4, -18, 0, 0, -3, -6, 3, -6, 0x6B3410),
        this.add.circle(-2, -14, 1.5, 0x000000), this.add.circle(2, -14, 1.5, 0x000000),
        this.add.rectangle(0, 12, 4, 10, 0x6B3410)
    ]);
    let aura = this.add.circle(0, 0, 25, 0xFFD700, 0.3);
    aura.setStrokeStyle(2, 0xFFD700, 0.8);
    dog.add(aura);
    dogCompanion = dog;
    dogCompanion.attackTimer = 0;
    this.time.delayedCall(duration, () => { if (dogCompanion) { dogCompanion.destroy(); dogCompanion = null; } });
}

function triggerExplosion() {
    enemies.children.iterate(e => {
        if (e && Phaser.Math.Distance.Between(horse.x, horse.y, e.x, e.y) < 500) {
            if (e.isBoss) { e.hp -= 20; if (e.hp <= 0) killBoss.call(this, e); }
            else { let ex = e.x, ey = e.y; let angle = e.angle; e.destroy(); score += 10; createWolfSkeleton.call(this, ex, ey, false, angle); createBloodStain.call(this, ex, ey); let f = this.add.circle(ex, ey, 15, 0xFF4400, 0.9); this.tweens.add({ targets: f, alpha: 0, scale: 5, duration: 400, onComplete: () => f.destroy() }); }
        }
    });
    for (let i = bulls.length - 1; i >= 0; i--) {
        let bull = bulls[i];
        if (bull && Phaser.Math.Distance.Between(horse.x, horse.y, bull.x, bull.y) < 500) {
            bull.hp -= 3;
            bull.angry = true;
            if (bull.hp <= 0) killBull.call(this, bull);
        }
    }
    let exp = this.add.circle(horse.x, horse.y, 50, 0xFF6600, 0.8);
    this.tweens.add({ targets: exp, radius: 500, alpha: 0, duration: 600, onComplete: () => exp.destroy() });
    this.cameras.main.shake(300, 0.03);
}

function createWolfSkeleton(x, y, isBoss, angle) {
    let skeleton = this.add.graphics();
    if (isBoss) {
        skeleton.lineStyle(3, 0xDDDDDD, 0.8);
        skeleton.strokeCircle(0, -50, 18);
        skeleton.strokeCircle(-8, -55, 6); skeleton.strokeCircle(8, -55, 6);
        skeleton.strokeCircle(0, -45, 4);
        skeleton.lineBetween(0, -32, 0, 30);
        for (let i = 0; i < 5; i++) skeleton.strokeEllipse(-12, -20 + i * 10, 24, 8);
        skeleton.strokeEllipse(0, 35, 20, 12);
        skeleton.lineBetween(-10, 40, -15, 70); skeleton.lineBetween(10, 40, 15, 70);
        skeleton.lineBetween(-10, 40, -8, 70); skeleton.lineBetween(10, 40, 8, 70);
        skeleton.lineBetween(0, 45, 0, 65);
    } else {
        skeleton.lineStyle(2, 0xDDDDDD, 0.8);
        skeleton.strokeCircle(0, -18, 8);
        skeleton.strokeCircle(-3, -20, 2.5); skeleton.strokeCircle(3, -20, 2.5);
        skeleton.strokeCircle(0, -15, 1.5);
        skeleton.lineBetween(0, -10, 0, 12);
        for (let i = 0; i < 3; i++) skeleton.strokeEllipse(-6, -5 + i * 5, 12, 4);
        skeleton.strokeEllipse(0, 15, 10, 6);
        skeleton.lineBetween(-5, 18, -7, 32); skeleton.lineBetween(5, 18, 7, 32);
        skeleton.lineBetween(-5, 18, -4, 32); skeleton.lineBetween(5, 18, 4, 32);
        skeleton.lineBetween(0, 20, 0, 30);
    }
    skeleton.angle = angle || 0;
    let container = this.add.container(x, y, [skeleton]);
    container.alpha = 0.6;
    wolfSkeletons.add(container);
    this.tweens.add({ targets: container, alpha: 0, duration: isBoss ? 10000 : 5000, onComplete: () => container.destroy() });
}

function killBoss(boss) {
    let bx = boss.x, by = boss.y, angle = boss.angle;
    boss.destroy();
    bossActive = false;
    score += 500;
    createWolfSkeleton.call(this, bx, by, true, angle);
    createBloodStain.call(this, bx, by);
    if (!achievements.godOfWar) { achievements.godOfWar = true; showAchievement.call(this, '⚔️ GOD OF WAR!'); }
    removeBossDarkness.call(this);
    let flash = this.add.circle(bx, by, 30, 0xff0000, 0.9);
    this.tweens.add({ targets: flash, alpha: 0, scale: 8, duration: 800, onComplete: () => flash.destroy() });
    let wt = this.add.text(bx, by - 50, '+500 БОСС ПОВЕРЖЕН!', { fontSize: '32px', fill: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: wt, y: by - 150, alpha: 0, duration: 1500, onComplete: () => wt.destroy() });
}

function createBossDarkness() {
    removeBossDarkness.call(this);
    bossDarkOverlay = this.add.rectangle(0, 0, MAP_SIZE, MAP_SIZE, 0x110000, 0);
    bossDarkOverlay.setScrollFactor(1);
    bossDarkOverlay.setDepth(999);
    this.tweens.add({ targets: bossDarkOverlay, alpha: 0.35, duration: 2000, ease: 'Sine.easeIn' });
}

function removeBossDarkness() {
    if (bossDarkOverlay && bossDarkOverlay.active) {
        let overlay = bossDarkOverlay;
        bossDarkOverlay = null;
        this.tweens.add({ targets: overlay, alpha: 0, duration: 1500, ease: 'Sine.easeOut', onComplete: () => { if (overlay && overlay.active) overlay.destroy(); } });
    }
}

function updateBossHPBar() {
    this.bossHPBar.clear();
    this.bossHPText.setText('');
    if (!bossActive) return;
    let boss = null;
    enemies.children.iterate(e => { if (e && e.isBoss) boss = e; });
    if (!boss) return;
    let barWidth = 400, barHeight = 25, x = 600 - barWidth / 2, y = 30;
    this.bossHPBar.fillStyle(0x333333, 0.8);
    this.bossHPBar.fillRect(x, y, barWidth, barHeight);
    let hpRatio = Math.max(0, boss.hp / 200);
    this.bossHPBar.fillStyle(0xFF0000, 1);
    this.bossHPBar.fillRect(x, y, barWidth * hpRatio, barHeight);
    this.bossHPBar.lineStyle(3, 0xFFFFFF, 1);
    this.bossHPBar.strokeRect(x, y, barWidth, barHeight);
    this.bossHPText.setText(' БОСС: ' + Math.max(0, Math.ceil(boss.hp)) + ' / 200');
}

function update() {
    if (gameState !== 'playing') return;

    if (gameTime - lastDifficultyIncrease >= 120) {
        lastDifficultyIncrease = gameTime;
        wolfSpawnRate = Math.max(100, wolfSpawnRate - 150);
        powerUpSpawnRate = Math.max(5000, powerUpSpawnRate - 3000);
    }

    if (!bossActive && gameTime - lastBossSpawn >= 60) {
        lastBossSpawn = gameTime;
        spawnBoss.call(this);
    }

    let moveX = 0, moveY = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) moveX -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) moveX += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) moveY -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) moveY += 1;
    if (moveX !== 0 && moveY !== 0) { moveX *= 0.707; moveY *= 0.707; }
    
    horse.body.setVelocityX(moveX * baseHorseSpeed);
    horse.body.setVelocityY(moveY * baseHorseSpeed);

    let isMoving = (moveX !== 0 || moveY !== 0);
    if (isMoving) {
        let ta = Phaser.Math.RadToDeg(Math.atan2(moveY, moveX)) + 90;
        let diff = ta - horse.angle;
        while (diff > 180) diff -= 360; while (diff < -180) diff += 360;
        horse.angle += diff * 0.15;
        if (gameTime - lastDustTime > 0.1) {
            spawnDustParticle.call(this);
            lastDustTime = gameTime;
        }
    }
    updateDustParticles.call(this);

    let wmx = mouseX + this.cameras.main.scrollX;
    let wmy = mouseY + this.cameras.main.scrollY;
    let ta = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(horse.x, horse.y, wmx, wmy)) + 90;
    let diff = ta - cowboy.angle;
    while (diff > 180) diff -= 360; while (diff < -180) diff += 360;
    cowboy.angle += diff * 0.3;

    gameTime += 1 / 60;
    let mins = Math.floor(gameTime / 60);
    let secs = Math.floor(gameTime % 60);
    this.timeText.setText('Время: ' + mins + ':' + (secs < 10 ? '0' : '') + secs);
    
    if (gameTime >= 600 && !achievements.survivor) { achievements.survivor = true; showAchievement.call(this, '⏰ ВЫЖИВШИЙ!'); }

    if (gameTime - lastPowerUpSpawn >= powerUpSpawnRate / 1000) { lastPowerUpSpawn = gameTime; spawnPowerUp.call(this); }

    cleanupWorld.call(this);
    deadCows = deadCows.filter(dc => { dc.alpha -= 0.003; if (dc.alpha <= 0) { dc.destroy(); return false; } return true; });
    updateBloodStains.call(this);
    updateBossHPBar.call(this);

    goldenCows.children.iterate(cow => {
        if (cow) {
            clampToMap(cow);
            let dx = cow.x - horse.x, dy = cow.y - horse.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300 && dist > 0) {
                cow.x += (dx / dist) * cow.fleeSpeed;
                cow.y += (dy / dist) * cow.fleeSpeed;
                let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
                let d = targetAngle - cow.angle;
                while (d > 180) d -= 360; while (d < -180) d += 360;
                cow.angle += d * 0.15;
            }
        }
    });

    if (dogCompanion) {
        dogCompanion.attackTimer += 1 / 60;
        let closest = null, minD = 450;
        enemies.children.iterate(e => { if (e) { let d = Phaser.Math.Distance.Between(dogCompanion.x, dogCompanion.y, e.x, e.y); if (d < minD) { minD = d; closest = e; } } });
        if (closest) {
            let dx = closest.x - dogCompanion.x, dy = closest.y - dogCompanion.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 30) { dogCompanion.x += (dx / dist) * 5; dogCompanion.y += (dy / dist) * 5; }
            let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
            let d2 = targetAngle - dogCompanion.angle;
            while (d2 > 180) d2 -= 360; while (d2 < -180) d2 += 360;
            dogCompanion.angle += d2 * 0.25;
            if (dist < 40) {
                if (closest.isBoss) { closest.hp -= 70; if (closest.hp <= 0) killBoss.call(this, closest); }
                else { let angle = closest.angle; closest.destroy(); score += 10; createWolfSkeleton.call(this, closest.x, closest.y, false, angle); createBloodStain.call(this, closest.x, closest.y); }
                let f = this.add.circle(closest.x, closest.y, 15, 0xFFD700, 0.9);
                this.tweens.add({ targets: f, alpha: 0, scale: 4, duration: 300, onComplete: () => f.destroy() });
            }
        } else {
            let a = gameTime * 3;
            let tx = horse.x + Math.cos(a) * 450, ty = horse.y + Math.sin(a) * 450;
            let dx = tx - dogCompanion.x, dy = ty - dogCompanion.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) { dogCompanion.x += (dx / dist) * 3; dogCompanion.y += (dy / dist) * 3; }
            let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
            let d2 = targetAngle - dogCompanion.angle;
            while (d2 > 180) d2 -= 360; while (d2 < -180) d2 += 360;
            dogCompanion.angle += d2 * 0.2;
        }
    }

    // === ЛОГИКА БЫКОВ ===
    for (let i = bulls.length - 1; i >= 0; i--) {
        let bull = bulls[i];
        if (!bull || !bull.active) { bulls.splice(i, 1); continue; }
        clampToMap(bull);
        bull.attackTimer += 1 / 60;
        
        if (bull.angry) {
            let targetX = horse.x, targetY = horse.y;
            let minDist = Phaser.Math.Distance.Between(bull.x, bull.y, horse.x, horse.y);
            let targetType = 'horse';
            
            // Ищем ближайшую цель: босс, волк или игрок
            enemies.children.iterate(e => {
                if (e) {
                    let d = Phaser.Math.Distance.Between(bull.x, bull.y, e.x, e.y);
                    if (d < minDist) { 
                        minDist = d; 
                        targetX = e.x; 
                        targetY = e.y; 
                        targetType = e.isBoss ? 'boss' : 'wolf';
                    }
                }
            });
            
            let dx = targetX - bull.x, dy = targetY - bull.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let bullSpeed = 2.2;
            if (dist > 5) {
                bull.x += (dx / dist) * bullSpeed;
                bull.y += (dy / dist) * bullSpeed;
                let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
                let d = targetAngle - bull.angle;
                while (d > 180) d -= 360; while (d < -180) d += 360;
                bull.angle += d * 0.2;
            }
            
            // Атака босса-волка (смертельный удар!)
            if (targetType === 'boss' && dist < 40 && bull.attackTimer > 0.5) {
                bull.attackTimer = 0;
                enemies.children.iterate(e => {
                    if (e && e.isBoss && Phaser.Math.Distance.Between(bull.x, bull.y, e.x, e.y) < 40) {
                        e.hp -= 50;
                        // БЫК УМИРАЕТ ПОСЛЕ АТАКИ НА БОССА
                        killBull.call(this, bull, true);
                        if (e.hp <= 0) killBoss.call(this, e);
                        let flash = this.add.circle(e.x, e.y, 30, 0xFF0000, 0.8);
                        this.tweens.add({ targets: flash, alpha: 0, scale: 3, duration: 400, onComplete: () => flash.destroy() });
                        let dmgText = this.add.text(e.x, e.y - 40, '-50 HP!', { fontSize: '28px', fill: '#FF0000', fontStyle: 'bold' }).setOrigin(0.5);
                        this.tweens.add({ targets: dmgText, y: e.y - 80, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });
                    }
                });
            }
            // Атака игрока
            else if (targetType === 'horse' && Phaser.Math.Distance.Between(bull.x, bull.y, horse.x, horse.y) < 35 && bull.attackTimer > 0.8) {
                bull.attackTimer = 0;
                loseHP.call(this);
                this.cameras.main.shake(200, 0.03);
                let f = this.add.circle(horse.x, horse.y, 20, 0xFF4400, 0.8);
                this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 300, onComplete: () => f.destroy() });
            }
            // Атака обычных волков
            else if (targetType === 'wolf') {
                enemies.children.iterate(e => {
                    if (e && !e.isBoss && Phaser.Math.Distance.Between(bull.x, bull.y, e.x, e.y) < 35) {
                        let ex = e.x, ey = e.y;
                        e.destroy();
                        createBloodStain.call(this, ex, ey);
                        createWolfSkeleton.call(this, ex, ey, false, 0);
                        score += 5;
                    }
                });
            }
        } else {
            if (!bull.wanderTarget || Phaser.Math.Distance.Between(bull.x, bull.y, bull.wanderTarget.x, bull.wanderTarget.y) < 20) {
                let a = Math.random() * Math.PI * 2;
                let d = Phaser.Math.Between(100, 300);
                bull.wanderTarget = { 
                    x: Phaser.Math.Clamp(bull.x + Math.cos(a) * d, -MAP_LIMIT, MAP_LIMIT), 
                    y: Phaser.Math.Clamp(bull.y + Math.sin(a) * d, -MAP_LIMIT, MAP_LIMIT) 
                };
            }
            let dx = bull.wanderTarget.x - bull.x, dy = bull.wanderTarget.y - bull.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                bull.x += (dx / dist) * 0.5;
                bull.y += (dy / dist) * 0.5;
                let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
                let d = targetAngle - bull.angle;
                while (d > 180) d -= 360; while (d < -180) d += 360;
                bull.angle += d * 0.1;
            }
        }
    }

    cowsToCollect.children.iterate(cow => {
        if (cow) {
            clampToMap(cow);
            let bossNearby = false, bossDx = 0, bossDy = 0;
            enemies.children.iterate(e => {
                if (e && e.isBoss && Phaser.Math.Distance.Between(cow.x, cow.y, e.x, e.y) < 300) {
                    bossNearby = true; bossDx = cow.x - e.x; bossDy = cow.y - e.y;
                }
            });
            let bullNearby = false, bullDx = 0, bullDy = 0;
            bulls.forEach(bull => {
                if (bull && bull.angry && Phaser.Math.Distance.Between(cow.x, cow.y, bull.x, bull.y) < 250) {
                    bullNearby = true; bullDx = cow.x - bull.x; bullDy = cow.y - bull.y;
                }
            });
            if (bossNearby) {
                let dist = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
                if (dist > 0) { cow.x += (bossDx / dist) * 1.0; cow.y += (bossDy / dist) * 1.0; }
                let targetAngle = Phaser.Math.RadToDeg(Math.atan2(bossDy, bossDx)) + 90;
                let d = targetAngle - cow.angle;
                while (d > 180) d -= 360; while (d < -180) d += 360;
                cow.angle += d * 0.15;
            } else if (bullNearby) {
                let dist = Math.sqrt(bullDx * bullDx + bullDy * bullDy);
                if (dist > 0) { cow.x += (bullDx / dist) * 1.2; cow.y += (bullDy / dist) * 1.2; }
                let targetAngle = Phaser.Math.RadToDeg(Math.atan2(bullDy, bullDx)) + 90;
                let d = targetAngle - cow.angle;
                while (d > 180) d -= 360; while (d < -180) d += 360;
                cow.angle += d * 0.15;
            } else {
                let dx = horse.x - cow.x, dy = horse.y - cow.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5 && dist < 800) { cow.x += (dx / dist) * 1.0; cow.y += (dy / dist) * 1.0; }
                let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
                let d = targetAngle - cow.angle;
                while (d > 180) d -= 360; while (d < -180) d += 360;
                cow.angle += d * 0.1;
            }
        }
    });

    for (let i = 0; i < cows.length; i++) {
        let cow = cows[i];
        let target = i === 0 ? horse : cows[i - 1];
        let td = i === 0 ? 50 : 40;
        let dx = target.x - cow.x, dy = target.y - cow.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > td) { cow.x += (dx / dist) * 4; cow.y += (dy / dist) * 4; }
        clampToMap(cow);
        let targetAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
        let d = targetAngle - cow.angle;
        while (d > 180) d -= 360; while (d < -180) d += 360;
        cow.angle += d * 0.1;
    }

    enemies.children.iterate(enemy => {
        if (enemy) {
            clampToMap(enemy);
            let tx, ty;
            if (enemy.isBoss) { tx = horse.x; ty = horse.y; }
            else {
                tx = horse.x; ty = horse.y;
                let md = Phaser.Math.Distance.Between(horse.x, horse.y, enemy.x, enemy.y);
                for (let c of cows) { let d = Phaser.Math.Distance.Between(c.x, c.y, enemy.x, enemy.y); if (d < md) { md = d; tx = c.x; ty = c.y; } }
                cowsToCollect.children.iterate(c => { if (c) { let d = Phaser.Math.Distance.Between(c.x, c.y, enemy.x, enemy.y); if (d < md) { md = d; tx = c.x; ty = c.y; } } });
            }
            let dx = tx - enemy.x, dy = ty - enemy.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let speed = enemy.isBoss ? 2.8 : 1.8;

            if (enemy.isBoss) {
                if (dist > 1200) {
                    let ta = Math.atan2(dy, dx);
                    enemy.x = horse.x + Math.cos(ta) * 800;
                    enemy.y = horse.y + Math.sin(ta) * 800;
                } else if (dist > 5) {
                    enemy.x += (dx / dist) * speed; enemy.y += (dy / dist) * speed;
                }
                for (let i = 0; i < cows.length; i++) {
                    if (Phaser.Math.Distance.Between(enemy.x, enemy.y, cows[i].x, cows[i].y) < 40) {
                        let eatenCow = cows[i]; cows.splice(i, 1); eatenCow.destroy();
                        enemy.hp = Math.min(enemy.hp + 25, 200);
                        let f = this.add.circle(enemy.x, enemy.y, 25, 0xFF0000, 0.8);
                        this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 400, onComplete: () => f.destroy() });
                        let eatText = this.add.text(enemy.x, enemy.y - 30, '+25 HP', { fontSize: '20px', fill: '#00FF00', fontStyle: 'bold' }).setOrigin(0.5);
                        this.tweens.add({ targets: eatText, y: enemy.y - 60, alpha: 0, duration: 800, onComplete: () => eatText.destroy() });
                        return;
                    }
                }
                let ateFromMap = false;
                cowsToCollect.children.iterate(c => {
                    if (c && !ateFromMap && Phaser.Math.Distance.Between(enemy.x, enemy.y, c.x, c.y) < 40) {
                        c.destroy(); enemy.hp = Math.min(enemy.hp + 25, 200);
                        let f = this.add.circle(enemy.x, enemy.y, 25, 0xFF0000, 0.8);
                        this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 400, onComplete: () => f.destroy() });
                        let eatText = this.add.text(enemy.x, enemy.y - 30, '+25 HP', { fontSize: '20px', fill: '#00FF00', fontStyle: 'bold' }).setOrigin(0.5);
                        this.tweens.add({ targets: eatText, y: enemy.y - 60, alpha: 0, duration: 800, onComplete: () => eatText.destroy() });
                        ateFromMap = true;
                    }
                });
                if (ateFromMap) return;
            } else {
                if (dist > 5 && dist < 800) { enemy.x += (dx / dist) * speed; enemy.y += (dy / dist) * speed; }
                for (let i = 0; i < cows.length; i++) {
                    if (Phaser.Math.Distance.Between(enemy.x, enemy.y, cows[i].x, cows[i].y) < 15) { killCowByWolf.call(this, cows[i], enemy); return; }
                }
                let atk = false;
                cowsToCollect.children.iterate(c => {
                    if (c && !atk && Phaser.Math.Distance.Between(enemy.x, enemy.y, c.x, c.y) < 15) {
                        deadCows.push(createDeadCow.call(this, c.x, c.y, c.angle));
                        c.destroy(); enemy.destroy(); atk = true;
                    }
                });
            }
            let a = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
            let d = a - enemy.angle;
            while (d > 180) d -= 360; while (d < -180) d += 360;
            enemy.angle += d * 0.15;
        }
    });

    if (activePowerUp) {
        powerUpTimer -= 1 / 60;
        if (powerUpTimer <= 0) deactivatePowerUp.call(this);
        else powerUpText.setText(activePowerUp.name + ': ' + Math.ceil(powerUpTimer) + 's');
    }

    let fireRate = baseFireRate;
    if (activeSkills.rapidFire) fireRate /= 2;
    if (activePowerUp) {
        if (activePowerUp.type === 'machinegun') fireRate = 75;
        else if (activePowerUp.type === 'minigun') fireRate = 17;
    }
    
    if (this.time.now > nextFireTime) { shoot.call(this); nextFireTime = this.time.now + fireRate; }
    
    bullets.children.iterate(b => { 
        if (!b) return;
        if (Phaser.Math.Distance.Between(b.x, b.y, horse.x, horse.y) > 1000) { b.destroy(); return; }
        for (let i = 0; i < bulls.length; i++) {
            let bull = bulls[i];
            if (bull && bull.active && Phaser.Math.Distance.Between(b.x, b.y, bull.x, bull.y) < 25) {
                b.destroy();
                hitBull.call(this, bull);
                return;
            }
        }
    });

    this.cowCountText.setText('Коровы: ' + cows.length);
    this.scoreText.setText('Счет: ' + score);
    updateSkillButtons.call(this);
}

function cleanupWorld() {
    let cx = horse.x, cy = horse.y;
    bgDecorations.children.iterate(d => { if (d && Phaser.Math.Distance.Between(d.x, d.y, cx, cy) > 1200) d.destroy(); });
    wolfSkeletons.children.iterate(s => { if (s && Phaser.Math.Distance.Between(s.x, s.y, cx, cy) > 1200) s.destroy(); });
    cowsToCollect.children.iterate(c => { if (c && Phaser.Math.Distance.Between(c.x, c.y, cx, cy) > 1200) c.destroy(); });
    goldenCows.children.iterate(c => { if (c && Phaser.Math.Distance.Between(c.x, c.y, cx, cy) > 1200) c.destroy(); });
    powerUps.children.iterate(p => { if (p && Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > 1200) p.destroy(); });
    deadCows = deadCows.filter(dc => { if (Phaser.Math.Distance.Between(dc.x, dc.y, cx, cy) > 1200) { dc.destroy(); return false; } return true; });
    eatingWolves = eatingWolves.filter(w => { if (Phaser.Math.Distance.Between(w.x, w.y, cx, cy) > 1200) { w.destroy(); return false; } return true; });
}

function spawnEnemy() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(400, 600);
    let w = this.add.container(pos.x, pos.y, [
        this.add.ellipse(0, 0, 14, 20, 0x696969), this.add.ellipse(0, -12, 10, 12, 0x808080),
        this.add.triangle(-4, -18, 0, 0, -3, -6, 3, -6, 0x555555), this.add.triangle(4, -18, 0, 0, -3, -6, 3, -6, 0x555555),
        this.add.ellipse(0, -16, 6, 5, 0xA9A9A9),
        this.add.circle(-2, -14, 1, 0xFF0000), this.add.circle(2, -14, 1, 0xFF0000),
        this.add.rectangle(0, 12, 4, 10, 0x555555),
        this.add.rectangle(-4, 6, 3, 8, 0x555555), this.add.rectangle(4, 6, 3, 8, 0x555555),
        this.add.rectangle(-4, 10, 3, 8, 0x555555), this.add.rectangle(4, 10, 3, 8, 0x555555)
    ]);
    enemies.add(w);
}

function spawnCow() { if (gameState !== 'playing') return; let pos = randomMapPos(300, 500); cowsToCollect.add(createCow.call(this, pos.x, pos.y)); }

function createCow(x, y) {
    return this.add.container(x, y, [
        this.add.rectangle(0, 0, 15, 20, 0xFFFFFF),
        this.add.circle(-4, -2, 3, 0x000000), this.add.circle(3, 4, 2.5, 0x000000), this.add.circle(-2, 6, 2, 0x000000),
        this.add.rectangle(0, -12, 8, 9, 0xFFFFFF),
        this.add.triangle(-3, -16, 0, 0, -2, -4, 2, -4, 0x888888), this.add.triangle(3, -16, 0, 0, -2, -4, 2, -4, 0x888888),
        this.add.circle(-2, -13, 1, 0x000000), this.add.circle(2, -13, 1, 0x000000)
    ]);
}

function spawnPowerUp() {
    if (gameState !== 'playing') return;
    let pos = randomMapPos(300, 600);
    let types = ['shotgun', 'machinegun', 'minigun', 'multishot'];
    let type = Phaser.Utils.Array.GetRandom(types);
    let names = { shotgun: '🔫 Дробовик', machinegun: '⚡ Автомат', minigun: '🔥 Пулемет', multishot: '⭐ Пушка' };
    let box = this.add.rectangle(0, 0, 44, 44, 0x8B4513);
    box.setStrokeStyle(4, 0x654321);
    let lid = this.add.rectangle(0, -22, 48, 8, 0xA0522D);
    let questionMark = this.add.text(0, 2, '?', { fontSize: '32px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    let pu = this.add.container(pos.x, pos.y, [box, lid, questionMark]);
    pu.type = type; pu.name = names[type];
    powerUps.add(pu);
    this.tweens.add({ targets: pu, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
}

function collectPowerUp(h, pu) { pu.destroy(); activatePowerUp.call(this, pu.type, pu.name); }

function activatePowerUp(type, name) {
    if (activePowerUp) deactivatePowerUp.call(this);
    activePowerUp = { type: type, name: name }; powerUpTimer = 20;
    updateCowboyWeapon.call(this);
    let f = this.add.circle(horse.x, horse.y, 30, 0xffffff, 0.8);
    this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 300, onComplete: () => f.destroy() });
}

function deactivatePowerUp() { activePowerUp = null; powerUpTimer = 0; powerUpText.setText(''); updateCowboyWeapon.call(this); }

function spawnBoss() {
    if (gameState !== 'playing' || bossActive) return;
    bossActive = true;
    this.cameras.main.shake(500, 0.04);
    createBossDarkness.call(this);
    let bt = this.add.text(600, 400, ' БОСС-ВОЛК! 🐺', { fontSize: '72px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: bt, alpha: 0, scale: 2, duration: 3000, onComplete: () => bt.destroy() });
    let pos = randomMapPos(350, 450);
    let boss = this.add.container(pos.x, pos.y, [
        this.add.ellipse(0, 0, 42, 60, 0x440000), this.add.ellipse(0, -36, 30, 36, 0x550000),
        this.add.triangle(-12, -54, 0, 0, -9, -18, 9, -18, 0x330000), this.add.triangle(12, -54, 0, 0, -9, -18, 9, -18, 0x330000),
        this.add.ellipse(0, -48, 18, 15, 0x660000),
        this.add.circle(-6, -42, 3, 0xFF0000), this.add.circle(6, -42, 3, 0xFF0000),
        this.add.rectangle(0, 36, 12, 24, 0x330000),
        this.add.rectangle(-12, 18, 6, 18, 0x330000), this.add.rectangle(12, 18, 6, 18, 0x330000),
        this.add.rectangle(-12, 28, 6, 18, 0x330000), this.add.rectangle(12, 28, 6, 18, 0x330000)
    ]);
    boss.isBoss = true; boss.hp = 200;
    enemies.add(boss);
    let aura = this.add.circle(0, 0, 60, 0xff0000, 0.2); aura.setStrokeStyle(3, 0xff0000, 0.6);
    boss.add(aura);
    this.tweens.add({ targets: aura, scale: 1.3, alpha: 0.1, duration: 800, yoyo: true, repeat: -1 });
}

function shoot() {
    let ar = Phaser.Math.DegToRad(cowboy.angle);
    let bx = horse.x + Math.cos(ar - Math.PI / 2) * 14;
    let by = horse.y + Math.sin(ar - Math.PI / 2) * 14;
    let wmx = mouseX + this.cameras.main.scrollX, wmy = mouseY + this.cameras.main.scrollY;
    let angle = Phaser.Math.Angle.Between(bx, by, wmx, wmy);
    let bs = 600;
    let wt = activePowerUp ? activePowerUp.type : 'pistol';
    let colors = { pistol: 0x222222, shotgun: 0xFF0000, machinegun: 0x0000FF, minigun: 0x8B4513, multishot: 0xFF8800 };
    let c = colors[wt] || 0x222222;
    if (wt === 'shotgun') { for (let i = -2; i <= 2; i++) mkBullet.call(this, bx, by, angle + i * 0.15, bs, c); }
    else if (wt === 'machinegun') { mkBullet.call(this, bx, by, angle, bs, c); }
    else if (wt === 'minigun') { mkBullet.call(this, bx, by, angle + (Math.random() - 0.5) * 0.6, bs, c); }
    else if (wt === 'multishot') { for (let i = 0; i < 8; i++) mkBullet.call(this, bx, by, (Math.PI * 2 / 8) * i, bs, c); }
    else { mkBullet.call(this, bx, by, angle, bs, c); }
    let mf = this.add.circle(bx, by, 6, 0xFFDD00, 0.8);
    this.tweens.add({ targets: mf, alpha: 0, scale: 1.5, duration: 100, onComplete: () => mf.destroy() });
}

function mkBullet(x, y, a, s, color) {
    let b = this.add.circle(x, y, 4, color);
    this.physics.add.existing(b); bullets.add(b);
    b.body.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
}

function hitBulletEnemy(b, e) {
    b.destroy();
    if (e.isBoss) {
        e.hp--;
        if (e.hp <= 0) killBoss.call(this, e);
        else { let f = this.add.circle(e.x, e.y, 10, 0xffffff, 0.8); this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 200, onComplete: () => f.destroy() }); }
    } else {
        e.destroy(); score += 10; wolvesKilled++;
        createWolfSkeleton.call(this, e.x, e.y, false, e.angle);
        createBloodStain.call(this, e.x, e.y);
        if (wolvesKilled >= 10 && !achievements.firstBlood) { achievements.firstBlood = true; showAchievement.call(this, '🗡️ ПЕРВАЯ КРОВЬ!'); }
        if (wolvesKilled >= 100 && !achievements.hunter) { achievements.hunter = true; showAchievement.call(this, '🏹 ОХОТНИК!'); }
        if (wolvesKilled >= 1000 && !achievements.legend) { achievements.legend = true; showAchievement.call(this, '👑 ЛЕГЕНДА!'); }
        let f = this.add.circle(e.x, e.y, 10, 0xFFFFFF, 0.8);
        this.tweens.add({ targets: f, alpha: 0, scale: 3, duration: 250, onComplete: () => f.destroy() });
    }
}

function hitEnemy(h, e) {
    if (e.isBoss) { loseHP.call(this); this.cameras.main.shake(200, 0.02); return; }
    e.destroy(); this.cameras.main.shake(200, 0.02);
    if (cows.length > 0) { cows.pop().destroy(); let f = this.add.circle(horse.x, horse.y, 15, 0xFFAA00, 0.8); this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 300, onComplete: () => f.destroy() }); }
    else loseHP.call(this);
}

function loseHP() {
    horseHP--; updateHPDisplay.call(this);
    let f = this.add.circle(horse.x, horse.y, 20, 0xFF0000, 0.8);
    this.tweens.add({ targets: f, alpha: 0, scale: 2.5, duration: 400, onComplete: () => f.destroy() });
    if (horseHP <= 0) gameOver.call(this);
}

function updateHPDisplay() { let h = ''; for (let i = 0; i < horseHP; i++) h += '❤️'; this.hpText.setText(h); }

function collectCow(h, cow) {
    cow.destroy(); cows.push(createCow.call(this, horse.x, horse.y + 50));
    score += 5; totalCowsCollected++; totalCowsEverSaved++;
    localStorage.setItem('totalCowsEverSaved', totalCowsEverSaved);
    cowsForSkills++;
    if (totalCowsCollected >= 20 && !achievements.shepherd) { achievements.shepherd = true; showAchievement.call(this, '🐕 ПАСТУХ!'); }
    let f = this.add.circle(horse.x, horse.y, 15, 0xFFFF00, 0.8);
    this.tweens.add({ targets: f, alpha: 0, scale: 2, duration: 300, onComplete: () => f.destroy() });
}

function killCowByWolf(cow, wolf) {
    cows = cows.filter(c => c !== cow);
    deadCows.push(createDeadCow.call(this, cow.x, cow.y, cow.angle));
    eatingWolves.push(wolf);
    let f = this.add.circle(cow.x, cow.y, 15, 0xFF0000, 0.8);
    this.tweens.add({ targets: f, alpha: 0, scale: 2.5, duration: 300, onComplete: () => f.destroy() });
    cow.destroy();
}

function createDeadCow(x, y, angle) {
    let skeleton = this.add.graphics();
    skeleton.lineStyle(2, 0xDDDDDD, 0.8);
    skeleton.strokeCircle(0, -15, 6);
    skeleton.lineBetween(-4, -20, -8, -28); skeleton.lineBetween(4, -20, 8, -28);
    skeleton.strokeCircle(-2, -16, 1.5); skeleton.strokeCircle(2, -16, 1.5);
    skeleton.lineBetween(0, -9, 0, 10);
    for (let i = 0; i < 3; i++) skeleton.strokeEllipse(-5, -4 + i * 4, 10, 3);
    skeleton.strokeEllipse(0, 13, 8, 5);
    skeleton.lineBetween(-4, 16, -5, 28); skeleton.lineBetween(4, 16, 5, 28);
    let container = this.add.container(x, y, [skeleton]);
    container.angle = angle || 0; container.alpha = 0.6;
    return container;
}

function gameOver() {
    gameState = 'gameover';
    document.querySelectorAll('button').forEach(b => b.remove());
    
    if (score > highScore) { highScore = score; localStorage.setItem('cowboyHighScore', highScore); }
    removeBossDarkness.call(this);
    
    let goUI = this.add.container(600, 400);
    goUI.setScrollFactor(0);
    goUI.add(this.add.rectangle(0, 0, 900, 750, 0x000000, 0.95).setStrokeStyle(4, 0xFF0000));
    goUI.add(this.add.text(0, -320, '💀 GAME OVER 💀', { fontSize: '56px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5));
    goUI.add(this.add.text(0, -260, 'Счет: ' + score, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -220, '🏆 Рекорд: ' + highScore, { fontSize: '28px', fill: '#ffff00' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -185, '🐄 Спасено: ' + totalCowsCollected + ' | ✨ Золотых: ' + goldenCowsCollected, { fontSize: '22px', fill: '#aaffaa' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -155, '🐺 Волков: ' + wolvesKilled + ' | 🐂 Быков: ' + bullsKilled, { fontSize: '20px', fill: '#ffaaaa' }).setOrigin(0.5));
    
    goUI.add(this.add.text(0, -115, ' ДОСТИЖЕНИЯ', { fontSize: '26px', fill: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5));
    
    let achievementList = [
        { name: '🗡️ Первая кровь (10 волков)', unlocked: achievements.firstBlood },
        { name: '🐕 Пастух (20 коров)', unlocked: achievements.shepherd },
        { name: '️ God of War (босс)', unlocked: achievements.godOfWar },
        { name: ' Выживший (10 минут)', unlocked: achievements.survivor },
        { name: '✨ Золотая лихорадка', unlocked: achievements.goldenFever },
        { name: '🏹 Охотник (100 волков)', unlocked: achievements.hunter },
        { name: '👑 Легенда (1000 волков)', unlocked: achievements.legend },
        { name: ' Тореадор (3 быка)', unlocked: achievements.bullfighter }
    ];
    
    let yPos = -80;
    achievementList.forEach(a => {
        let color = a.unlocked ? '#00FF00' : '#666666';
        let icon = a.unlocked ? '✅' : '❌';
        goUI.add(this.add.text(0, yPos, icon + ' ' + a.name, { fontSize: '18px', fill: color }).setOrigin(0.5));
        yPos += 25;
    });
    
    goUI.add(this.add.text(0, yPos + 15, 'Всего за все игры: ' + totalCowsEverSaved + ' 🐄 | ' + totalGoldenCowsEver + ' ✨', { fontSize: '16px', fill: '#88ff88' }).setOrigin(0.5));
    
    let playBtn = document.createElement('button');
    playBtn.textContent = '▶ ИГРАТЬ СНОВА';
    playBtn.style.cssText = 'position:absolute;left:50%;top:82%;transform:translate(-50%,-50%);padding:12px 40px;font-size:24px;font-weight:bold;color:white;background:#228B22;border:4px solid #00FF00;border-radius:10px;cursor:pointer;z-index:9999;font-family:Arial;';
    playBtn.onmouseover = () => playBtn.style.background = '#32CD32';
    playBtn.onmouseout = () => playBtn.style.background = '#228B22';
    playBtn.onclick = () => { window.location.reload(); };
    document.body.appendChild(playBtn);
    
    let shareBtn = document.createElement('button');
    shareBtn.textContent = '📋 ПОДЕЛИТЬСЯ';
    shareBtn.style.cssText = 'position:absolute;left:50%;top:92%;transform:translate(-50%,-50%);padding:10px 30px;font-size:20px;font-weight:bold;color:white;background:#4444CC;border:3px solid #6666FF;border-radius:10px;cursor:pointer;z-index:9999;font-family:Arial;';
    shareBtn.onmouseover = () => shareBtn.style.background = '#5555DD';
    shareBtn.onmouseout = () => shareBtn.style.background = '#4444CC';
    shareBtn.onclick = () => {
        let mins = Math.floor(gameTime / 60);
        let secs = Math.floor(gameTime % 60);
        let timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
        let unlockedCount = achievementList.filter(a => a.unlocked).length;
        let shareText = '🤠 КОВБОЙ И СТАДО 🐄\n' +
            '━━━━━━━━━━━━━━\n' +
            '🏆 Счёт: ' + score + '\n' +
            '️ Время: ' + timeStr + '\n' +
            '🐄 Спасено коров: ' + totalCowsCollected + '\n' +
            '✨ Золотых коров: ' + goldenCowsCollected + '\n' +
            '🐺 Волков убито: ' + wolvesKilled + '\n' +
            '🐂 Быков убито: ' + bullsKilled + '\n' +
            '🏅 Достижений: ' + unlockedCount + '/' + achievementList.length + '\n' +
            '━━━━━━━━━━━━━━\n' +
            '🔗 Попробуй сам!';
        
        navigator.clipboard.writeText(shareText).then(() => {
            shareBtn.textContent = '✅ СКОПИРОВАНО!';
            shareBtn.style.background = '#228B22';
            setTimeout(() => { shareBtn.textContent = '📋 ПОДЕЛИТЬСЯ'; shareBtn.style.background = '#4444CC'; }, 2000);
        }).catch(() => {
            let textarea = document.createElement('textarea');
            textarea.value = shareText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            shareBtn.textContent = '✅ СКОПИРОВАНО!';
            shareBtn.style.background = '#228B22';
            setTimeout(() => { shareBtn.textContent = '📋 ПОДЕЛИТЬСЯ'; shareBtn.style.background = '#4444CC'; }, 2000);
        });
    };
    document.body.appendChild(shareBtn);
}

const config = {
    type: Phaser.AUTO, width: 1200, height: 800, parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);

let gameState = 'menu';
let gameOverTriggered = false;
let totalCowsEverSaved = parseInt(localStorage.getItem('totalCowsEverSaved')) || 0;
let totalGoldenCowsEver = parseInt(localStorage.getItem('totalGoldenCowsEver')) || 0;

let horse, cowboy, gun, crosshair;
let enemies, bullets, bgDecorations, powerUps, wolfSkeletons;
let cows = [], cowsToCollect, goldenCows;
let deadCows = [], eatingWolves = [];
let dogCompanion = null;
let baseHorseSpeed = 200, baseFireRate = 300, nextFireTime = 0;
let mouseX = 600, mouseY = 400, horseHP = 3;
let score = 0, highScore = parseInt(localStorage.getItem('cowboyHighScore')) || 0;
let gameTime = 0, bossActive = false, lastBossSpawn = 0;
let totalCowsCollected = 0, goldenCowsCollected = 0;
let activePowerUp = null, powerUpTimer = 0, powerUpText = null;
let skillButtons = [], activeSkills = {};
let menuUI = null, gameUI = null, bossDarkOverlay = null;
let wolfSpawnRate = 800, powerUpSpawnRate = 25000;
let lastDifficultyIncrease = 0, lastPowerUpSpawn = 0;
let lastEnemySpawnTime = 0; // Добавлено для динамического спавна

let achievements = {
    firstBlood: false, shepherd: false, godOfWar: false,
    survivor: false, goldenFever: false, hunter: false, legend: false,
    bullfighter: false
};
let wolvesKilled = 0;
let bullsKilled = 0;

const MAP_SIZE = 20000;
const MAP_HALF = MAP_SIZE / 2;
const MAP_LIMIT = MAP_HALF - 1;

let bulls = [];
let bloodStains = [];
let dustParticles = [];
let tumbleweeds = [];
let lastDustTime = 0;

const MAX_DECORATIONS = 150;
const MAX_ENEMIES = 30;
const MAX_BLOOD_STAINS = 20;
const MAX_SKELETONS = 15;
let lastMoveTime = 0;
let isMoving = false;

function preload() {}

function create() {
    this.physics.world.setBounds(-MAP_HALF, -MAP_HALF, MAP_SIZE, MAP_SIZE);
    this.add.rectangle(0, 0, MAP_SIZE, MAP_SIZE, 0x7EC850);
    createForestBorders.call(this);
    showMainMenu.call(this);
}

function createForestBorders() {
    var g = this.add.graphics();
    var colors = [0x2D5016, 0x1A3D0F, 0x3A6B1E];
    var treeCount = 400;
    for (var i = 0; i < treeCount; i++) {
        var side = Phaser.Math.Between(0, 3);
        var tx = 0, ty = 0;
        if (side === 0) { tx = Phaser.Math.Between(-MAP_HALF, MAP_HALF); ty = Phaser.Math.Between(-MAP_HALF, -MAP_HALF + 400); }
        else if (side === 1) { tx = Phaser.Math.Between(-MAP_HALF, MAP_HALF); ty = Phaser.Math.Between(MAP_HALF - 400, MAP_HALF); }
        else if (side === 2) { tx = Phaser.Math.Between(-MAP_HALF, -MAP_HALF + 400); ty = Phaser.Math.Between(-MAP_HALF, MAP_HALF); }
        else { tx = Phaser.Math.Between(MAP_HALF - 400, MAP_HALF); ty = Phaser.Math.Between(-MAP_HALF, MAP_HALF); }
        g.fillStyle(colors[Phaser.Math.Between(0, 2)], 0.8);
        g.fillCircle(tx, ty, Phaser.Math.Between(30, 70));
    }
    g.fillStyle(0x2D5016, 0.5);
    g.fillRect(-MAP_HALF, -MAP_HALF, MAP_SIZE, 200);
    g.fillRect(-MAP_HALF, MAP_HALF - 200, MAP_SIZE, 200);
    g.fillRect(-MAP_HALF, -MAP_HALF, 200, MAP_SIZE);
    g.fillRect(MAP_HALF - 200, -MAP_HALF, 200, MAP_SIZE);
}

function showMainMenu() {
    gameState = 'menu';
    gameOverTriggered = false;
    if (menuUI) { menuUI.destroy(); menuUI = null; }
    menuUI = this.add.container(600, 400);
    
    var wallBg = this.add.graphics();
    wallBg.fillStyle(0x4A3228, 1);
    wallBg.fillRect(-550, -380, 1100, 760);
    wallBg.lineStyle(3, 0x2A1A0F, 0.8);
    for (var i = 0; i < 12; i++) wallBg.lineBetween(-550, -380 + i * 65, 550, -380 + i * 65);
    wallBg.lineStyle(1, 0x3A2418, 0.4);
    for (var i = 0; i < 20; i++) wallBg.lineBetween(-550 + i * 58, -380, -550 + i * 58, 380);
    menuUI.add(wallBg);
    
    var doorL = this.add.graphics();
    doorL.fillStyle(0x6B4423, 1); doorL.fillRect(-530, -100, 160, 500);
    doorL.lineStyle(4, 0x4A2F1A, 1);
    doorL.lineBetween(-530, -50, -370, -50); doorL.lineBetween(-530, 50, -370, 50);
    doorL.lineBetween(-530, 150, -370, 150); doorL.lineBetween(-530, 250, -370, 250);
    doorL.lineStyle(5, 0x3A1F0F, 1); doorL.strokeRect(-530, -100, 160, 500);
    menuUI.add(doorL);
    
    var doorR = this.add.graphics();
    doorR.fillStyle(0x6B4423, 1); doorR.fillRect(370, -100, 160, 500);
    doorR.lineStyle(4, 0x4A2F1A, 1);
    doorR.lineBetween(370, -50, 530, -50); doorR.lineBetween(370, 50, 530, 50);
    doorR.lineBetween(370, 150, 530, 150); doorR.lineBetween(370, 250, 530, 250);
    doorR.lineStyle(5, 0x3A1F0F, 1); doorR.strokeRect(370, -100, 160, 500);
    menuUI.add(doorR);
    
    var signBg = this.add.graphics();
    signBg.fillStyle(0x8B5A2B, 1); signBg.fillRoundedRect(-320, -360, 640, 100, 8);
    signBg.lineStyle(6, 0x3A1F0F, 1); signBg.strokeRoundedRect(-320, -360, 640, 100, 8);
    signBg.lineStyle(2, 0xFFD700, 0.8); signBg.strokeRoundedRect(-310, -350, 620, 80, 6);
    menuUI.add(signBg);
    
    menuUI.add(this.add.text(0, -310, 'HORNS AND HOOFS', {
        fontSize: '42px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6, fontFamily: 'Georgia'
    }).setOrigin(0.5));
    menuUI.add(this.add.text(0, -255, 'Собирай. Выживай. Стреляй!', {
        fontSize: '20px', fill: '#FFE4B5', fontStyle: 'italic', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5));
    menuUI.add(this.add.text(-350, -310, '★', { fontSize: '28px', fill: '#FFD700' }).setOrigin(0.5));
    menuUI.add(this.add.text(350, -310, '★', { fontSize: '28px', fill: '#FFD700' }).setOrigin(0.5));
    menuUI.add(this.add.text(0, -200, 'РЕКОРД: ' + highScore, {
        fontSize: '24px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5));
    menuUI.add(this.add.text(0, -170, 'Спасено: ' + totalCowsEverSaved + '  |  Золотых: ' + totalGoldenCowsEver, {
        fontSize: '16px', fill: '#DDDDDD', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5));
    
    var descBg = this.add.graphics();
    descBg.fillStyle(0x6B4423, 0.95); descBg.fillRoundedRect(-350, -130, 700, 180, 10);
    descBg.lineStyle(4, 0x3A1F0F, 1); descBg.strokeRoundedRect(-350, -130, 700, 180, 10);
    menuUI.add(descBg);
    menuUI.add(this.add.text(0, -40,
        'Выживание в мире Дикого Запада!\nСобирай коров в стадо → трать на скиллы\nПодбирай ящики с оружием на поле\nКаждую минуту появляется босс-волк\nЗлые быки — направь их на врагов!\n3 золотые коровы = дополнительная жизнь', {
        fontSize: '15px', fill: '#FFE4B5', align: 'center', lineSpacing: 5, stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5));
    
    var ctrlBg = this.add.graphics();
    ctrlBg.fillStyle(0x6B4423, 0.95); ctrlBg.fillRoundedRect(-280, 70, 560, 90, 10);
    ctrlBg.lineStyle(4, 0x3A1F0F, 1); ctrlBg.strokeRoundedRect(-280, 70, 560, 90, 10);
    menuUI.add(ctrlBg);
    menuUI.add(this.add.text(0, 115,
        'УПРАВЛЕНИЕ\nДвижение: WASD или стрелки\nПрицел: мышь  |  Стрельба: авто  |  Скиллы: клик справа', {
        fontSize: '14px', fill: '#87CEEB', align: 'center', lineSpacing: 4, stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5));
    
    var playBtnBg = this.add.graphics();
    playBtnBg.fillStyle(0x8B0000, 1); playBtnBg.fillRoundedRect(-140, 190, 280, 70, 8);
    playBtnBg.lineStyle(5, 0xFFD700, 1); playBtnBg.strokeRoundedRect(-140, 190, 280, 70, 8);
    menuUI.add(playBtnBg);
    
    var playBtn = this.add.rectangle(0, 225, 280, 70, 0x8B0000, 0.01);
    menuUI.add(playBtn);
    menuUI.add(this.add.text(0, 225, '▶ ИГРАТЬ ▶', {
        fontSize: '32px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5, fontFamily: 'Georgia'
    }).setOrigin(0.5));
    playBtn.setInteractive({ useHandCursor: true });
    playBtn.on('pointerover', function() { playBtnBg.setFillStyle(0xAA0000); });
    playBtn.on('pointerout', function() { playBtnBg.setFillStyle(0x8B0000); });
    playBtn.on('pointerdown', function() { startGame.call(this); }, this);
    menuUI.add(this.add.text(0, 340, 'v1.0 | HORNS AND HOOFS', {
        fontSize: '12px', fill: '#888888', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5));
}

function createCrosshair() {
    crosshair = this.add.graphics();
    crosshair.setScrollFactor(0);
    crosshair.setDepth(1000);
    crosshair.lineStyle(2, 0xFF0000, 1);
    crosshair.lineBetween(-12, 0, -4, 0);
    crosshair.lineBetween(4, 0, 12, 0);
    crosshair.lineBetween(0, -12, 0, -4);
    crosshair.lineBetween(0, 4, 0, 12);
    crosshair.strokeCircle(0, 0, 8);
}

function createHorse() {
    var parts = [
        this.add.ellipse(0, 0, 28, 40, 0x8B4513), this.add.rectangle(0, -18, 10, 15, 0x8B4513),
        this.add.ellipse(0, -28, 14, 18, 0x8B4513),
        this.add.triangle(-5, -36, 0, 0, -3, -8, 3, -8, 0x6B3410),
        this.add.triangle(5, -36, 0, 0, -3, -8, 3, -8, 0x6B3410),
        this.add.circle(-3, -30, 1.5, 0x000000), this.add.circle(3, -30, 1.5, 0x000000),
        this.add.rectangle(0, -10, 8, 20, 0x3D2817), this.add.rectangle(0, 22, 6, 15, 0x3D2817),
        this.add.rectangle(-8, 12, 4, 12, 0x6B3410), this.add.rectangle(8, 12, 4, 12, 0x6B3410),
        this.add.rectangle(-8, 18, 4, 12, 0x6B3410), this.add.rectangle(8, 18, 4, 12, 0x6B3410)
    ];
    return this.add.container(0, 0, parts);
}

function createCowboy() {
    var cb = this.add.rectangle(0, 0, 20, 24, 0x8B0000);
    var ch = this.add.circle(0, -18, 9, 0xFFCCAA);
    var hb = this.add.ellipse(0, -26, 28, 8, 0x654321);
    var ht = this.add.rectangle(0, -30, 14, 10, 0x654321);
    var bn = this.add.triangle(0, -8, -8, 0, 8, 0, 0, 8, 0xCC0000);
    var g = this.add.rectangle(14, 0, 16, 5, 0x222222);
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
    var toRemove = [];
    cowboy.list.forEach(function(child, idx) { if (idx > 4) toRemove.push(child); });
    toRemove.forEach(function(c) { c.destroy(); });
    var wt = activePowerUp.type;
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
    var a = Math.random() * Math.PI * 2;
    var d = Phaser.Math.Between(distMin, distMax);
    var x = Phaser.Math.Clamp(horse.x + Math.cos(a) * d, -MAP_LIMIT, MAP_LIMIT);
    var y = Phaser.Math.Clamp(horse.y + Math.sin(a) * d, -MAP_LIMIT, MAP_LIMIT);
    return { x: x, y: y };
}

function startGame() {
    document.querySelectorAll('button').forEach(function(b) { b.remove(); });
    gameState = 'playing';
    gameOverTriggered = false;
    if (menuUI) { menuUI.destroy(); menuUI = null; }
    score = 0; gameTime = 0; bossActive = false; lastBossSpawn = 0;
    totalCowsCollected = 0; goldenCowsCollected = 0;
    cows = []; deadCows = []; eatingWolves = [];
    activePowerUp = null; powerUpTimer = 0;
    activeSkills = {}; dogCompanion = null;
    bossDarkOverlay = null;
    wolfSpawnRate = 800; powerUpSpawnRate = 25000;
    lastDifficultyIncrease = 0; lastPowerUpSpawn = 0;
    lastEnemySpawnTime = this.time.now; // Инициализация времени спавна
    horseHP = 3;
    wolvesKilled = 0; bullsKilled = 0;
    bulls = []; bloodStains = []; dustParticles = []; tumbleweeds = [];
    lastDustTime = 0; lastMoveTime = 0; isMoving = false;
    achievements = { firstBlood: false, shepherd: false, godOfWar: false, survivor: false, goldenFever: false, hunter: false, legend: false, bullfighter: false };
    
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
    this.input.on('pointermove', function(p) { mouseX = p.x; mouseY = p.y; });
    this.input.on('pointerdown', function(pointer) {
        if (pointer.leftButtonDown() && gameState === 'playing') checkSkillButtonClick.call(this, pointer);
    }, this);
    
    this.time.addEvent({ delay: 1000, callback: spawnObstacle, callbackScope: this, loop: true });
    // УДАЛЕНО: this.time.addEvent({ delay: 800, callback: spawnEnemy, callbackScope: this, loop: true });
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
    this.scoreText = this.add.text(10, 50, 'Счёт: 0', { fontSize: '24px', fill: '#ffffff' });
    gameUI.add(this.scoreText);
    this.cowCountText = this.add.text(10, 80, 'Коровы: 0', { fontSize: '24px', fill: '#ffffff' });
    gameUI.add(this.cowCountText);
    this.goldenCowText = this.add.text(10, 110, 'Золотые: 0/3', { fontSize: '20px', fill: '#FFD700' });
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
    createCrosshair.call(this);
    this.cameras.main.setBounds(-MAP_HALF, -MAP_HALF, MAP_SIZE, MAP_SIZE);
    this.cameras.main.startFollow(horse, true, 0.1, 0.1);
}

function spawnTumbleweed() {
    if (gameState !== 'playing') return;
    var tw = this.add.graphics();
    var colors = [0x8B6914, 0xA0820A, 0x9B7B0A, 0x7A5F0F];
    for (var i = 0; i < 12; i++) {
        var startAngle = Math.random() * Math.PI * 2;
        var endAngle = startAngle + (Math.random() * 0.8 + 0.3);
        var radius = Math.random() * 12 + 8;
        var color = colors[Math.floor(Math.random() * colors.length)];
        tw.lineStyle(2, color, 0.9);
        tw.beginPath();
        tw.arc(0, 0, radius, startAngle, endAngle, false);
        tw.strokePath();
    }
    for (var i = 0; i < 8; i++) {
        var angle = Math.random() * Math.PI * 2;
        var innerR = Math.random() * 5 + 3;
        var outerR = Math.random() * 8 + 10;
        var color = colors[Math.floor(Math.random() * colors.length)];
        tw.lineStyle(1.5, color, 0.8);
        tw.beginPath();
        tw.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        var midAngle = angle + (Math.random() - 0.5) * 0.5;
        var midR = (innerR + outerR) / 2;
        tw.lineTo(Math.cos(midAngle) * midR, Math.sin(midAngle) * midR);
        tw.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        tw.strokePath();
    }
    var startX = horse.x - 800;
    var startY = horse.y + Phaser.Math.Between(-400, 400);
    tw.setPosition(startX, startY);
    var speed = Phaser.Math.Between(1, 3);
    tumbleweeds.push({ sprite: tw, speed: speed, rotation: 0 });
}

function updateTumbleweeds() {
    for (var i = tumbleweeds.length - 1; i >= 0; i--) {
        var tw = tumbleweeds[i];
        tw.sprite.x += tw.speed;
        tw.rotation += 0.05;
        tw.sprite.rotation = tw.rotation;
        if (tw.sprite.x > horse.x + 1000) {
            tw.sprite.destroy();
            tumbleweeds.splice(i, 1);
        }
    }
}

function spawnBull() {
    if (gameState !== 'playing') return;
    var pos = randomMapPos(500, 900);
    bulls.push(createBull.call(this, pos.x, pos.y));
}

function createBull(x, y) {
    var c = this.add.container(x, y, [
        this.add.ellipse(0, 0, 35, 45, 0x4A2511),
        this.add.ellipse(0, -25, 22, 20, 0x5C2E0E),
        this.add.triangle(-10, -32, 0, 0, -8, -15, -2, -8, 0xDDDDAA),
        this.add.triangle(10, -32, 0, 0, 8, -15, 2, -8, 0xDDDDAA),
        this.add.circle(-4, -20, 2, 0x000000), this.add.circle(4, -20, 2, 0x000000),
        this.add.circle(-6, -28, 2, 0x000000), this.add.circle(6, -28, 2, 0x000000),
        this.add.rectangle(0, 25, 4, 12, 0x3A1D0A)
    ]);
    c.hp = 5; c.angry = false; c.attackTimer = 0; c.angle = 0; c.wanderTarget = null;
    return c;
}

function killBull(bull) {
    if (!bull || !bull.active) return;
    var bx = bull.x, by = bull.y, ang = bull.angle;
    var idx = bulls.indexOf(bull);
    if (idx >= 0) bulls.splice(idx, 1);
    var sk = this.add.graphics();
    sk.lineStyle(3, 0xDDDDDD, 0.8);
    sk.strokeCircle(0, -30, 12);
    sk.lineBetween(-8, -38, -15, -50); sk.lineBetween(8, -38, 15, -50);
    sk.strokeCircle(-4, -32, 2); sk.strokeCircle(4, -32, 2);
    sk.lineBetween(0, -18, 0, 20);
    for (var i = 0; i < 4; i++) sk.strokeEllipse(-8, -10 + i * 8, 16, 6);
    sk.strokeEllipse(0, 25, 14, 8);
    sk.lineBetween(-7, 30, -10, 50); sk.lineBetween(7, 30, 10, 50);
    var sc = this.add.container(bx, by, [sk]);
    sc.angle = ang; sc.alpha = 0.6;
    wolfSkeletons.add(sc);
    this.tweens.add({ targets: sc, alpha: 0, duration: 8000, onComplete: function() { sc.destroy(); } });
    bull.destroy();
    bullsKilled++; score += 50;
    if (bullsKilled >= 3 && !achievements.bullfighter) { achievements.bullfighter = true; showAchievement.call(this, 'ТОРЕАДОР!'); }
}

function hitBull(bull) {
    if (!bull || !bull.active) return;
    bull.hp--; 
    bull.angry = true;
    var impactX = bull.x, impactY = bull.y;
    var flash = this.add.circle(impactX, impactY, 8, 0xFF4400, 0.7);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.5, duration: 200, onComplete: function() { flash.destroy(); } });
    for (var i = 0; i < 4; i++) {
        var angle = (Math.PI * 2 / 4) * i;
        var dist = Phaser.Math.Between(5, 12);
        var particle = this.add.circle(impactX + Math.cos(angle) * dist, impactY + Math.sin(angle) * dist, Phaser.Math.Between(1, 3), 0xFF6600, 0.8);
        this.tweens.add({ targets: particle, alpha: 0, scale: 0.3, duration: 250, onComplete: function() { particle.destroy(); } });
    }
    var hp = this.add.text(bull.x, bull.y - 25, bull.hp + '/5', { fontSize: '16px', fill: '#FF4400', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: hp, y: bull.y - 50, alpha: 0, duration: 600, onComplete: function() { hp.destroy(); } });
    if (bull.hp <= 0) killBull.call(this, bull);
    else if (bull.hp === 4) {
        var w = this.add.text(bull.x, bull.y - 40, 'БЫК РАЗОЗЛЁН!', { fontSize: '18px', fill: '#FF0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        this.tweens.add({ targets: w, y: bull.y - 80, alpha: 0, duration: 1200, onComplete: function() { w.destroy(); } });
    }
}

function spawnDustParticle() {
    var ox = Phaser.Math.Between(-10, 10);
    var oy = Phaser.Math.Between(15, 25);
    var d = this.add.circle(horse.x + ox, horse.y + oy, Phaser.Math.Between(3, 6), 0xBBAA88, 0.6);
    dustParticles.push({ sprite: d, life: 1.0 });
}

function updateDustParticles() {
    for (var i = dustParticles.length - 1; i >= 0; i--) {
        var p = dustParticles[i];
        p.life -= 0.03;
        if (p.sprite && p.sprite.active) { p.sprite.alpha = p.life * 0.6; p.sprite.scaleX = 1 + (1 - p.life) * 0.5; p.sprite.scaleY = 1 + (1 - p.life) * 0.5; }
        if (p.life <= 0) { if (p.sprite && p.sprite.active) p.sprite.destroy(); dustParticles.splice(i, 1); }
    }
}

function createBloodStain(x, y) {
    while (bloodStains.length >= MAX_BLOOD_STAINS) { 
        var old = bloodStains.shift(); 
        if (old && old.active) old.destroy(); 
    }
    var s = this.add.graphics();
    s.fillStyle(0x660000, 0.7);
    s.fillEllipse(0, 0, Phaser.Math.Between(20, 35), Phaser.Math.Between(15, 25));
    for (var i = 0; i < 4; i++) s.fillCircle(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-15, 15), Phaser.Math.Between(2, 5));
    s.setPosition(x, y); s.alpha = 0.8;
    bloodStains.push(s);
}

function updateBloodStains() {
    for (var i = bloodStains.length - 1; i >= 0; i--) {
        bloodStains[i].alpha -= 0.002;
        if (bloodStains[i].alpha <= 0) { bloodStains[i].destroy(); bloodStains.splice(i, 1); }
    }
}

function spawnGrassPatch() {
    if (gameState !== 'playing') return;
    if (!isMoving && bgDecorations.getChildren().length >= MAX_DECORATIONS) return;
    var pos = randomMapPos(600, 1200);
    var p = this.add.graphics();
    var w = Phaser.Math.Between(150, 300), h = Phaser.Math.Between(80, 150);
    var colors = [0x6DB844, 0x72C04A, 0x68B040, 0x75C84D];
    p.fillStyle(colors[Phaser.Math.Between(0, 3)], 0.4); p.fillEllipse(0, 0, w, h);
    p.fillStyle(0x8FD860, 0.2); p.fillEllipse(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
    p.setPosition(pos.x, pos.y); bgDecorations.add(p);
}

function spawnBgHill() {
    if (gameState !== 'playing') return;
    if (!isMoving && bgDecorations.getChildren().length >= MAX_DECORATIONS) return;
    var pos = randomMapPos(700, 1300);
    var h = this.add.graphics();
    var w = Phaser.Math.Between(120, 250), hh = Phaser.Math.Between(60, 120);
    h.fillStyle(0x3D5A20, 0.3); h.fillEllipse(5, 10, w * 1.1, hh * 0.5);
    var cs = [0x5A9A30, 0x62A535, 0x528F2B];
    h.fillStyle(cs[Phaser.Math.Between(0, 2)], 0.7); h.fillEllipse(0, 0, w, hh);
    h.fillStyle(0x7EC850, 0.4); h.fillEllipse(-w * 0.2, -hh * 0.2, w * 0.5, hh * 0.5);
    h.fillStyle(0x3D5A20, 0.3); h.fillEllipse(w * 0.25, hh * 0.25, w * 0.4, hh * 0.4);
    h.setPosition(pos.x, pos.y); bgDecorations.add(h);
}

function spawnBgDecoration() {
    if (gameState !== 'playing') return;
    if (!isMoving && bgDecorations.getChildren().length >= MAX_DECORATIONS) return;
    var pos = randomMapPos(500, 1100);
    var t = Phaser.Math.Between(0, 9);
    var d = this.add.graphics();
    if (t === 0) { for (var i = 0; i < Phaser.Math.Between(5, 7); i++) { d.lineStyle(2, 0x4A7A2A, 0.8); d.lineBetween((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8, -Phaser.Math.Between(12, 20)); } }
    else if (t === 1) { d.lineStyle(2, 0x5DA83A, 0.7); d.lineBetween(0, 0, -3, -8); d.lineBetween(0, 0, 0, -10); d.lineBetween(0, 0, 3, -8); }
    else if (t === 2) { d.fillStyle(0x3D5A20, 0.3); d.fillEllipse(2, 3, 8, 4); d.lineStyle(1, 0x4A7A2A, 0.8); d.lineBetween(0, 0, 0, -8); d.fillStyle(0xDD2222, 0.9); d.fillCircle(-2, -10, 3); d.fillCircle(2, -10, 3); d.fillCircle(0, -12, 3); d.fillCircle(0, -8, 3); d.fillStyle(0x222222, 1); d.fillCircle(0, -10, 1.5); }
    else if (t === 3) { d.fillStyle(0x3D5A20, 0.3); d.fillEllipse(2, 3, 8, 4); d.lineStyle(1, 0x4A7A2A, 0.8); d.lineBetween(0, 0, 0, -7); d.fillStyle(0xFFDD00, 0.9); d.fillCircle(-2, -9, 2.5); d.fillCircle(2, -9, 2.5); d.fillCircle(0, -11, 2.5); d.fillCircle(0, -7, 2.5); d.fillStyle(0xFF8800, 1); d.fillCircle(0, -9, 1.5); }
    else if (t === 4) { d.fillStyle(0x3D5A20, 0.3); d.fillEllipse(2, 3, 8, 4); d.lineStyle(1, 0x4A7A2A, 0.8); d.lineBetween(0, 0, 0, -8); d.fillStyle(0x9944CC, 0.9); d.fillCircle(-2, -10, 3); d.fillCircle(2, -10, 3); d.fillCircle(0, -12, 3); d.fillCircle(0, -8, 3); d.fillStyle(0xFFFF00, 1); d.fillCircle(0, -10, 1.5); }
    else if (t === 5) { d.fillStyle(0x3D5A20, 0.3); d.fillEllipse(2, 3, 8, 4); d.lineStyle(1, 0x4A7A2A, 0.8); d.lineBetween(0, 0, 0, -8); d.fillStyle(0xFFFFFF, 0.9); for (var i = 0; i < 6; i++) { var a = (Math.PI * 2 / 6) * i; d.fillCircle(Math.cos(a) * 3, -10 + Math.sin(a) * 3, 2); } d.fillStyle(0xFFCC00, 1); d.fillCircle(0, -10, 2); }
    else if (t === 6) { d.fillStyle(0x3D5A20, 0.4); d.fillEllipse(3, 5, 18, 8); d.fillStyle(0x4A7A2A, 0.9); d.fillCircle(0, -5, 8); d.fillCircle(-5, -3, 6); d.fillCircle(5, -3, 6); d.fillStyle(0x6DB844, 0.5); d.fillCircle(-2, -7, 4); }
    else if (t === 7) { d.fillStyle(0x3D5A20, 0.4); d.fillEllipse(2, 3, 14, 6); d.fillStyle(0x6B8E4A, 0.8); d.fillEllipse(0, 0, 12, 8); d.fillStyle(0x7EA85A, 0.5); d.fillEllipse(-2, -2, 6, 4); }
    else if (t === 8) { d.fillStyle(0x3D5A20, 0.3); d.fillEllipse(2, 3, 8, 4); d.lineStyle(1, 0x4A7A2A, 0.8); d.lineBetween(0, 0, 1, -10); d.fillStyle(0x4488DD, 0.9); d.fillTriangle(-3, -10, 3, -10, 0, -15); d.fillTriangle(-2, -10, 2, -10, 0, -7); }
    else { d.fillStyle(0x3D5A20, 0.3); d.fillEllipse(2, 3, 8, 4); d.lineStyle(1, 0x4A7A2A, 0.8); d.lineBetween(0, 0, 0, -8); d.fillStyle(0xFF69B4, 0.9); d.fillCircle(-2, -10, 3); d.fillCircle(2, -10, 3); d.fillCircle(0, -12, 3); d.fillCircle(0, -8, 3); d.fillStyle(0xFFFF00, 1); d.fillCircle(0, -10, 1.5); }
    d.setPosition(pos.x, pos.y); bgDecorations.add(d);
}

function spawnObstacle() {
    if (gameState !== 'playing') return;
    if (!isMoving && bgDecorations.getChildren().length >= MAX_DECORATIONS) return;
    var pos = randomMapPos(500, 900);
    var g = this.add.graphics();
    g.fillStyle(0x3D5A20, 0.4); g.fillEllipse(5, 10, 50, 20);
    if (Phaser.Math.Between(0, 1) === 0) {
        g.fillStyle(0x654321, 1); g.fillRect(-6, 0, 12, 30);
        g.fillStyle(0x228B22, 1); g.fillCircle(0, -15, 20); g.fillCircle(-12, -10, 15); g.fillCircle(12, -10, 15); g.fillCircle(0, -25, 18);
        g.fillStyle(0x32CD32, 0.5); g.fillCircle(-5, -20, 8); g.fillCircle(8, -12, 6);
    } else {
        g.fillStyle(0x4A7A2A, 1); g.fillCircle(0, 0, 25); g.fillCircle(-15, 5, 18); g.fillCircle(15, 5, 18); g.fillCircle(0, -10, 20);
        g.fillStyle(0x6DB844, 0.5); g.fillCircle(-5, -8, 10); g.fillCircle(8, 2, 8);
    }
    g.setPosition(pos.x, pos.y); bgDecorations.add(g);
}

function createLightningEffect() {
    var self = this;
    var count = Math.min(cows.length, 20);
    for (var index = 0; index < count; index++) {
        var cow = cows[index];
        if (!cow || !cow.active) return;
        var l = self.add.graphics(); l.lineStyle(3, 0x00FFFF, 1);
        var x = cow.x, y = cow.y; l.beginPath(); l.moveTo(x, y);
        for (var i = 1; i <= 8; i++) l.lineTo(x + (Math.random() - 0.5) * 40, y - i * 30);
        l.strokePath();
        var gl = self.add.circle(cow.x, cow.y, 20, 0x00FFFF, 0.8);
        self.tweens.add({ targets: [l, gl], alpha: 0, duration: 400, onComplete: function() { l.destroy(); gl.destroy(); } });
    }
    if (cows.length > 0) {
        var ax = 0, ay = 0;
        var cnt = Math.min(cows.length, 20);
        for (var j = 0; j < cnt; j++) { ax += cows[j].x; ay += cows[j].y; }
        ax /= cnt; ay /= cnt;
        var bf = self.add.circle(ax, ay - 100, 50, 0x00FFFF, 0.6);
        self.tweens.add({ targets: bf, scale: 3, alpha: 0, duration: 600, onComplete: function() { bf.destroy(); } });
        self.cameras.main.shake(300, 0.015);
    }
}

function spawnGoldenCow() {
    if (gameState !== 'playing') return;
    var pos = randomMapPos(400, 700);
    var gl = this.add.circle(0, 0, 25, 0xFFFF00, 0.3); gl.setStrokeStyle(2, 0xFFD700, 0.8);
    var c = this.add.container(pos.x, pos.y, [gl,
        this.add.rectangle(0, 0, 15, 20, 0xFFD700), this.add.circle(-4, -2, 3, 0xFFA500), this.add.circle(3, 4, 2.5, 0xFFA500),
        this.add.rectangle(0, -12, 8, 9, 0xFFD700),
        this.add.triangle(-3, -16, 0, 0, -2, -4, 2, -4, 0xFFFF00), this.add.triangle(3, -16, 0, 0, -2, -4, 2, -4, 0xFFFF00),
        this.add.circle(-2, -13, 1, 0x000000), this.add.circle(2, -13, 1, 0x000000)
    ]);
    c.isGolden = true; c.fleeSpeed = 2.5; goldenCows.add(c);
    this.tweens.add({ targets: gl, scale: 1.3, alpha: 0.1, duration: 500, yoyo: true, repeat: -1 });
    this.time.delayedCall(30000, function() { if (c && c.active) c.destroy(); });
}

function collectGoldenCow(h, cow) {
    if (!cow || !cow.active) return;
    cow.destroy(); 
    goldenCowsCollected++; 
    totalGoldenCowsEver++;
    localStorage.setItem('totalGoldenCowsEver', totalGoldenCowsEver); 
    score += 50;
    this.goldenCowText.setText('Золотые: ' + goldenCowsCollected + '/3');
    if (goldenCowsCollected >= 3 && !achievements.goldenFever) { achievements.goldenFever = true; showAchievement.call(this, 'ЗОЛОТАЯ ЛИХОРАДКА!'); }
    if (goldenCowsCollected >= 3) {
        goldenCowsCollected = 0; 
        this.goldenCowText.setText('Золотые: 0/3');
        horseHP = Math.min(horseHP + 1, 5); 
        updateHPDisplay.call(this);
        var t = this.add.text(600, 300, '+1 ЖИЗНЬ!', { fontSize: '48px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0);
        this.tweens.add({ targets: t, y: 200, alpha: 0, scale: 1.5, duration: 2000, onComplete: function() { t.destroy(); } });
    }
    for (var i = 0; i < 5; i++) cows.push(createCow.call(this, horse.x, horse.y + 50 + i * 10));
    var fl = this.add.circle(horse.x, horse.y, 20, 0xFFD700, 0.9);
    this.tweens.add({ targets: fl, alpha: 0, scale: 3, duration: 400, onComplete: function() { fl.destroy(); } });
}

function showAchievement(text) {
    var t = this.add.text(600, 250, text, { fontSize: '36px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: t, y: 150, alpha: 0, scale: 1.3, duration: 2500, onComplete: function() { t.destroy(); } });
}

function createSkillButtons() {
    skillButtons = [];
    var skills = [{ id: 'dualWield', icon: '🔫🔫', cost: 3, y: 730 }, { id: 'dogCompanion', icon: '🐕', cost: 6, y: 660 }, { id: 'dynamite', icon: '🧨', cost: 9, y: 590 }];
    var self = this;
    skills.forEach(function(s) {
        var btn = self.add.container(1050, s.y);
        var bg = self.add.rectangle(0, 0, 110, 60, 0x333333, 0.8); bg.setStrokeStyle(3, 0x666666);
        var txt = self.add.text(0, -10, s.icon, { fontSize: '16px', fill: '#666666' }).setOrigin(0.5);
        var cost = self.add.text(0, 15, s.cost + ' коров', { fontSize: '13px', fill: '#666666' }).setOrigin(0.5);
        btn.add([bg, txt, cost]); btn.setScrollFactor(0);
        btn.skillId = s.id; btn.cost = s.cost; btn.isActive = false;
        btn.btnX = 1050; btn.btnY = s.y; btn.btnW = 110; btn.btnH = 60;
        skillButtons.push(btn); gameUI.add(btn);
    });
}

function checkSkillButtonClick(pointer) {
    for (var i = 0; i < skillButtons.length; i++) {
        var btn = skillButtons[i];
        var hw = btn.btnW / 2, hh = btn.btnH / 2;
        if (pointer.x >= btn.btnX - hw && pointer.x <= btn.btnX + hw && pointer.y >= btn.btnY - hh && pointer.y <= btn.btnY + hh) {
            if (cows.length >= btn.cost) {
                activateSkill.call(this, btn.skillId, btn.cost);
                updateSkillButtons.call(this);
                return;
            }
        }
    }
}

function updateSkillButtons() {
    for (var i = 0; i < skillButtons.length; i++) {
        var btn = skillButtons[i];
        var ok = cows.length >= btn.cost;
        btn.isActive = ok;
        var c = ok ? '#00ff00' : '#666666';
        var b = ok ? 0x00ff00 : 0x666666;
        btn.list[0].setStrokeStyle(3, b); btn.list[1].setColor(c); btn.list[2].setColor(c);
    }
}

function activateSkill(skillId, cost) {
    removeCowsFromHerd.call(this, cost);
    createLightningEffect.call(this);
    if (skillId === 'dualWield') { 
        activeSkills.dualWield = true; 
        this.time.delayedCall(20000, function() { activeSkills.dualWield = false; }); 
        showSkillText.call(this, '🔫🔫 ДВА СТВОЛА 20с!'); 
    }
    else if (skillId === 'dogCompanion') { 
        spawnDogCompanion.call(this, 10000); 
        showSkillText.call(this, '🐕 СОБАКА-ОХОТНИК!'); 
    }
    else if (skillId === 'dynamite') { 
        startDynamiteSkill.call(this); 
        showSkillText.call(this, '🧨 ДИНАМИТ 10с!'); 
    }
}

function removeCowsFromHerd(count) {
    var removed = 0;
    while (removed < count && cows.length > 0) {
        var cow = cows.pop();
        if (cow) {
            var sp = this.add.circle(cow.x, cow.y, 10, 0x00FFFF, 0.8);
            this.tweens.add({ targets: [cow, sp], alpha: 0, scale: 1.5, duration: 300, onComplete: function() { cow.destroy(); sp.destroy(); } });
        }
        removed++;
    }
}

function showSkillText(text) {
    var t = this.add.text(600, 300, text, { fontSize: '48px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: t, y: 200, alpha: 0, scale: 1.5, duration: 2000, onComplete: function() { t.destroy(); } });
}

function spawnDogCompanion(duration) {
    if (dogCompanion) dogCompanion.destroy();
    var dog = this.add.container(horse.x + 450, horse.y, [
        this.add.ellipse(0, 0, 16, 22, 0x8B4513), this.add.ellipse(0, -12, 12, 14, 0xA0522D),
        this.add.triangle(-4, -18, 0, 0, -3, -6, 3, -6, 0x6B3410), this.add.triangle(4, -18, 0, 0, -3, -6, 3, -6, 0x6B3410),
        this.add.circle(-2, -14, 1.5, 0x000000), this.add.circle(2, -14, 1.5, 0x000000), this.add.rectangle(0, 12, 4, 10, 0x6B3410)
    ]);
    var aura = this.add.circle(0, 0, 25, 0xFFD700, 0.3); aura.setStrokeStyle(2, 0xFFD700, 0.8); dog.add(aura);
    dogCompanion = dog; dogCompanion.attackTimer = 0;
    this.time.delayedCall(duration, function() { if (dogCompanion) { dogCompanion.destroy(); dogCompanion = null; } });
}

function startDynamiteSkill() {
    activeSkills.dynamite = true;
    var self = this;
    var dynamitesThrown = 0;
    var throwInterval = this.time.addEvent({
        delay: 1000,
        callback: function() {
            if (dynamitesThrown >= 10 || !activeSkills.dynamite) {
                throwInterval.destroy();
                activeSkills.dynamite = false;
                return;
            }
            spawnDynamite.call(self);
            dynamitesThrown++;
        },
        callbackScope: this,
        loop: true
    });
}

function spawnDynamite() {
    var horseAngleRad = Phaser.Math.DegToRad(cowboy.angle);
    var rearAngle = horseAngleRad + Math.PI;
    var spread = (Math.random() - 0.5) * (60 * Math.PI / 180);
    var throwAngle = rearAngle + spread;
    var distance = Phaser.Math.Between(60, 150);
    
    var targetX = horse.x + Math.cos(throwAngle) * distance;
    var targetY = horse.y + Math.sin(throwAngle) * distance;
    
    var dynamite = this.add.graphics();
    dynamite.fillStyle(0xCC0000, 1);
    dynamite.fillRect(-6, -12, 12, 24);
    dynamite.fillStyle(0xFFAA00, 1);
    dynamite.fillRect(-4, -14, 8, 4);
    dynamite.lineStyle(2, 0xFF6600, 1);
    dynamite.lineBetween(0, -14, 0, -20);
    dynamite.fillStyle(0xFFFF00, 1);
    dynamite.fillCircle(0, -20, 3);
    dynamite.setPosition(horse.x, horse.y);
    
    this.tweens.add({
        targets: dynamite,
        x: targetX,
        y: targetY,
        duration: 300,
        onComplete: () => {
            explodeDynamite.call(this, targetX, targetY);
            dynamite.destroy();
        }
    });
}

function explodeDynamite(x, y) {
    var explosion = this.add.circle(x, y, 50, 0xFF6600, 0.8);
    this.tweens.add({ targets: explosion, radius: 500, alpha: 0, duration: 600, onComplete: function() { explosion.destroy(); } });
    
    for (var i = 0; i < 5; i++) {
        var smokeX = x + Phaser.Math.Between(-50, 50);
        var smokeY = y + Phaser.Math.Between(-50, 50);
        var smoke = this.add.circle(smokeX, smokeY, Phaser.Math.Between(20, 40), 0x666666, 0.6);
        this.tweens.add({
            targets: smoke,
            alpha: 0,
            scale: 1.5,
            y: smokeY - 50,
            duration: 800,
            onComplete: function() { smoke.destroy(); }
        });
    }
    
    this.cameras.main.shake(300, 0.03);
    
    var self = this;
    enemies.children.iterate(function(e) {
        if (e && e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) < 400) {
            if (e.isBoss) { 
                e.hp -= 50; 
                if (e.hp <= 0) killBoss.call(self, e); 
            } else { 
                var ex = e.x, ey = e.y, ang = e.angle; 
                e.destroy(); 
                score += 10; 
                wolvesKilled++; 
                createWolfSkeleton.call(self, ex, ey, false, ang); 
                createBloodStain.call(self, ex, ey); 
            }
        }
    });
}

function triggerExplosion() {
    var self = this;
    enemies.children.iterate(function(e) {
        if (e && e.active && Phaser.Math.Distance.Between(horse.x, horse.y, e.x, e.y) < 500) {
            if (e.isBoss) { 
                e.hp -= 20; 
                if (e.hp <= 0) killBoss.call(self, e); 
            } else { 
                var ex = e.x, ey = e.y, ang = e.angle; 
                e.destroy(); 
                score += 10; 
                wolvesKilled++; 
                createWolfSkeleton.call(self, ex, ey, false, ang); 
                createBloodStain.call(self, ex, ey); 
            }
        }
    });
    for (var i = bulls.length - 1; i >= 0; i--) {
        if (bulls[i] && bulls[i].active && Phaser.Math.Distance.Between(horse.x, horse.y, bulls[i].x, bulls[i].y) < 500) {
            bulls[i].hp -= 3; 
            bulls[i].angry = true;
            if (bulls[i].hp <= 0) killBull.call(this, bulls[i]);
        }
    }
    var exp = this.add.circle(horse.x, horse.y, 50, 0xFF6600, 0.8);
    this.tweens.add({ targets: exp, radius: 500, alpha: 0, duration: 600, onComplete: function() { exp.destroy(); } });
    if (gameState === 'playing') this.cameras.main.shake(300, 0.03);
}

function createWolfSkeleton(x, y, isBoss, angle) {
    var sks = wolfSkeletons.getChildren();
    while (sks.length >= MAX_SKELETONS) { 
        var old = sks.shift(); 
        if (old && old.active) old.destroy(); 
    }
    var sk = this.add.graphics();
    if (isBoss) {
        sk.lineStyle(3, 0xDDDDDD, 0.8); sk.strokeCircle(0, -50, 18);
        sk.strokeCircle(-8, -55, 6); sk.strokeCircle(8, -55, 6); sk.strokeCircle(0, -45, 4);
        sk.lineBetween(0, -32, 0, 30);
        for (var i = 0; i < 5; i++) sk.strokeEllipse(-12, -20 + i * 10, 24, 8);
        sk.strokeEllipse(0, 35, 20, 12);
        sk.lineBetween(-10, 40, -15, 70); sk.lineBetween(10, 40, 15, 70);
    } else {
        sk.lineStyle(2, 0xDDDDDD, 0.8); sk.strokeCircle(0, -18, 8);
        sk.strokeCircle(-3, -20, 2.5); sk.strokeCircle(3, -20, 2.5); sk.strokeCircle(0, -15, 1.5);
        sk.lineBetween(0, -10, 0, 12);
        for (var i = 0; i < 3; i++) sk.strokeEllipse(-6, -5 + i * 5, 12, 4);
        sk.strokeEllipse(0, 15, 10, 6);
        sk.lineBetween(-5, 18, -7, 32); sk.lineBetween(5, 18, 7, 32);
    }
    sk.angle = angle || 0;
    var c = this.add.container(x, y, [sk]); 
    c.alpha = 0.6; 
    wolfSkeletons.add(c);
    this.tweens.add({ targets: c, alpha: 0, duration: isBoss ? 10000 : 5000, onComplete: function() { c.destroy(); } });
}

function killBoss(boss) {
    if (!boss || !boss.active) return;
    var bx = boss.x, by = boss.y, ang = boss.angle;
    boss.destroy(); 
    bossActive = false; 
    score += 500;
    createWolfSkeleton.call(this, bx, by, true, ang);
    createBloodStain.call(this, bx, by);
    if (!achievements.godOfWar) { achievements.godOfWar = true; showAchievement.call(this, 'GOD OF WAR!'); }
    removeBossDarkness.call(this);
    var fl = this.add.circle(bx, by, 30, 0xff0000, 0.9);
    this.tweens.add({ targets: fl, alpha: 0, scale: 8, duration: 800, onComplete: function() { fl.destroy(); } });
    var wt = this.add.text(bx, by - 50, '+500 БОСС ПОВЕРЖЕН!', { fontSize: '32px', fill: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: wt, y: by - 150, alpha: 0, duration: 1500, onComplete: function() { wt.destroy(); } });
}

function createBossDarkness() {
    removeBossDarkness.call(this);
    bossDarkOverlay = this.add.rectangle(0, 0, MAP_SIZE, MAP_SIZE, 0x110000, 0);
    bossDarkOverlay.setScrollFactor(1); bossDarkOverlay.setDepth(999);
    this.tweens.add({ targets: bossDarkOverlay, alpha: 0.35, duration: 2000, ease: 'Sine.easeIn' });
}

function removeBossDarkness() {
    if (bossDarkOverlay && bossDarkOverlay.active) {
        var ov = bossDarkOverlay; 
        bossDarkOverlay = null;
        this.tweens.add({ targets: ov, alpha: 0, duration: 1500, ease: 'Sine.easeOut', onComplete: function() { if (ov && ov.active) ov.destroy(); } });
    }
}

function updateBossHPBar() {
    this.bossHPBar.clear(); 
    this.bossHPText.setText('');
    if (!bossActive) return;
    var boss = null;
    enemies.children.iterate(function(e) { if (e && e.isBoss) boss = e; });
    if (!boss) return;
    var bw = 400, bh = 25, bx = 600 - bw / 2, by = 30;
    this.bossHPBar.fillStyle(0x333333, 0.8); this.bossHPBar.fillRect(bx, by, bw, bh);
    this.bossHPBar.fillStyle(0xFF0000, 1); this.bossHPBar.fillRect(bx, by, bw * Math.max(0, boss.hp / 200), bh);
    this.bossHPBar.lineStyle(3, 0xFFFFFF, 1); this.bossHPBar.strokeRect(bx, by, bw, bh);
    this.bossHPText.setText('БОСС: ' + Math.max(0, Math.ceil(boss.hp)) + ' / 200');
}

function update() {
    if (gameState !== 'playing') return;
    
    if (crosshair) {
        crosshair.x = mouseX;
        crosshair.y = mouseY;
    }
    
    // Прогрессия сложности
    if (gameTime - lastDifficultyIncrease >= 60) { 
        lastDifficultyIncrease = gameTime; 
        wolfSpawnRate = Math.max(100, wolfSpawnRate - 100); 
        powerUpSpawnRate = Math.max(5000, powerUpSpawnRate - 2000); 
    }
    
    // Динамический спавн врагов с учетом актуального wolfSpawnRate
    if (this.time.now - lastEnemySpawnTime >= wolfSpawnRate) {
        lastEnemySpawnTime = this.time.now;
        spawnEnemy.call(this);
    }
    
    if (!bossActive && gameTime - lastBossSpawn >= 60) { 
        lastBossSpawn = gameTime; 
        spawnBoss.call(this); 
    }
    
    var mx = 0, my = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) mx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) mx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) my -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) my += 1;
    if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707; }
    
    isMoving = (mx !== 0 || my !== 0);
    if (isMoving) lastMoveTime = gameTime;
    horse.body.setVelocityX(mx * baseHorseSpeed); horse.body.setVelocityY(my * baseHorseSpeed);
    
    if (isMoving) {
        var ta = Phaser.Math.RadToDeg(Math.atan2(my, mx)) + 90;
        var df = ta - horse.angle; 
        while (df > 180) df -= 360; 
        while (df < -180) df += 360;
        horse.angle += df * 0.15;
        if (gameTime - lastDustTime > 0.1) { 
            spawnDustParticle.call(this); 
            lastDustTime = gameTime; 
        }
    }
    updateDustParticles.call(this);
    updateTumbleweeds.call(this);
    
    var wmx = mouseX + this.cameras.main.scrollX, wmy = mouseY + this.cameras.main.scrollY;
    var ta2 = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(horse.x, horse.y, wmx, wmy)) + 90;
    var df2 = ta2 - cowboy.angle; 
    while (df2 > 180) df2 -= 360; 
    while (df2 < -180) df2 += 360;
    cowboy.angle += df2 * 0.3;
    
    gameTime += 1 / 60;
    var mins = Math.floor(gameTime / 60), secs = Math.floor(gameTime % 60);
    this.timeText.setText('Время: ' + mins + ':' + (secs < 10 ? '0' : '') + secs);
    
    if (gameTime >= 600 && !achievements.survivor) { 
        achievements.survivor = true; 
        showAchievement.call(this, 'ВЫЖИВШИЙ!'); 
    }
    
    if (gameTime - lastPowerUpSpawn >= powerUpSpawnRate / 1000) { 
        lastPowerUpSpawn = gameTime; 
        spawnPowerUp.call(this); 
    }
    
    cleanupWorld.call(this);
    deadCows = deadCows.filter(function(dc) { 
        if (dc.alpha <= 0 || !dc.active) { 
            if (dc.active) dc.destroy(); 
            return false; 
        } 
        dc.alpha -= 0.003; 
        return true; 
    });
    updateBloodStains.call(this); 
    updateBossHPBar.call(this);
    
    var self = this;
    goldenCows.children.iterate(function(cow) {
        if (cow && cow.active) { 
            clampToMap(cow); 
            var dx = cow.x - horse.x, dy = cow.y - horse.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300 && dist > 0) { 
                cow.x += (dx / dist) * cow.fleeSpeed; 
                cow.y += (dy / dist) * cow.fleeSpeed; 
                var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90; 
                var d = ta - cow.angle; 
                while (d > 180) d -= 360; 
                while (d < -180) d += 360; 
                cow.angle += d * 0.15; 
            } 
        }
    });
    
    if (dogCompanion && dogCompanion.active) {
        dogCompanion.attackTimer += 1 / 60;
        var closest = null, minD = 450;
        enemies.children.iterate(function(e) { 
            if (e && e.active) { 
                var d = Phaser.Math.Distance.Between(dogCompanion.x, dogCompanion.y, e.x, e.y); 
                if (d < minD) { minD = d; closest = e; } 
            } 
        });
        if (closest) {
            var dx = closest.x - dogCompanion.x, dy = closest.y - dogCompanion.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 30) { 
                dogCompanion.x += (dx / dist) * 5; 
                dogCompanion.y += (dy / dist) * 5; 
            }
            var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90; 
            var d2 = ta - dogCompanion.angle; 
            while (d2 > 180) d2 -= 360; 
            while (d2 < -180) d2 += 360; 
            dogCompanion.angle += d2 * 0.25;
            
            if (dist < 40 && dogCompanion.attackTimer >= 0.6) {
                dogCompanion.attackTimer = 0;
                if (closest.isBoss) { 
                    closest.hp -= 50; 
                    if (closest.hp <= 0) killBoss.call(self, closest); 
                } else { 
                    var ang = closest.angle; 
                    closest.destroy(); 
                    score += 10; 
                    createWolfSkeleton.call(self, closest.x, closest.y, false, ang); 
                    createBloodStain.call(self, closest.x, closest.y); 
                }
            }
        } else {
            var a = gameTime * 3, tx = horse.x + Math.cos(a) * 450, ty = horse.y + Math.sin(a) * 450;
            var dx = tx - dogCompanion.x, dy = ty - dogCompanion.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) { 
                dogCompanion.x += (dx / dist) * 3; 
                dogCompanion.y += (dy / dist) * 3; 
            }
            var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90; 
            var d2 = ta - dogCompanion.angle; 
            while (d2 > 180) d2 -= 360; 
            while (d2 < -180) d2 += 360; 
            dogCompanion.angle += d2 * 0.2;
        }
    }
    
    for (var bi = bulls.length - 1; bi >= 0; bi--) {
        var bull = bulls[bi];
        if (!bull || !bull.active) { bulls.splice(bi, 1); continue; }
        clampToMap(bull); 
        bull.attackTimer += 1 / 60;
        if (bull.angry) {
            var tx = horse.x, ty = horse.y, md = Phaser.Math.Distance.Between(bull.x, bull.y, horse.x, horse.y), tt = 'horse';
            enemies.children.iterate(function(e) { 
                if (e && e.active) { 
                    var d = Phaser.Math.Distance.Between(bull.x, bull.y, e.x, e.y); 
                    if (d < md) { md = d; tx = e.x; ty = e.y; tt = e.isBoss ? 'boss' : 'wolf'; } 
                } 
            });
            var dx = tx - bull.x, dy = ty - bull.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) { 
                bull.x += (dx / dist) * 2.2; 
                bull.y += (dy / dist) * 2.2; 
                var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90; 
                var d = ta - bull.angle; 
                while (d > 180) d -= 360; 
                while (d < -180) d += 360; 
                bull.angle += d * 0.2; 
            }
            if (tt === 'boss' && dist < 40 && bull.attackTimer > 0.5) {
                bull.attackTimer = 0;
                enemies.children.iterate(function(e) {
                    if (e && e.isBoss && e.active && Phaser.Math.Distance.Between(bull.x, bull.y, e.x, e.y) < 40) {
                        e.hp -= 50; 
                        killBull.call(self, bull); 
                        if (e.hp <= 0) killBoss.call(self, e);
                    }
                });
            } else if (tt === 'horse' && Phaser.Math.Distance.Between(bull.x, bull.y, horse.x, horse.y) < 35 && bull.attackTimer > 0.8) {
                bull.attackTimer = 0; 
                loseHP.call(self); 
                if (gameState === 'playing') self.cameras.main.shake(200, 0.03);
            } else if (tt === 'wolf') {
                enemies.children.iterate(function(e) { 
                    if (e && !e.isBoss && e.active && Phaser.Math.Distance.Between(bull.x, bull.y, e.x, e.y) < 35) { 
                        e.destroy(); 
                        createBloodStain.call(self, e.x, e.y); 
                        createWolfSkeleton.call(self, e.x, e.y, false, 0); 
                        score += 5; 
                    } 
                });
            }
        } else {
            if (!bull.wanderTarget || Phaser.Math.Distance.Between(bull.x, bull.y, bull.wanderTarget.x, bull.wanderTarget.y) < 20) {
                var a = Math.random() * Math.PI * 2, dd = Phaser.Math.Between(100, 300);
                bull.wanderTarget = { 
                    x: Phaser.Math.Clamp(bull.x + Math.cos(a) * dd, -MAP_LIMIT, MAP_LIMIT), 
                    y: Phaser.Math.Clamp(bull.y + Math.sin(a) * dd, -MAP_LIMIT, MAP_LIMIT) 
                };
            }
            var dx = bull.wanderTarget.x - bull.x, dy = bull.wanderTarget.y - bull.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) { 
                bull.x += (dx / dist) * 0.5; 
                bull.y += (dy / dist) * 0.5; 
                var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90; 
                var d = ta - bull.angle; 
                while (d > 180) d -= 360; 
                while (d < -180) d += 360; 
                bull.angle += d * 0.1; 
            }
        }
    }
    
    cowsToCollect.children.iterate(function(cow) {
        if (cow && cow.active) { 
            clampToMap(cow);
            var bNear = false, bx = 0, by = 0;
            enemies.children.iterate(function(e) { 
                if (e && e.isBoss && e.active && Phaser.Math.Distance.Between(cow.x, cow.y, e.x, e.y) < 300) { 
                    bNear = true; bx = cow.x - e.x; by = cow.y - e.y; 
                } 
            });
            var buNear = false, bux = 0, buy = 0;
            bulls.forEach(function(bull) { 
                if (bull && bull.active && bull.angry && Phaser.Math.Distance.Between(cow.x, cow.y, bull.x, bull.y) < 250) { 
                    buNear = true; bux = cow.x - bull.x; buy = cow.y - bull.y; 
                } 
            });
            if (bNear) { 
                var dist = Math.sqrt(bx * bx + by * by); 
                if (dist > 0) { cow.x += (bx / dist) * 1.0; cow.y += (by / dist) * 1.0; } 
                var ta = Phaser.Math.RadToDeg(Math.atan2(by, bx)) + 90; 
                var d = ta - cow.angle; 
                while (d > 180) d -= 360; 
                while (d < -180) d += 360; 
                cow.angle += d * 0.15; 
            } else if (buNear) { 
                var dist = Math.sqrt(bux * bux + buy * buy); 
                if (dist > 0) { cow.x += (bux / dist) * 1.2; cow.y += (buy / dist) * 1.2; } 
                var ta = Phaser.Math.RadToDeg(Math.atan2(buy, bux)) + 90; 
                var d = ta - cow.angle; 
                while (d > 180) d -= 360; 
                while (d < -180) d += 360; 
                cow.angle += d * 0.15; 
            } else { 
                var dx = horse.x - cow.x, dy = horse.y - cow.y, dist = Math.sqrt(dx * dx + dy * dy); 
                if (dist > 5 && dist < 800) { cow.x += (dx / dist) * 1.0; cow.y += (dy / dist) * 1.0; } 
                var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90; 
                var d = ta - cow.angle; 
                while (d > 180) d -= 360; 
                while (d < -180) d += 360; 
                cow.angle += d * 0.1; 
            }
        }
    });
    
    for (var ci = 0; ci < cows.length; ci++) {
        var cow = cows[ci];
        if (!cow || !cow.active) continue;
        var target = ci === 0 ? horse : cows[ci - 1];
        var td = ci === 0 ? 50 : 40;
        var dx = target.x - cow.x, dy = target.y - cow.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > td) { cow.x += (dx / dist) * 4; cow.y += (dy / dist) * 4; }
        clampToMap(cow);
        var ta = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90, d = ta - cow.angle; 
        while (d > 180) d -= 360; 
        while (d < -180) d += 360; 
        cow.angle += d * 0.1;
    }
    
    if (enemies.getChildren().length > MAX_ENEMIES) {
        var ch = enemies.getChildren(); 
        for (var ei = 0; ei < ch.length && enemies.getChildren().length > MAX_ENEMIES; ei++) { 
            if (ch[ei] && !ch[ei].isBoss && ch[ei].active) ch[ei].destroy(); 
        }
    }
    
    enemies.children.iterate(function(enemy) {
        if (enemy && enemy.active) { 
            clampToMap(enemy);
            var tx, ty;
            if (enemy.isBoss) { tx = horse.x; ty = horse.y; }
            else { 
                tx = horse.x; ty = horse.y; 
                var md = Phaser.Math.Distance.Between(horse.x, horse.y, enemy.x, enemy.y);
                for (var ci = 0; ci < cows.length; ci++) { 
                    if (cows[ci] && cows[ci].active) {
                        var d = Phaser.Math.Distance.Between(cows[ci].x, cows[ci].y, enemy.x, enemy.y); 
                        if (d < md) { md = d; tx = cows[ci].x; ty = cows[ci].y; } 
                    }
                }
                cowsToCollect.children.iterate(function(c) { 
                    if (c && c.active) { 
                        var d = Phaser.Math.Distance.Between(c.x, c.y, enemy.x, enemy.y); 
                        if (d < md) { md = d; tx = c.x; ty = c.y; } 
                    } 
                }); 
            }
            var dx = tx - enemy.x, dy = ty - enemy.y, dist = Math.sqrt(dx * dx + dy * dy), speed = enemy.isBoss ? 2.8 : 1.8;
            if (enemy.isBoss) {
                if (dist > 1200) { 
                    var ta = Math.atan2(dy, dx); 
                    enemy.x = horse.x + Math.cos(ta) * 800; 
                    enemy.y = horse.y + Math.sin(ta) * 800; 
                } else if (dist > 5) { 
                    enemy.x += (dx / dist) * speed; 
                    enemy.y += (dy / dist) * speed; 
                }
                for (var ci = 0; ci < cows.length; ci++) {
                    if (cows[ci] && cows[ci].active && Phaser.Math.Distance.Between(enemy.x, enemy.y, cows[ci].x, cows[ci].y) < 40) {
                        var ec = cows[ci]; 
                        cows.splice(ci, 1); 
                        ec.destroy(); 
                        enemy.hp = Math.min(enemy.hp + 25, 200); 
                        return;
                    }
                }
                var ate = false;
                cowsToCollect.children.iterate(function(c) { 
                    if (c && c.active && !ate && Phaser.Math.Distance.Between(enemy.x, enemy.y, c.x, c.y) < 40) { 
                        c.destroy(); 
                        enemy.hp = Math.min(enemy.hp + 25, 200); 
                        ate = true; 
                    } 
                });
                if (ate) return;
            } else {
                if (dist > 5 && dist < 800) { 
                    enemy.x += (dx / dist) * speed; 
                    enemy.y += (dy / dist) * speed; 
                }
                for (var ci = 0; ci < cows.length; ci++) { 
                    if (cows[ci] && cows[ci].active && Phaser.Math.Distance.Between(enemy.x, enemy.y, cows[ci].x, cows[ci].y) < 15) { 
                        killCowByWolf.call(self, cows[ci], enemy); 
                        return; 
                    } 
                }
                var atk = false;
                cowsToCollect.children.iterate(function(c) { 
                    if (c && c.active && !atk && Phaser.Math.Distance.Between(enemy.x, enemy.y, c.x, c.y) < 15) { 
                        deadCows.push(createDeadCow.call(self, c.x, c.y, c.angle)); 
                        c.destroy(); 
                        enemy.destroy(); 
                        atk = true; 
                    } 
                });
            }
            var ta2 = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90, d = ta2 - enemy.angle; 
            while (d > 180) d -= 360; 
            while (d < -180) d += 360; 
            enemy.angle += d * 0.15;
        }
    });
    
    if (activePowerUp) { 
        powerUpTimer -= 1 / 60; 
        if (powerUpTimer <= 0) deactivatePowerUp.call(this); 
        else powerUpText.setText(activePowerUp.name + ': ' + Math.ceil(powerUpTimer) + 'с'); 
    }
    
    var fireRate = baseFireRate;
    if (activeSkills.rapidFire) fireRate /= 2;
    if (activePowerUp) { 
        if (activePowerUp.type === 'machinegun') fireRate = 75; 
        else if (activePowerUp.type === 'minigun') fireRate = 17; 
    }
    
    if (this.time.now > nextFireTime) { 
        shoot.call(this); 
        nextFireTime = this.time.now + fireRate; 
    }
    
    bullets.children.iterate(function(b) {
        if (!b || !b.active) return;
        if (Phaser.Math.Distance.Between(b.x, b.y, horse.x, horse.y) > 1000) { 
            b.destroy(); 
            return; 
        }
        for (var i = 0; i < bulls.length; i++) { 
            if (bulls[i] && bulls[i].active && Phaser.Math.Distance.Between(b.x, b.y, bulls[i].x, bulls[i].y) < 25) { 
                b.destroy(); 
                hitBull.call(self, bulls[i]); 
                return; 
            } 
        }
    });
    
    this.cowCountText.setText('Коровы: ' + cows.length);
    this.scoreText.setText('Счёт: ' + score);
    updateSkillButtons.call(this);
}

function cleanupWorld() {
    var cx = horse.x, cy = horse.y;
    bgDecorations.children.iterate(function(d) { 
        if (d && d.active && Phaser.Math.Distance.Between(d.x, d.y, cx, cy) > 1200) d.destroy(); 
    });
    wolfSkeletons.children.iterate(function(s) { 
        if (s && s.active && Phaser.Math.Distance.Between(s.x, s.y, cx, cy) > 1200) s.destroy(); 
    });
    cowsToCollect.children.iterate(function(c) { 
        if (c && c.active && Phaser.Math.Distance.Between(c.x, c.y, cx, cy) > 1200) c.destroy(); 
    });
    goldenCows.children.iterate(function(c) { 
        if (c && c.active && Phaser.Math.Distance.Between(c.x, c.y, cx, cy) > 1200) c.destroy(); 
    });
    powerUps.children.iterate(function(p) { 
        if (p && p.active && Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > 1200) p.destroy(); 
    });
    deadCows = deadCows.filter(function(dc) { 
        if (Phaser.Math.Distance.Between(dc.x, dc.y, cx, cy) > 1200) { 
            if (dc.active) dc.destroy(); 
            return false; 
        } 
        return true; 
    });
    eatingWolves = eatingWolves.filter(function(w) { 
        if (Phaser.Math.Distance.Between(w.x, w.y, cx, cy) > 1200) { 
            if (w.active) w.destroy(); 
            return false; 
        } 
        return true; 
    });
}

function spawnEnemy() {
    if (gameState !== 'playing') return;
    var pos = randomMapPos(400, 600);
    enemies.add(this.add.container(pos.x, pos.y, [
        this.add.ellipse(0, 0, 14, 20, 0x696969), this.add.ellipse(0, -12, 10, 12, 0x808080),
        this.add.triangle(-4, -18, 0, 0, -3, -6, 3, -6, 0x555555), this.add.triangle(4, -18, 0, 0, -3, -6, 3, -6, 0x555555),
        this.add.ellipse(0, -16, 6, 5, 0xA9A9A9), this.add.circle(-2, -14, 1, 0xFF0000), this.add.circle(2, -14, 1, 0xFF0000),
        this.add.rectangle(0, 12, 4, 10, 0x555555), this.add.rectangle(-4, 6, 3, 8, 0x555555), this.add.rectangle(4, 6, 3, 8, 0x555555),
        this.add.rectangle(-4, 10, 3, 8, 0x555555), this.add.rectangle(4, 10, 3, 8, 0x555555)
    ]));
}

function spawnCow() { 
    if (gameState !== 'playing') return; 
    var pos = randomMapPos(300, 500); 
    cowsToCollect.add(createCow.call(this, pos.x, pos.y)); 
}

function createCow(x, y) {
    return this.add.container(x, y, [
        this.add.rectangle(0, 0, 15, 20, 0xFFFFFF), this.add.circle(-4, -2, 3, 0x000000), this.add.circle(3, 4, 2.5, 0x000000), this.add.circle(-2, 6, 2, 0x000000),
        this.add.rectangle(0, -12, 8, 9, 0xFFFFFF), this.add.triangle(-3, -16, 0, 0, -2, -4, 2, -4, 0x888888), this.add.triangle(3, -16, 0, 0, -2, -4, 2, -4, 0x888888),
        this.add.circle(-2, -13, 1, 0x000000), this.add.circle(2, -13, 1, 0x000000)
    ]);
}

function spawnPowerUp() {
    if (gameState !== 'playing') return;
    var pos = randomMapPos(300, 600);
    var types = ['shotgun', 'machinegun', 'minigun', 'multishot'];
    var type = Phaser.Utils.Array.GetRandom(types);
    var names = { shotgun: 'Дробовик', machinegun: 'Автомат', minigun: 'Пулемёт', multishot: 'Пушка' };
    var box = this.add.rectangle(0, 0, 44, 44, 0x8B4513); box.setStrokeStyle(4, 0x654321);
    var lid = this.add.rectangle(0, -22, 48, 8, 0xA0522D);
    var q = this.add.text(0, 2, '?', { fontSize: '32px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    var pu = this.add.container(pos.x, pos.y, [box, lid, q]); 
    pu.type = type; 
    pu.name = names[type];
    powerUps.add(pu);
    this.tweens.add({ targets: pu, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
}

function collectPowerUp(h, pu) { 
    if (pu && pu.active) {
        pu.destroy(); 
        activatePowerUp.call(this, pu.type, pu.name); 
    }
}

function activatePowerUp(type, name) { 
    if (activePowerUp) deactivatePowerUp.call(this); 
    activePowerUp = { type: type, name: name }; 
    powerUpTimer = 20; 
    updateCowboyWeapon.call(this); 
}

function deactivatePowerUp() { 
    activePowerUp = null; 
    powerUpTimer = 0; 
    powerUpText.setText(''); 
    updateCowboyWeapon.call(this); 
}

function spawnBoss() {
    if (gameState !== 'playing' || bossActive) return;
    bossActive = true;
    if (gameState === 'playing') this.cameras.main.shake(500, 0.04);
    createBossDarkness.call(this);
    var bt = this.add.text(600, 400, 'БОСС-ВОЛК!', { fontSize: '72px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: bt, alpha: 0, scale: 2, duration: 3000, onComplete: function() { if (bt.active) bt.destroy(); } });
    var pos = randomMapPos(350, 450);
    var boss = this.add.container(pos.x, pos.y, [
        this.add.ellipse(0, 0, 42, 60, 0x440000), this.add.ellipse(0, -36, 30, 36, 0x550000),
        this.add.triangle(-12, -54, 0, 0, -9, -18, 9, -18, 0x330000), this.add.triangle(12, -54, 0, 0, -9, -18, 9, -18, 0x330000),
        this.add.ellipse(0, -48, 18, 15, 0x660000), this.add.circle(-6, -42, 3, 0xFF0000), this.add.circle(6, -42, 3, 0xFF0000),
        this.add.rectangle(0, 36, 12, 24, 0x330000), this.add.rectangle(-12, 18, 6, 18, 0x330000), this.add.rectangle(12, 18, 6, 18, 0x330000),
        this.add.rectangle(-12, 28, 6, 18, 0x330000), this.add.rectangle(12, 28, 6, 18, 0x330000)
    ]);
    boss.isBoss = true; 
    boss.hp = 200; 
    enemies.add(boss);
    var aura = this.add.circle(0, 0, 60, 0xff0000, 0.2); 
    aura.setStrokeStyle(3, 0xff0000, 0.6); 
    boss.add(aura);
    this.tweens.add({ targets: aura, scale: 1.3, alpha: 0.1, duration: 800, yoyo: true, repeat: -1 });
}

function shoot() {
    var ar = Phaser.Math.DegToRad(cowboy.angle);
    var bx = horse.x + Math.cos(ar - Math.PI / 2) * 14, by = horse.y + Math.sin(ar - Math.PI / 2) * 14;
    var wmx = mouseX + this.cameras.main.scrollX, wmy = mouseY + this.cameras.main.scrollY;
    var angle = Phaser.Math.Angle.Between(bx, by, wmx, wmy), bs = 600;
    var wt = activePowerUp ? activePowerUp.type : 'pistol';
    var colors = { pistol: 0x222222, shotgun: 0xFF0000, machinegun: 0x0000FF, minigun: 0x8B4513, multishot: 0xFF8800 };
    var c = colors[wt] || 0x222222;
    
    if (activeSkills.dualWield) {
        var spread = 10 * (Math.PI / 180);
        var offset = 15;
        
        var perpX = Math.cos(angle + Math.PI/2) * offset;
        var perpY = Math.sin(angle + Math.PI/2) * offset;
        
        var bx1 = bx + perpX, by1 = by + perpY;
        var bx2 = bx - perpX, by2 = by - perpY;

        if (wt === 'shotgun') {
            for (var i = -2; i <= 2; i++) {
                mkBullet.call(this, bx1, by1, angle - spread + i * 0.15, bs, c);
                mkBullet.call(this, bx2, by2, angle + spread + i * 0.15, bs, c);
            }
        } else if (wt === 'machinegun' || wt === 'minigun') {
            mkBullet.call(this, bx1, by1, angle - spread + (Math.random() - 0.5) * 0.4, bs, c);
            mkBullet.call(this, bx2, by2, angle + spread + (Math.random() - 0.5) * 0.4, bs, c);
        } else if (wt === 'multishot') {
            for (var i = 0; i < 8; i++) {
                mkBullet.call(this, bx1, by1, angle - spread + (Math.PI * 2 / 8) * i, bs, c);
                mkBullet.call(this, bx2, by2, angle + spread + (Math.PI * 2 / 8) * i, bs, c);
            }
        } else {
            mkBullet.call(this, bx1, by1, angle - spread, bs, c);
            mkBullet.call(this, bx2, by2, angle + spread, bs, c);
        }
    } else {
        if (wt === 'shotgun') { for (var i = -2; i <= 2; i++) mkBullet.call(this, bx, by, angle + i * 0.15, bs, c); }
        else if (wt === 'machinegun') { mkBullet.call(this, bx, by, angle, bs, c); }
        else if (wt === 'minigun') { mkBullet.call(this, bx, by, angle + (Math.random() - 0.5) * 0.6, bs, c); }
        else if (wt === 'multishot') { for (var i = 0; i < 8; i++) mkBullet.call(this, bx, by, (Math.PI * 2 / 8) * i, bs, c); }
        else { mkBullet.call(this, bx, by, angle, bs, c); }
    }
    var mf = this.add.circle(bx, by, 4, 0xFFDD00, 0.7);
    this.tweens.add({ targets: mf, alpha: 0, scale: 1.2, duration: 80, onComplete: function() { if (mf.active) mf.destroy(); } });
}

function mkBullet(x, y, a, s, color) {
    var b = this.add.circle(x, y, 4, color); 
    this.physics.add.existing(b); 
    bullets.add(b);
    b.body.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
}

function hitBulletEnemy(b, e) {
    if (!e || !e.active) return;
    var impactX = b.x, impactY = b.y;
    b.destroy();
    var flash = this.add.circle(impactX, impactY, 8, 0xFFFFFF, 0.7);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.5, duration: 200, onComplete: function() { if (flash.active) flash.destroy(); } });
    for (var i = 0; i < 4; i++) {
        var angle = (Math.PI * 2 / 4) * i;
        var dist = Phaser.Math.Between(5, 12);
        var particle = this.add.circle(impactX + Math.cos(angle) * dist, impactY + Math.sin(angle) * dist, Phaser.Math.Between(1, 3), 0xFFAA00, 0.8);
        this.tweens.add({ targets: particle, alpha: 0, scale: 0.3, duration: 250, onComplete: function() { if (particle.active) particle.destroy(); } });
    }
    if (e.isBoss) {
        e.hp--;
        if (e.hp <= 0) killBoss.call(this, e);
    } else {
        e.destroy(); 
        score += 10; 
        wolvesKilled++;
        createWolfSkeleton.call(this, e.x, e.y, false, e.angle);
        createBloodStain.call(this, e.x, e.y);
        if (wolvesKilled >= 10 && !achievements.firstBlood) { achievements.firstBlood = true; showAchievement.call(this, 'ПЕРВАЯ КРОВЬ!'); }
        if (wolvesKilled >= 100 && !achievements.hunter) { achievements.hunter = true; showAchievement.call(this, 'ОХОТНИК!'); }
        if (wolvesKilled >= 1000 && !achievements.legend) { achievements.legend = true; showAchievement.call(this, 'ЛЕГЕНДА!'); }
    }
}

function hitEnemy(h, e) {
    if (!e || !e.active) return;
    if (e.isBoss) { 
        loseHP.call(this); 
        if (gameState === 'playing') this.cameras.main.shake(200, 0.02); 
        return; 
    }
    e.destroy(); 
    if (gameState === 'playing') this.cameras.main.shake(200, 0.02);
    if (cows.length > 0) { 
        cows.pop().destroy(); 
    } else {
        loseHP.call(this);
    }
}

function loseHP() {
    horseHP--; 
    updateHPDisplay.call(this);
    if (horseHP <= 0) gameOver.call(this);
}

function updateHPDisplay() { 
    var h = ''; 
    for (var i = 0; i < horseHP; i++) h += '❤️'; 
    this.hpText.setText(h); 
}

function collectCow(h, cow) {
    if (!cow || !cow.active) return;
    cow.destroy(); 
    cows.push(createCow.call(this, horse.x, horse.y + 50));
    score += 5; 
    totalCowsCollected++; 
    totalCowsEverSaved++;
    localStorage.setItem('totalCowsEverSaved', totalCowsEverSaved);
    if (totalCowsCollected >= 20 && !achievements.shepherd) { 
        achievements.shepherd = true; 
        showAchievement.call(this, 'ПАСТУХ!'); 
    }
}

function killCowByWolf(cow, wolf) {
    if (!cow || !cow.active) return;
    cows = cows.filter(function(c) { return c !== cow; });
    deadCows.push(createDeadCow.call(this, cow.x, cow.y, cow.angle));
    if (wolf && wolf.active) eatingWolves.push(wolf); 
    cow.destroy();
}

function createDeadCow(x, y, angle) {
    var sk = this.add.graphics(); 
    sk.lineStyle(2, 0xDDDDDD, 0.8);
    sk.strokeCircle(0, -15, 6); 
    sk.lineBetween(-4, -20, -8, -28); 
    sk.lineBetween(4, -20, 8, -28);
    sk.strokeCircle(-2, -16, 1.5); 
    sk.strokeCircle(2, -16, 1.5); 
    sk.lineBetween(0, -9, 0, 10);
    for (var i = 0; i < 3; i++) sk.strokeEllipse(-5, -4 + i * 4, 10, 3);
    sk.strokeEllipse(0, 13, 8, 5); 
    sk.lineBetween(-4, 16, -5, 28); 
    sk.lineBetween(4, 16, 5, 28);
    var c = this.add.container(x, y, [sk]); 
    c.angle = angle || 0; 
    c.alpha = 0.6; 
    return c;
}

function shareToSocial(network) {
    var gameUrl = window.location.href || 'https://your-game-url.com';
    var mins = Math.floor(gameTime / 60), secs = Math.floor(gameTime % 60);
    var text = 'HORNS AND HOOFS - Счёт: ' + score + ' | Время: ' + mins + ':' + (secs < 10 ? '0' : '') + secs + ' | Коровы: ' + totalCowsCollected + ' | Волки: ' + wolvesKilled;
    if (network === 'telegram') window.open('https://t.me/share/url?url=' + encodeURIComponent(gameUrl) + '&text=' + encodeURIComponent(text), '_blank');
    else if (network === 'vk') window.open('https://vk.com/share.php?url=' + encodeURIComponent(gameUrl) + '&title=' + encodeURIComponent('HORNS AND HOOFS') + '&description=' + encodeURIComponent(text), '_blank');
}

function gameOver() {
    if (gameOverTriggered) return;
    gameOverTriggered = true;
    gameState = 'gameover';
    if (score > highScore) { 
        highScore = score; 
        localStorage.setItem('cowboyHighScore', highScore); 
    }
    removeBossDarkness.call(this);
    var goUI = this.add.container(600, 400); 
    goUI.setScrollFactor(0);
    goUI.add(this.add.rectangle(0, 0, 900, 750, 0x000000, 0.95).setStrokeStyle(4, 0xFF0000));
    goUI.add(this.add.text(0, -320, 'КОНЕЦ ИГРЫ', { fontSize: '56px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5));
    goUI.add(this.add.text(0, -260, 'Счёт: ' + score, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -220, 'Рекорд: ' + highScore, { fontSize: '28px', fill: '#ffff00' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -185, 'Коровы: ' + totalCowsCollected + ' | Золотые: ' + goldenCowsCollected, { fontSize: '22px', fill: '#aaffaa' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -155, 'Волков: ' + wolvesKilled + ' | Быков: ' + bullsKilled, { fontSize: '20px', fill: '#ffaaaa' }).setOrigin(0.5));
    goUI.add(this.add.text(0, -115, 'ДОСТИЖЕНИЯ', { fontSize: '26px', fill: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5));
    
    var al = [
        { n: 'Первая кровь (10 волков)', u: achievements.firstBlood }, 
        { n: 'Пастух (20 коров)', u: achievements.shepherd },
        { n: 'GOD OF WAR (босс)', u: achievements.godOfWar }, 
        { n: 'Выживший (10 мин)', u: achievements.survivor },
        { n: 'Золотая лихорадка', u: achievements.goldenFever }, 
        { n: 'Охотник (100 волков)', u: achievements.hunter },
        { n: 'Легенда (1000 волков)', u: achievements.legend }, 
        { n: 'Тореадор (3 быка)', u: achievements.bullfighter }
    ];
    var yp = -80;
    for (var i = 0; i < al.length; i++) {
        goUI.add(this.add.text(0, yp, (al[i].u ? '✅ ' : '❌ ') + al[i].n, { fontSize: '18px', fill: al[i].u ? '#00FF00' : '#666666' }).setOrigin(0.5));
        yp += 25;
    }
    goUI.add(this.add.text(0, yp + 15, 'Всего за все игры: ' + totalCowsEverSaved + ' 🐄 | ' + totalGoldenCowsEver + ' ✨', { fontSize: '16px', fill: '#88ff88' }).setOrigin(0.5));
    
    var pb = document.createElement('button');
    pb.textContent = '▶ ИГРАТЬ СНОВА';
    pb.style.cssText = 'position:absolute;left:50%;top:80%;transform:translate(-50%,-50%);padding:12px 40px;font-size:24px;font-weight:bold;color:white;background:#228B22;border:4px solid #00FF00;border-radius:10px;cursor:pointer;z-index:9999;font-family:Arial;';
    pb.onmouseover = function() { pb.style.background = '#32CD32'; };
    pb.onmouseout = function() { pb.style.background = '#228B22'; };
    pb.onclick = function() { window.location.reload(); };
    document.body.appendChild(pb);
    
    var tg = document.createElement('button');
    tg.textContent = '✈️ TELEGRAM';
    tg.style.cssText = 'position:absolute;left:35%;top:90%;transform:translate(-50%,-50%);padding:10px 25px;font-size:18px;font-weight:bold;color:white;background:#0088CC;border:3px solid #00AAEE;border-radius:10px;cursor:pointer;z-index:9999;font-family:Arial;';
    tg.onmouseover = function() { tg.style.background = '#00AAEE'; };
    tg.onmouseout = function() { tg.style.background = '#0088CC'; };
    tg.onclick = function() { shareToSocial('telegram'); };
    document.body.appendChild(tg);
    
    var vk = document.createElement('button');
    vk.textContent = '🔵 ВКОНТАКТЕ';
    vk.style.cssText = 'position:absolute;left:65%;top:90%;transform:translate(-50%,-50%);padding:10px 25px;font-size:18px;font-weight:bold;color:white;background:#0077FF;border:3px solid #0099FF;border-radius:10px;cursor:pointer;z-index:9999;font-family:Arial;';
    vk.onmouseover = function() { vk.style.background = '#0099FF'; };
    vk.onmouseout = function() { vk.style.background = '#0077FF'; };
    vk.onclick = function() { shareToSocial('vk'); };
    document.body.appendChild(vk);
}

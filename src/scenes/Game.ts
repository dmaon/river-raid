import { Display, Scene } from 'phaser';

// Type definitions for enemy positions and tweens
type EnemyPosition = {
    key: string
    x: number
}

type EnemiesTweens = {
    enemyIdentifier: string
    tween: Phaser.Tweens.Tween
}


// Custom sprite interface for enemy identification
interface CustomSprite extends Phaser.Physics.Arcade.Sprite {
    enemyIdentifier: string;
}

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    planeCamera: Phaser.Cameras.Scene2D.Camera;
    control: Phaser.Cameras.Controls.SmoothedKeyControl
    gameWidth: number
    gameHeight: number
    plane: Phaser.Physics.Arcade.Sprite;
    bullet: Phaser.Physics.Arcade.Sprite;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    walls: Phaser.Physics.Arcade.Group;
    battleships: Phaser.Physics.Arcade.Sprite[];
    helicopters: Phaser.Physics.Arcade.Sprite[];
    enemies: Phaser.Physics.Arcade.Sprite[];
    bulletInMotion: boolean
    bulletSpeed: number
    bulletFireTween: Phaser.Tweens.Tween
    maxLifeChance: number
    lifeChance: number
    enemyTypes: string[]
    debugMode: boolean
    enemiesTweens: EnemiesTweens[]
    maxWalls: number
    maxThr: number
    counter: number
    keyHoldDuration: number
    moveSpeed: number
    maxSpeed: number
    planeEngineFx: Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound | Phaser.Sound.NoAudioSound
    explosionFx: Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound | Phaser.Sound.NoAudioSound
    props: Phaser.GameObjects.Group
    propGameObject: Phaser.GameObjects.Sprite
    playerLifeBar: Phaser.GameObjects.Sprite[]
    finishLine: Phaser.Physics.Arcade.Group
    startMode: boolean
    playerScore: number
    highScore: number
    scoreBoard: Phaser.GameObjects.BitmapText
    startCounter: boolean
    localStorageKey: string
    difficultyLevel: "easy" | "normal" | "hard" | "insane" | "alien"
    addEnemyChance: integer
    enemyMinSpeed: integer;
    enemyMaxSpeed: integer;
    enemyStartMovement: integer;
    maxYPosition: integer;

    constructor() {
        super('Game'); // Call the parent class constructor and set the scene key
    }

    preload() {
        // Initialize variables with default values
        this.difficultyLevel = 'easy'
        this.addEnemyChance = 70
        this.maxYPosition = 40
        this.playerScore = 0
        this.counter = 0
        this.maxWalls = 300
        this.maxLifeChance = 3
        this.lifeChance = 3
        this.startMode = false;
        this.startCounter = false;
        this.bulletInMotion = false;
        this.bulletSpeed = 400
        this.debugMode = false
        this.enemiesTweens = []
        this.enemies = [];
        this.playerLifeBar = [];
        this.keyHoldDuration = 0;
        this.enemyMinSpeed = 900;
        this.enemyMaxSpeed = 2000;
        this.enemyStartMovement = 1000;


        this.localStorageKey = "river-raid-high-score"
        this.highScore = this.getHighScore()

        // Types of enemies in the game
        this.enemyTypes = ["battleship", "helicopter", "airplane"]

        // Set movement speed limits
        this.moveSpeed = 5; // Base speed
        this.maxSpeed = 15; // Maximum speed

        // Set assets path
        this.load.setPath('assets');

        // Load plane sprite and animation frames
        this.load.spritesheet("plane", "plane.png", {
            frameWidth: 64,
            frameHeight: 59,
        });

        // Setup the camera dimensions
        this.camera = this.cameras.main;
        this.gameWidth = this.camera.width;
        this.gameHeight = this.camera.height;

        // Load images for walls, props, and enemies
        this.load.image('walls', 'walls.png');
        this.load.image('prop', 'prop.png');
        this.load.image('bridge', 'bridge.png');
        this.load.image('bullet', 'bullet.png');
        this.load.spritesheet("helicopter", "helicopter.png", {
            frameWidth: 64,
            frameHeight: 40,
        });
        this.load.spritesheet("battleship", "ship.png", {
            frameWidth: 128,
            frameHeight: 32,
        });
        this.load.spritesheet("airplane", "airplane.png", {
            frameWidth: 64,
            frameHeight: 25,
        });

        // Load sound effects for explosions and plane engine
        this.load.audio('explosion', ['sounds/explosion-8bit.wav']);
        this.load.audio('bullet', ['sounds/bullet-8bit.wav']);
        this.load.audio('planeEngine', ['sounds/engine-8bit.wav']);
        this.load.audio('planeEngineFast', ['sounds/engine-fast-8bit.wav']);
        this.load.audio('planeEngineSlow', ['sounds/engine-slow-8bit.wav']);

        // Load bitmap font for UI text
        this.load.bitmapFont('atari', 'fonts/bitmap/atari-classic.png', 'fonts/bitmap/atari-classic.xml');
    }

    create() {
        // Initialize sound effects
        this.planeEngineFx = this.sound.add('planeEngine')
        this.explosionFx = this.sound.add('explosion')

        // Create cursor keys for player input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add animations for sprites
        this.createAnimation()

        // Create walls and decorative props
        this.makeWall()

        // Initialize the plane and its bullet
        this.addPlane()

        // Add the first enemy to the scene
        this.addEnemy()

        // Add scoreboard
        this.AddScoreBoard()

        // Add lifebar
        this.makeLifeBar()

        // Start the game when the space key is pressed
        this.input.keyboard.on('keydown-SPACE', () => {
            this.startMode = true
            this.startCounter = true // Enable scoreboard
        });
    }


    AddScoreBoard() {
        // Add scoreboard text
        this.scoreBoard = this.add.bitmapText(10, 10, 'atari', this.playerScore.toString(), 20).setOrigin(0).setTint(0xFFFF00);
    }

    makeFinishLine(y: number) {
        // Create a finish line at a specified Y position
        this.finishLine = this.physics.add.group();
        this.finishLine.create(0, (this.gameHeight - (--y * 256)) - 256 / 2, "bridge").setOrigin(0);
    }

    makeProps(x: number, y: number, width: number, height: number, origin: number) {
        // Create decorative props near walls
        const propsContainer = this.add.container()
        const safePlace = new Phaser.Geom.Rectangle(x, y, width - 128, height - 99)

        if (origin === 1 && x >= 80 && width > 128) {
            this.propGameObject = this.physics.add.sprite(0, 0, "prop").setOrigin(origin);
            propsContainer.add(Phaser.Actions.RandomRectangle([this.propGameObject], safePlace))
        }
        if (origin === 0 && x < this.gameWidth - 80 && width > 128) {
            this.propGameObject = this.physics.add.sprite(0, 0, "prop").setOrigin(origin);
            propsContainer.add(Phaser.Actions.RandomRectangle([this.propGameObject], safePlace))
        }

        return propsContainer;
    }

    makeWall() {
        // Create walls and place props along them
        this.maxThr = 0
        this.walls = this.physics.add.group();
        this.props = this.add.group();
        let i = 0
        for (; i < this.maxWalls; i++) {
            let x: number = Phaser.Math.Between(-100, 100);
            this.walls.create(x, this.gameHeight - (i * 256), "walls");
            this.props.add(this.makeProps(x, this.gameHeight - (i * 256), 256, 256, 1))

            x = Phaser.Math.Between(-100, 256 / 2);
            this.walls.create(this.gameWidth - x, this.gameHeight - (i * 256), "walls");
            this.props.add(this.makeProps(this.gameWidth - x, this.gameHeight - (i * 256), 256, 256, 0))
        }

        this.maxThr = (this.maxWalls * 256) + 120
        this.makeFinishLine(i)
    }

    createAnimation() {
        // Create animations for plane, helicopter, battleship, and airplane

        // Plane animations
        this.anims.create({
            key: "plane-move-forward",
            frames: [{ key: 'plane', frame: 0 }],
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "plane-move-right",
            frames: [{ key: 'plane', frame: 1 }],
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "plane-move-left",
            frames: [{ key: 'plane', frame: 2 }],
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "plane-explode",
            frames: [{ key: 'plane', frame: 3 }],
            frameRate: 10,
            repeat: 0,
        });

        // Helicopter animations
        // Create an animation for the helicopter to continuously fly
        this.anims.create({
            key: "helicopter-fly",
            frames: this.anims.generateFrameNumbers("helicopter", { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1, // Loop indefinitely
        });

        // Create an animation for the helicopter exploding
        this.anims.create({
            key: "helicopter-explode",
            frames: this.anims.generateFrameNumbers("helicopter", { start: 2, end: 3 }),
            frameRate: 10,
            repeat: 0, // Play once and stop
        });

        // Battleship animations
        // Create an animation for the battleship exploding
        this.anims.create({
            key: "battleship-explode",
            frames: this.anims.generateFrameNumbers("battleship", { start: 1, end: 2 }),
            frameRate: 5, // Slower explosion animation
            repeat: 0, // Play once and stop
        });

        // Airplane animations
        // Create an animation for the enemy airplane exploding
        this.anims.create({
            key: "airplane-explode",
            frames: this.anims.generateFrameNumbers("airplane", { start: 1, end: 2 }),
            frameRate: 5, // Slower explosion animation
            repeat: 0, // Play once and stop
        });
    }

    addPlane() {
        // Add the player's plane to the scene
        this.plane = this.physics.add.sprite(this.gameWidth / 2, this.gameHeight - 59, "plane");
        this.plane.setCollideWorldBounds(true); // Prevent the plane from going out of bounds

        // Add collision detection between the plane and walls
        this.physics.add.collider(this.plane, this.walls, this.planeCrash.bind(this));

        // Initialize the bullet for the plane
        this.reloadPlaneBullet();
    }

    makeLifeBar() {
        const spaceBetween = 40
        Phaser.Actions.SetVisible(this.playerLifeBar, false)
        this.playerLifeBar = []
        for (let i = 0; i < this.lifeChance; i++) {
            this.playerLifeBar.push(this.add.sprite(((this.gameWidth - 110) + i * spaceBetween) + ((this.maxLifeChance - this.lifeChance) * spaceBetween), 30, "plane").setScale(0.5));
        }
    }

    reloadPlaneBullet() {
        // Reload the plane's bullet and position it at the plane's current location
        this.bullet = this.physics.add.sprite(this.plane.x, this.plane.y, "bullet");
        this.bullet.setCollideWorldBounds(true); // Prevent the bullet from leaving the screen
    }

    fireBullet() {
        // Prevent firing if the bullet is already in motion
        if (this.bulletInMotion) {
            return;
        }

        this.bulletInMotion = true; // Set flag to indicate the bullet is moving

        if (this.bullet.y > 0) {
            // Play the bullet sound effect
            this.sound.add('bullet').play();

            // Animate the bullet moving upwards
            this.bulletFireTween = this.tweens.add({
                targets: this.bullet,
                y: this.bullet.height * -1, // Move bullet off the top of the screen
                duration: this.bulletSpeed, // Speed of the bullet
                ease: 'Linear', // Smooth movement
                repeat: 0, // Do not repeat
                onComplete: () => {
                    // Reset bullet position and motion flag after reaching the top
                    this.bulletInMotion = false;
                    this.bullet.x = this.plane.x;
                    this.bullet.y = this.plane.y;
                }
            });
        }
    }

    addEnemy() {
        // Define initial positions for enemies on the left and right
        const enemyPositions: EnemyPosition[] = [{ key: "left", x: 256 }, { key: "right", x: this.gameWidth - 256 }];
        const airplaneEnemyPositions: EnemyPosition[] = [{ key: "left", x: -256 }, { key: "right", x: this.gameWidth + 256 }];

        // Randomly determine the Y position and pick a random enemy
        let randomYPosition: number;
        let randomEnemy: string;
        let randomEnemyLocation: EnemyPosition;


        randomEnemy = Phaser.Math.RND.pick(this.enemyTypes); // Randomly pick an enemy type
        const enemyIsAirplane = randomEnemy === "airplane"
        randomEnemyLocation = enemyIsAirplane ? Phaser.Math.RND.pick(airplaneEnemyPositions) : Phaser.Math.RND.pick(enemyPositions); // Randomly pick an enemy position (left or right)

        randomYPosition = Phaser.Math.Between(0, this.maxYPosition); // Random Y position between 0 and one-quarter of the game height for battleship and helicopter

        if (enemyIsAirplane)
            randomYPosition = Phaser.Math.Between(0, this.maxYPosition); // Random Y position between 0 and one-quarter of the game height for airplane only

        // Add the enemy sprite to the physics world and set its properties
        let enemy = this.physics.add.sprite(randomEnemyLocation.x, randomYPosition, randomEnemy) as CustomSprite;
        enemy.setFlipX(randomEnemyLocation.key == "right"); // Flip the enemy horizontally if it's on the right side
        enemy.setCollideWorldBounds(enemyIsAirplane ? false : true); // Enable collision with world bounds
        enemy.enemyIdentifier = `${randomEnemy}${this.enemies.length + 1}`; // Assign a unique identifier to the enemy

        // Add collision between the plane and the enemy
        this.physics.add.collider(this.plane, enemy, this.collidePlaneWithEnemy.bind(this));
        // Add collision between the bullet and the enemy
        this.physics.add.collider(this.bullet, enemy, this.hitEnemy.bind(this));

        this.enemies.push(enemy); // Add the enemy to the enemies array

        // Play the "helicopter-fly" animation for all helicopter enemies
        Phaser.Actions.PlayAnimation(this.enemies.filter(enemy => enemy.texture.key == "helicopter"), "helicopter-fly");

        // Add a movement tween for the enemy to move back and forth
        if (!enemyIsAirplane) {
            this.enemiesTweens.push({
                enemyIdentifier: enemy.enemyIdentifier, tween: this.tweens.add({
                    targets: enemy,
                    x: {
                        from: enemy.x,
                        to: enemy.x == 256 ? this.gameWidth - 256 : 256 // Move the enemy from left to right or vice versa
                    },
                    flipX: true, // Flip the enemy horizontally
                    yoyo: true, // Enable yoyo movement (back and forth)
                    duration: Phaser.Math.Between(this.enemyMinSpeed, this.enemyMaxSpeed), // Random duration for the movement
                    ease: 'Linear', // Linear easing for the movement
                    delay: Phaser.Math.Between(0, this.enemyStartMovement), // Random delay or debug-dependent delay
                    repeat: -1, // Repeat the movement infinitely
                })
            });
        } else {
            this.enemiesTweens.push({
                enemyIdentifier: enemy.enemyIdentifier, tween: this.tweens.add({
                    targets: enemy,
                    x: {
                        from: enemy.x,
                        to: enemy.x == -256 ? this.gameWidth + 256 : -256 // Move the enemy from left to right or vice versa
                    },
                    flipX: true, // Flip the enemy horizontally
                    yoyo: false,
                    duration: Phaser.Math.Between(this.enemyMinSpeed, this.enemyMaxSpeed), // Random duration for the movement
                    ease: 'Linear', // Linear easing for the movement
                    delay: Phaser.Math.Between(0, 1000), // Random delay or debug-dependent delay
                    repeat: 0, // Repeat the movement infinitely
                })
            });

        }
    }

    resetPlanePosition() {
        if (this.lifeChance > 0) {
            this.scene.pause(); // Pause the scene to make adjustments

            // Play the plane moving animation after resuming
            if (this.plane && this.plane.anims) {
                this.plane.anims.play('plane-move-forward');
            }

            // Reset the plane's position to the center bottom of the screen
            this.plane.x = this.gameWidth / 2;
            this.plane.y = this.gameHeight - 59;

            setTimeout(() => {
                this.scene.resume(); // Resume the scene after a short delay
                this.startCounter = true // Enable scoreboard
            }, 500);
        }
    }

    takePlayerLife() {
        this.startCounter = false // Disable scoreboard
        this.lifeChance--; // Decrease the player's remaining lives

        // Update lifebar
        this.makeLifeBar()

        if (this.lifeChance <= 0) {
            if (this.highScore < this.playerScore)
                this.highScore = this.playerScore
            this.scene.start('GameOver', { score: this.playerScore, highScore: this.highScore }); // Start the GameOver scene when lives are over


            // Update hight score in localstorage based on previous high score
            if (this.playerScore > this.getHighScore())
                this.setHighScore()


        }
    }

    planeCrash(plane: Phaser.Physics.Arcade.Sprite) {
        // Ensure the explosion animation plays only once
        if (plane.anims.currentAnim?.key !== "plane-explode") {
            plane.anims.play('plane-explode', true); // Play the plane explosion animation
            this.explosionFx.play(); // Play the explosion sound effect

            plane.on('animationcomplete', () => {
                if (plane.anims.currentAnim?.key === "plane-explode") {
                    this.resetPlanePosition(); // Reset the plane's position after the explosion
                    this.takePlayerLife(); // Decrease the player's life after the explosion
                }
            });
        }
    }

    hitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
        if (this.bulletFireTween !== undefined) {
            this.bulletFireTween.complete(10); // Complete the bullet's tween animation
        }

        // Stop the enemy's movement when hit
        const currentEnemy = this.enemiesTweens.find((theEnemy: EnemiesTweens) => theEnemy.enemyIdentifier === enemy.enemyIdentifier);
        if (currentEnemy) {
            currentEnemy.tween.stop(); // Stop the enemy's tween
        }

        this.explosionFx.play(); // Play explosion sound effect

        // Play the enemy explosion animation
        if (enemy.texture.key == "helicopter") {
            enemy.anims.play("helicopter-explode");
        } else if (enemy.texture.key == "battleship") {
            enemy.anims.play("battleship-explode");
        } else if (enemy.texture.key == "airplane") {
            enemy.anims.play("airplane-explode");
        }

        // Disable collision by setting the body.enable to false after the explosion
        if (enemy.body) {
            enemy.body.enable = false;
        }

        // Destroy the enemy after the explosion animation is complete
        enemy.on('animationcomplete', () => {
            enemy.destroy();
        });

        // Increase more score
        this.increaseMoreScore(10);

    }

    increaseMoreScore(score: number) {
        if (this.startCounter) {
            this.playerScore += score
            this.scoreBoard.setText(this.playerScore.toString())
        }
    }

    collidePlaneWithEnemy(plane: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
        // Stop the enemy's movement when colliding with the plane
        const currentEnemy = this.enemiesTweens.find((theEnemy: EnemiesTweens) => theEnemy.enemyIdentifier === enemy.enemyIdentifier);
        if (currentEnemy) {
            currentEnemy.tween.stop(); // Stop the enemy's tween
        }

        // Prevent re-collision after explosion animation starts
        if (enemy.anims.currentAnim?.key == "battleship-explode" || enemy.anims.currentAnim?.key == "helicopter-explode") {
            return;
        }

        // Play the explosion animation for the enemy
        if (enemy.texture.key == "helicopter") {
            enemy.anims.play("helicopter-explode");
        } else if (enemy.texture.key == "battleship") {
            enemy.anims.play("battleship-explode");
        } else if (enemy.texture.key == "airplane") {
            enemy.anims.play("airplane-explode");
        }

        // Disable collision by setting the body.enable to false after the explosion
        if (enemy.body) {
            enemy.body.enable = false;
        }


        // Destroy the enemy after the explosion animation is complete
        enemy.on('animationcomplete', () => {
            enemy.destroy();
        });

        // Increase more score
        this.increaseMoreScore(10);

        // If the plane is not already exploding, play the plane explosion animation
        if (plane.anims.currentAnim?.key !== "plane-explode") {
            plane.anims.play('plane-explode', true); // Play the plane explosion animation
            this.explosionFx.play(); // Play the explosion sound effect

            plane.on('animationcomplete', () => {
                if (plane.anims.currentAnim?.key === "plane-explode") {
                    this.takePlayerLife(); // Decrease the player's life
                    this.resetPlanePosition(); // Reset the plane's position
                }
            });
        }
    }


    getHighScore(): number {
        const highScore = localStorage.getItem(this.localStorageKey)
        if (highScore === null)
            return 0
        return Number.parseInt(highScore)
    }

    setHighScore() {
        localStorage.setItem(this.localStorageKey, this.highScore.toString())
    }


    changeGameDifficulty() {

        // Change game difficulty based on player score
        this.difficultyLevel = 'easy';
        if (this.playerScore >= 3000 && this.playerScore < 5000) {
            this.difficultyLevel = 'normal'
        } else if (this.playerScore >= 5000 && this.playerScore < 7000) {
            this.difficultyLevel = 'hard'
        } else if (this.playerScore >= 7000 && this.playerScore < 10000) {
            this.difficultyLevel = 'insane'
        } else if (this.playerScore >= 10000) {
            this.difficultyLevel = 'alien'
        }

        switch (this.difficultyLevel) {
            case 'easy':
                this.addEnemyChance = 70
                this.enemyMinSpeed = 900
                this.enemyMaxSpeed = 2000
                this.enemyStartMovement = 1000
                this.maxYPosition = 40
                break;
            case 'normal':
                this.addEnemyChance = 65
                this.enemyMinSpeed = 850
                this.enemyMaxSpeed = 1500
                this.enemyStartMovement = 800
                this.maxYPosition = 30
                break;
            case 'hard':
                this.addEnemyChance = 60
                this.enemyMinSpeed = 750
                this.enemyMaxSpeed = 1000
                this.enemyStartMovement = 600
                this.maxYPosition = 20
                break;
            case 'insane':
                this.addEnemyChance = 55
                this.enemyMinSpeed = 700
                this.enemyMaxSpeed = 950
                this.enemyStartMovement = 400
                this.maxYPosition = 10
                break;
            case 'alien':
                this.addEnemyChance = 50
                this.enemyMinSpeed = 500
                this.enemyMaxSpeed = 900
                this.enemyStartMovement = 200
                this.maxYPosition = 0
                break;
        }
    }

    update() {


        // Check if the game should start or if the player has no remaining lives
        if (!this.startMode || this.lifeChance <= 0) {
            return; // Exit the update function if the game hasn't started or if player has no lives left
        }

        // Increase player score
        this.increaseMoreScore(1)

        // Change game difficulty
        this.changeGameDifficulty()

        // Check if the plane is currently exploding
        const planeExplode: boolean = this.plane.anims.currentAnim?.key === "plane-explode";
        // Set the plane's velocity to 0 (stop any movement)
        this.plane.setVelocityX(0);
        this.plane.setVelocityY(0);

        // If the plane isn't exploding, play the "plane-move-forward" animation
        if (!planeExplode)
            this.plane.anims.play('plane-move-forward');

        // Check for user input from the cursor keys to move the plane
        if (this.cursors.left.isDown) {
            this.plane.setVelocityX(-300); // Move the plane to the left
            if (!planeExplode)
                this.plane.anims.play('plane-move-left', true); // Play the left move animation if not exploding
        }

        if (this.cursors.right.isDown) {
            this.plane.setVelocityX(300); // Move the plane to the right
            if (!planeExplode)
                this.plane.anims.play('plane-move-right', true); // Play the right move animation if not exploding
        }

        // Increment counter to track the frame updates
        this.counter++;

        // Check if the up arrow key is being held down to increase speed
        if (this.cursors.up.isDown || (this.cursors.up.isDown && (this.cursors.left.isDown || this.cursors.right.isDown))) {
            this.keyHoldDuration += 10; // Increase the hold duration
            this.planeEngineFx.setRate(1.5); // Speed up the plane engine sound effect
        } else if (!this.cursors.up.isDown && !this.cursors.left.isDown && !this.cursors.right.isDown) {
            this.keyHoldDuration = 0; // Reset the speed if no direction key is pressed
            this.planeEngineFx.setRate(1); // Reset the engine sound effect to normal speed
        }

        // Calculate the plane's speed based on the hold duration, clamping it within the speed range
        let speed = Phaser.Math.Clamp(this.moveSpeed + (this.keyHoldDuration / 100), this.moveSpeed, this.maxSpeed);

        // If the down arrow key is pressed, reduce the speed and change the engine sound
        if (this.cursors.down.isDown) {
            speed = 3; // Slow down the plane significantly
            this.planeEngineFx.setRate(0.5); // Slow down the engine sound effect
        }

        // Play the engine sound if it isn't already playing
        if (!this.planeEngineFx.isPlaying) {
            this.planeEngineFx.play();
        }

        // Move enemies based on the current speed
        this.enemies.forEach(enemy => {
            enemy.y += speed; // Move enemies downwards
            if (enemy.y >= this.gameHeight - 29) {
                enemy.destroy(); // Destroy enemies that move past the bottom of the screen
            }
        });

        // Move the walls, finish line, and props based on the speed
        this.walls.incY(speed); // Move the walls downwards
        this.finishLine.incY(speed); // Move the finish line downwards
        this.props.incY(speed); // Move props (like obstacles) downwards

        // Check if the game is finished by checking if the first wall has passed a certain threshold
        const firstWall = this.walls.getChildren()[0];
        if (firstWall.y > this.maxThr + (this.gameHeight / 2)) {
            if (this.highScore < this.playerScore)
                this.highScore = this.playerScore
            this.scene.start('PlayerWins', { score: this.playerScore, highScore: this.highScore }); // Start the PlayerWins scene if the game is finished
            // Update hight score in localstorage based on previous high score
            if (this.playerScore > this.getHighScore())
                this.setHighScore()
        }

        // Randomly add a new enemy with a certain chance
        if (this.counter % Phaser.Math.Between(this.addEnemyChance, 100) == 0) {
            this.addEnemy(); // Add a new enemy if the counter reaches a certain value
        }

        // Check if the space key is pressed to fire bullets
        if (this.cursors.space.isDown) {
            this.fireBullet(); // Fire a bullet if the space key is pressed
        }

        // Update the bullet's position to be aligned with the plane's position
        this.bullet.x = this.plane.x;

    }
}
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
    lifeChance: number
    maxFirstEnemiesNumber: number
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
    finishLine: Phaser.Physics.Arcade.Group
    startMode: boolean

    constructor() {
        super('Game'); // Call the parent class constructor and set the scene key
    }

    preload() {
        // Initialize variables with default values
        this.counter = 0
        this.maxWalls = 30
        this.lifeChance = 3
        this.maxFirstEnemiesNumber = 2
        this.startMode = false;
        this.bulletInMotion = false;
        this.bulletSpeed = 400
        this.debugMode = false
        this.enemiesTweens = []
        this.enemies = [];
        this.keyHoldDuration = 0;

        // Types of enemies in the game
        this.enemyTypes = ["battleship", "helicopter"]

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

        // Start the game when the space key is pressed
        this.input.keyboard.on('keydown-SPACE', () => {
            this.startMode = true
        });
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
        // Create animations for plane, helicopter, and battleship

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
    addEnemies() {
        // Define possible enemy positions (left and right)
        const enemyPositions: EnemyPosition[] = [{ key: "left", x: 256 }, { key: "right", x: this.gameWidth - 256 }];
        let randomYPosition: number; // Y position of the enemy
        let randomEnemy: string; // Type of enemy (e.g., battleship, helicopter)
        let randomEnemyLocation: EnemyPosition; // Random position for the enemy

        for (let i = 0; i < this.maxFirstEnemiesNumber; i++) {
            // Generate a random Y position within the visible area
            randomYPosition = Phaser.Math.Between(0, this.gameHeight - 200);

            // Randomly pick an enemy type and location
            randomEnemy = Phaser.Math.RND.pick(this.enemyTypes);
            randomEnemyLocation = Phaser.Math.RND.pick(enemyPositions);

            // Create the enemy sprite and set its properties
            let enemy = this.physics.add.sprite(randomEnemyLocation.x, randomYPosition, randomEnemy) as CustomSprite;
            enemy.setFlipX(randomEnemyLocation.key == "right"); // Flip sprite if positioned on the right
            enemy.setCollideWorldBounds(true); // Prevent the enemy from leaving the screen
            enemy.enemyIdentifier = `${randomEnemy}${i}`; // Assign a unique identifier

            // Add collision detection between the plane, bullet, and enemy
            this.physics.add.collider(this.plane, enemy, this.collidePlaneWithEnemy.bind(this));
            this.physics.add.collider(this.bullet, enemy, this.hitEnemy.bind(this));

            // Add the enemy to the enemies array
            this.enemies.push(enemy);
        }

        // Play the flying animation for all helicopter enemies
        Phaser.Actions.PlayAnimation(
            this.enemies.filter(enemy => enemy.texture.key == "helicopter"),
            "helicopter-fly"
        );
    }
    addEnemy() {
        // Define initial positions for enemies on the left and right
        const enemyPositions: EnemyPosition[] = [{ key: "left", x: 256 }, { key: "right", x: this.gameWidth - 256 }];

        // Randomly determine the Y position and pick a random enemy
        let randomYPosition: number;
        let randomEnemy: string;
        let randomEnemyLocation: EnemyPosition;

        randomYPosition = Phaser.Math.Between(0, this.gameHeight / 4); // Random Y position between 0 and one-quarter of the game height
        randomEnemy = Phaser.Math.RND.pick(this.enemyTypes); // Randomly pick an enemy type
        randomEnemyLocation = Phaser.Math.RND.pick(enemyPositions); // Randomly pick an enemy position (left or right)

        // Add the enemy sprite to the physics world and set its properties
        let enemy = this.physics.add.sprite(randomEnemyLocation.x, randomYPosition, randomEnemy) as CustomSprite;
        enemy.setFlipX(randomEnemyLocation.key == "right"); // Flip the enemy horizontally if it's on the right side
        enemy.setCollideWorldBounds(true); // Enable collision with world bounds
        enemy.enemyIdentifier = `${randomEnemy}${this.enemies.length + 1}`; // Assign a unique identifier to the enemy

        // Add collision between the plane and the enemy
        this.physics.add.collider(this.plane, enemy, this.collidePlaneWithEnemy.bind(this));
        // Add collision between the bullet and the enemy
        this.physics.add.collider(this.bullet, enemy, this.hitEnemy.bind(this));

        this.enemies.push(enemy); // Add the enemy to the enemies array

        // Play the "helicopter-fly" animation for all helicopter enemies
        Phaser.Actions.PlayAnimation(this.enemies.filter(enemy => enemy.texture.key == "helicopter"), "helicopter-fly");

        // Add a movement tween for the enemy to move back and forth
        this.enemiesTweens.push({
            enemyIdentifier: enemy.enemyIdentifier, tween: this.tweens.add({
                targets: enemy,
                x: {
                    from: enemy.x,
                    to: enemy.x == 256 ? this.gameWidth - 256 : 256 // Move the enemy from left to right or vice versa
                },
                flipX: true, // Flip the enemy horizontally
                yoyo: true, // Enable yoyo movement (back and forth)
                duration: Phaser.Math.Between(900, 2000), // Random duration for the movement
                ease: 'Linear', // Linear easing for the movement
                delay: this.debugMode == true ? 1000 * (this.enemies.length + 1) : Phaser.Math.Between(0, 1000), // Random delay or debug-dependent delay
                repeat: -1, // Repeat the movement infinitely
            })
        });
    }

    makeEnemiesTween() {
        // Create tweens for all enemies to move back and forth
        this.enemies.forEach((chunk: CustomSprite, index: number) => {
            this.enemiesTweens.push({
                enemyIdentifier: chunk.enemyIdentifier, tween: this.tweens.add({
                    targets: chunk,
                    x: {
                        from: chunk.x,
                        to: chunk.x == 256 ? this.gameWidth - 256 : 256 // Move the enemy from left to right or vice versa
                    },
                    flipX: true, // Flip the enemy horizontally
                    yoyo: true, // Enable yoyo movement (back and forth)
                    duration: Phaser.Math.Between(900, 2000), // Random duration for the movement
                    ease: 'Linear', // Linear easing for the movement
                    delay: this.debugMode == true ? 1000 * (index + 1) : Phaser.Math.Between(0, 1000), // Random delay or debug-dependent delay
                    repeat: -1, // Repeat the movement infinitely
                })
            });
        });
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
            }, 500);
        }
    }

    takePlayerLife() {
        this.lifeChance--; // Decrease the player's remaining lives
        if (this.lifeChance <= 0) {
            this.scene.start('GameOver'); // Start the GameOver scene when lives are over
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
        }

        // Disable collision by setting the body.enable to false after the explosion
        if (enemy.body) {
            enemy.body.enable = false;
        }

        // Destroy the enemy after the explosion animation is complete
        enemy.on('animationcomplete', () => {
            enemy.destroy();
        });
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
        }

        // Destroy the enemy after the explosion animation is complete
        enemy.on('animationcomplete', () => {
            enemy.destroy();
        });

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
    update() {

        // Check if the game should start or if the player has no remaining lives
        if (!this.startMode || this.lifeChance <= 0) {
            return; // Exit the update function if the game hasn't started or if player has no lives left
        }

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
        if (true) {
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
                this.scene.start('PlayerWins'); // Start the PlayerWins scene if the game is finished
            }

            // Randomly add a new enemy with a certain chance
            if (this.counter % Phaser.Math.Between(70, 100) == 0) {
                this.addEnemy(); // Add a new enemy if the counter reaches a certain value
            }
        }

        // Check if the space key is pressed to fire bullets
        if (this.cursors.space.isDown) {
            this.fireBullet(); // Fire a bullet if the space key is pressed
        }

        // Update the bullet's position to be aligned with the plane's position
        this.bullet.x = this.plane.x;

    }
}
import { Display, Scene } from 'phaser';

type EnemyPosition = {
    key: string
    x: number
}

type EnemiesTweens = {
    enemyIdentifier: string
    tween: Phaser.Tweens.Tween
}

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
        super('Game');
    }

    preload() {
        this.counter = 0
        this.maxWalls = 30
        this.lifeChance = 3
        this.maxFirstEnemiesNumber = 2
        this.startMode = false;
        this.bulletInMotion = false;
        this.bulletSpeed = 400

        this.enemyTypes = ["battleship", "helicopter"]
        this.debugMode = false
        this.enemiesTweens = []
        this.enemies = [];
        this.keyHoldDuration = 0;

        this.moveSpeed = 5; // Base speed
        this.maxSpeed = 15; // Maximum speed

        this.load.setPath('assets');
        // this.load.atlas('plane', 'plane/plane.png', 'plane/plane.json');
        this.load.spritesheet("plane", "plane.png", {
            frameWidth: 64,
            frameHeight: 59,
        });

        this.camera = this.cameras.main;
        this.gameWidth = this.camera.width;
        this.gameHeight = this.camera.height;


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

        // this.load.audio('explode', ['sounds/explode.mp3']);
        // this.load.audio('shoot1', ['sounds/shoot1.mp3']);
        // this.load.audio('shoot2', ['sounds/shoot2.mp3']);

        this.load.audio('explosion', ['sounds/explosion-8bit.wav']);
        this.load.audio('bullet', ['sounds/bullet-8bit.wav']);
        this.load.audio('planeEngine', ['sounds/engine-8bit.wav']);
        this.load.audio('planeEngineFast', ['sounds/engine-fast-8bit.wav']);
        this.load.audio('planeEngineSlow', ['sounds/engine-slow-8bit.wav']);

        this.load.bitmapFont('atari', 'fonts/bitmap/atari-classic.png', 'fonts/bitmap/atari-classic.xml');
    }

    create() {
        // setup
        this.planeEngineFx = this.sound.add('planeEngine')
        this.explosionFx = this.sound.add('explosion')
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add sprite animations
        this.createAnimation()

        // add wall
        this.makeWall() // this.walls

        // add plane with bullet
        this.addPlane() // this.plane, this.bullet

        // add enemiy(s)
        this.addEnemy() // this.enemies
        // makes enemies move
        // this.makeEnemiesTween()
        // this.addEnemies() // this.enemies


        this.input.keyboard.on('keydown-SPACE', () => {
            this.startMode = true
        });




    }
    // Jingle_Win_00.wav by LittleRobotSoundFactory -- https://freesound.org/s/270333/ -- License: Attribution 4.0
    // Video game music(LOOP) by Ric34 -- https://freesound.org/s/776502/ -- License: Attribution 4.0
    // Sound from Zapsplat.com


    makeFinishLine(y: number) {
        this.finishLine = this.physics.add.group();
        this.finishLine.create(0, (this.gameHeight - (--y * 256)) - 256 / 2, "bridge").setOrigin(0);
    }

    makeProps(x: number, y: number, width: number, height: number, origin: number) {
        const propsContainer = this.add.container()
        const safePlace = new Phaser.Geom.Rectangle(x, y, width - 128, height - 99)

        // for changing walls color
        // const redRectangle = this.add.rectangle(x, y, width, height, 0x549b58);
        // propsContainer.add(redRectangle)

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
        this.maxThr = 0
        this.walls = this.physics.add.group();
        this.props = this.add.group();
        let i = 0
        for (; i < this.maxWalls; i++) {
            let x: number = Phaser.Math.Between(-100, 100);
            this.walls.create(x, this.gameHeight - (i * 256), "walls");
            this.props.add(this.makeProps(x, this.gameHeight - (i * 256), 256, 256, 1)) // For adding props

            x = Phaser.Math.Between(-100, 256 / 2);
            this.walls.create(this.gameWidth - x, this.gameHeight - (i * 256), "walls");
            this.props.add(this.makeProps(this.gameWidth - x, this.gameHeight - (i * 256), 256, 256, 0)) // For adding props
        }

        this.maxThr = (this.maxWalls * 256) + 120
        this.makeFinishLine(i)
    }

    createAnimation() {
        // plane
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

        // helicopter
        this.anims.create({
            key: "helicopter-fly",
            frames: this.anims.generateFrameNumbers("helicopter", { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: "helicopter-explode",
            frames: this.anims.generateFrameNumbers("helicopter", { start: 2, end: 3 }),
            frameRate: 10,
            repeat: 0,
        });

        // battleship
        this.anims.create({
            key: "battleship-explode",
            frames: this.anims.generateFrameNumbers("battleship", { start: 1, end: 2 }),
            frameRate: 5,
            repeat: 0,
        });
    }

    addPlane() {
        this.plane = this.physics.add.sprite(this.gameWidth / 2, this.gameHeight - 59, "plane");
        this.plane.setCollideWorldBounds(true);

        this.physics.add.collider(this.plane, this.walls, this.planeCrash.bind(this));

        this.reloadPlaneBullet()
    }

    reloadPlaneBullet() {
        this.bullet = this.physics.add.sprite(this.plane.x, this.plane.y, "bullet")
        this.bullet.setCollideWorldBounds(true);
    }

    fireBullet() {
        if (this.bulletInMotion) {
            return;
        }

        this.bulletInMotion = true; // Set flag to indicate bullet is moving

        if (this.bullet.y > 0) {
            this.sound.add('bullet').play();
            this.bulletFireTween = this.tweens.add({
                targets: this.bullet,
                y: this.bullet.height * -1,
                duration: this.bulletSpeed,
                ease: 'Linear',
                repeat: 0,
                onComplete: () => {
                    this.bulletInMotion = false;
                    this.bullet.x = this.plane.x
                    this.bullet.y = this.plane.y
                }
            });
        }
    }

    addEnemies() {
        const enemyPositions: EnemyPosition[] = [{ key: "left", x: 256 }, { key: "right", x: this.gameWidth - 256 }]
        let randomYPosition: number
        let randomEnemy: string
        let randomEnemyLocation: EnemyPosition

        // const redRectangle = this.add.rectangle(256, 0, this.gameWidth - 500, this.gameHeight - 200, 0xff0000);
        // redRectangle.setOrigin(0, 0);

        // const safePlace = new Phaser.Geom.Rectangle(230, 0, this.gameWidth - 460, this.gameHeight - 200)
        // const safeLine = new Phaser.Geom.Line(230, 100, 230, this.gameHeight - 100)

        for (let i = 0; i < this.maxFirstEnemiesNumber; i++) {
            randomYPosition = Phaser.Math.Between(0, this.gameHeight - 200);
            // randomYPosition = Phaser.Math.Between(this.maxThr * -1, this.gameHeight - 200);
            randomEnemy = Phaser.Math.RND.pick(this.enemyTypes)
            randomEnemyLocation = Phaser.Math.RND.pick(enemyPositions)

            let enemy = this.physics.add.sprite(randomEnemyLocation.x, randomYPosition, randomEnemy) as CustomSprite;
            enemy.setFlipX(randomEnemyLocation.key == "right")
            enemy.setCollideWorldBounds(true)
            enemy.enemyIdentifier = `${randomEnemy}${i}`

            this.physics.add.collider(this.plane, enemy, this.collidePlaneWithEnemy.bind(this));
            this.physics.add.collider(this.bullet, enemy, this.hitEnemy.bind(this));

            this.enemies.push(enemy)
        }

        // Phaser.Actions.PlaceOnLine(this.enemies, safeLine);

        Phaser.Actions.PlayAnimation(this.enemies.filter(enemy => enemy.texture.key == "helicopter"), "helicopter-fly")

    }

    addEnemy() {
        const enemyPositions: EnemyPosition[] = [{ key: "left", x: 256 }, { key: "right", x: this.gameWidth - 256 }]
        let randomYPosition: number
        let randomEnemy: string
        let randomEnemyLocation: EnemyPosition
        randomYPosition = Phaser.Math.Between(0, this.gameHeight / 4);
        randomEnemy = Phaser.Math.RND.pick(this.enemyTypes)
        randomEnemyLocation = Phaser.Math.RND.pick(enemyPositions)

        let enemy = this.physics.add.sprite(randomEnemyLocation.x, randomYPosition, randomEnemy) as CustomSprite;
        enemy.setFlipX(randomEnemyLocation.key == "right")
        enemy.setCollideWorldBounds(true)
        enemy.enemyIdentifier = `${randomEnemy}${this.enemies.length + 1}`

        this.physics.add.collider(this.plane, enemy, this.collidePlaneWithEnemy.bind(this));
        this.physics.add.collider(this.bullet, enemy, this.hitEnemy.bind(this));

        this.enemies.push(enemy)
        Phaser.Actions.PlayAnimation(this.enemies.filter(enemy => enemy.texture.key == "helicopter"), "helicopter-fly")

        this.enemiesTweens.push({
            enemyIdentifier: enemy.enemyIdentifier, tween: this.tweens.add({
                targets: enemy,
                x: {
                    from: enemy.x,
                    to: enemy.x == 256 ? this.gameWidth - 256 : 256
                },
                flipX: true,
                yoyo: true,
                duration: Phaser.Math.Between(900, 2000),
                ease: 'Linear',
                delay: this.debugMode == true ? 1000 * (this.enemies.length + 1) : Phaser.Math.Between(0, 1000),
                repeat: -1,
            })
        });
    }

    makeEnemiesTween() {
        this.enemies.forEach((chunk: CustomSprite, index: number) => {
            this.enemiesTweens.push({
                enemyIdentifier: chunk.enemyIdentifier, tween: this.tweens.add({
                    targets: chunk,
                    x: {
                        from: chunk.x,
                        to: chunk.x == 256 ? this.gameWidth - 256 : 256
                    },
                    flipX: true,
                    yoyo: true,
                    duration: Phaser.Math.Between(900, 2000),
                    ease: 'Linear',
                    delay: this.debugMode == true ? 1000 * (index + 1) : Phaser.Math.Between(0, 1000),
                    repeat: -1,
                })
            });
        });
    }

    resetPlanePosition() {
        if (this.lifeChance > 0) {
            this.scene.pause();

            // Play the animation after resuming
            if (this.plane && this.plane.anims) {
                this.plane.anims.play('plane-move-forward');
            }

            // Reset plane position and play animation
            this.plane.x = this.gameWidth / 2;
            this.plane.y = this.gameHeight - 59;

            setTimeout(() => {
                this.scene.resume(); // Resumes the current scene after 500 ms
            }, 500);
        }
    }


    takePlayerLife() {
        this.lifeChance--
        if (this.lifeChance <= 0) {
            this.scene.start('GameOver');
        }
    }

    planeCrash(plane: Phaser.Physics.Arcade.Sprite) {
        if (plane.anims.currentAnim?.key !== "plane-explode") {

            plane.anims.play('plane-explode', true);
            this.explosionFx.play();

            plane.on('animationcomplete', () => {
                if (plane.anims.currentAnim?.key === "plane-explode") {
                    this.resetPlanePosition()
                    this.takePlayerLife()
                }
            });

        }

    }


    hitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
        if (this.bulletFireTween !== undefined) {
            this.bulletFireTween.complete(10) // Make bulletTween animation ends
        }

        // Making enemy stop moving 
        const currentEnemy = this.enemiesTweens.find((theEnemy: EnemiesTweens) => theEnemy.enemyIdentifier === enemy.enemyIdentifier)
        if (currentEnemy) {
            currentEnemy.tween.stop()
        }

        this.explosionFx.play();

        if (enemy.texture.key == "helicopter") {
            enemy.anims.play("helicopter-explode")
        } else if (enemy.texture.key == "battleship") {
            enemy.anims.play("battleship-explode")
        }

        // Disable collision by setting body.enable to false
        if (enemy.body)
            enemy.body.enable = false

        enemy.on('animationcomplete', () => {
            enemy.destroy();
        });
    }

    collidePlaneWithEnemy(plane: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {

        const currentEnemy = this.enemiesTweens.find((theEnemy: EnemiesTweens) => theEnemy.enemyIdentifier === enemy.enemyIdentifier)
        if (currentEnemy) {
            currentEnemy.tween.stop()
        }

        if (enemy.anims.currentAnim?.key == "battleship-explode" || enemy.anims.currentAnim?.key == "helicopter-explode") {
            return;
        }

        if (enemy.texture.key == "helicopter") {
            enemy.anims.play("helicopter-explode")
        } else if (enemy.texture.key == "battleship") {
            enemy.anims.play("battleship-explode")
        }

        enemy.on('animationcomplete', () => {
            enemy.destroy();
        });


        if (plane.anims.currentAnim?.key !== "plane-explode") {
            plane.anims.play('plane-explode', true);
            this.explosionFx.play();

            plane.on('animationcomplete', () => {
                if (plane.anims.currentAnim?.key === "plane-explode") {
                    this.takePlayerLife()
                    this.resetPlanePosition()
                }
            });
        }
    }

    update() {

        if (!this.startMode || this.lifeChance <= 0) {
            return
        }

        const planeExplode: boolean = this.plane.anims.currentAnim?.key === "plane-explode"
        this.plane.setVelocityX(0);
        this.plane.setVelocityY(0);

        if (!planeExplode)
            this.plane.anims.play('plane-move-forward')

        // Check for cursor key inputs
        if (this.cursors.left.isDown) {
            this.plane.setVelocityX(-300); // Move left
            if (!planeExplode)
                this.plane.anims.play('plane-move-left', true)
        }

        if (this.cursors.right.isDown) {
            this.plane.setVelocityX(300); // Move right
            if (!planeExplode)
                this.plane.anims.play('plane-move-right', true)
        }

        if (true) {
            this.counter++

            if (this.cursors.up.isDown || (this.cursors.up.isDown && (this.cursors.left.isDown || this.cursors.right.isDown))) { // Increase speed
                this.keyHoldDuration += 10;
                this.planeEngineFx.setRate(1.5);
            } else if (!this.cursors.up.isDown && !this.cursors.left.isDown && !this.cursors.right.isDown) { // Reset speed to default
                this.keyHoldDuration = 0;
                this.planeEngineFx.setRate(1);
            }

            let speed = Phaser.Math.Clamp(this.moveSpeed + (this.keyHoldDuration / 100), this.moveSpeed, this.maxSpeed);

            // For slowing down speed
            if (this.cursors.down.isDown) {
                speed = 3
                this.planeEngineFx.setRate(0.5);
            }

            // playing sound fx
            if (!this.planeEngineFx.isPlaying) {
                this.planeEngineFx.play();
            }

            // Make enemies moves
            this.enemies.forEach(enemy => {
                enemy.y += speed
                if (enemy.y >= this.gameHeight - 29) {
                    enemy.destroy()
                }
            })

            // Make walls moves
            this.walls.incY(speed)
            // Make finish line moves
            this.finishLine.incY(speed)
            // Make props moves
            this.props.incY(speed)

            // Check game is finished or not
            const firstWall = this.walls.getChildren()[0];
            if (firstWall.y > this.maxThr + (this.gameHeight / 2)) {
                this.scene.start('PlayerWins');
            }


            // Add new enemy with change 9/10
            // if (this.counter % Phaser.Math.Between(70, 100) == 0 && Phaser.Math.RND.pick([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]) % 2 === 0) {
            if (this.counter % Phaser.Math.Between(70, 100) == 0) {
                this.addEnemy();
            }

        }



        // Check for space key and direction keys
        if (this.cursors.space.isDown) {
            this.fireBullet(); // Fire bullet while moving left
        }

        this.bullet.x = this.plane.x


    }





}


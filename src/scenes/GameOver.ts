import { Display, Scene } from 'phaser';


type Prop = {
    score: number
}

export class GameOver extends Scene {
    gameWidth: number
    gameHeight: number
    score: number

    constructor() {
        super('GameOver');
    }

    init(prop: Prop) {
        this.score = prop.score;
    }

    preload() {
        this.gameWidth = this.cameras.main.width;
        this.gameHeight = this.cameras.main.height;

        this.load.setPath('assets');
        this.load.bitmapFont('atari', 'fonts/bitmap/atari-classic.png', 'fonts/bitmap/atari-classic.xml');

        this.load.audio('gameOver', ['sounds/game over.mp3']);
    }

    create() {
        this.add.bitmapText(this.gameWidth / 2, (this.gameHeight / 2) - 35, 'atari', 'Game Over', 40).setOrigin(0.5).setTint(0xFFFF00);
        this.add.bitmapText(this.gameWidth / 2, (this.gameHeight / 2) + 35, 'atari', `Score: ${this.score}`, 25).setOrigin(0.5).setTint(0xFFFF00);

        this.sound.stopAll();
        this.sound.add('gameOver').play();

        // Listen for the space key to start the game
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('PreLoad'); // Start the GameScene when space is pressed
        });

    }


}
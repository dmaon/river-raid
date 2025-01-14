import { Game as PlayGame } from './scenes/Game';
import { PreLoad } from './scenes/PreLoad';
import { PlayerWins } from './scenes/PlayerWins';
import { GameOver } from './scenes/GameOver';
import { AUTO, Game, Scale, Types } from 'phaser';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#2d32b8',
    scale: {
        mode: Scale.EXPAND,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        PreLoad,
        PlayGame,
        PlayerWins,
        GameOver,
    ],
    physics: {
        default: "arcade",
        arcade: {
            // debug: true,
        },
    },
    title: 'River Raid',
    version: '1.5',
    banner: {
        text: '#ffff00',
        background: [
            '#ffff00',
            '#2d32b8',
        ],
        hidePhaser: true
    },
};

export default new Game(config);

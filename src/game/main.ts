import Phaser from 'phaser';
import { MainScene } from './MainScene';

export const StartGame = (parent: HTMLElement) => {
    return new Phaser.Game({
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.RESIZE,
            parent: parent,
            width: 800,
            height: 600
        },
        audio: {
            noAudio: true
        },
        backgroundColor: '#000000',
        scene: MainScene
    });
};

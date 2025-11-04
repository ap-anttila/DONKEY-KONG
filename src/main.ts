import Phaser from 'phaser'

import MainScene from '@/scenes/MainScene'
import MenuScene from '@/scenes/MenuScene'
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS } from '@/config/gameConfig'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#87ceeb',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.GRAVITY_Y },
      debug: false, // Temporarily enabled to visualize body bounds
      tileBias: 16,
      forceX: false,
    },
  },
  scene: [MenuScene, MainScene],
}

// eslint-disable-next-line no-new
new Phaser.Game(config)

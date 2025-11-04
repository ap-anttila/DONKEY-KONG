import Phaser from 'phaser'

import { HUD } from '@/config/gameConfig'

const BANANA_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontSize: '28px',
  color: '#ffec99',
  align: 'left',
}

const TIMER_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontSize: '28px',
  color: '#ffffff',
  align: 'right',
}

export default class Hud {
  private readonly scene: Phaser.Scene
  private readonly container: Phaser.GameObjects.Container
  private readonly heartSprites: Phaser.GameObjects.Image[] = []
  private readonly bananaText: Phaser.GameObjects.Text
  private readonly timerText: Phaser.GameObjects.Text
  private readonly maxHearts: number

  constructor(scene: Phaser.Scene, maxHearts: number) {
    this.scene = scene
    this.maxHearts = maxHearts

    this.container = scene.add.container(HUD.MARGIN, HUD.MARGIN)
    this.container.setScrollFactor(0)
    this.container.setDepth(100)

    const panel = scene.add.rectangle(0, 0, 360, 110, 0x1e1307, 0.72)
    panel.setOrigin(0)
    panel.setStrokeStyle(3, 0xf6d87b, 0.9)
    this.container.add(panel)

    this.createHearts()
    this.bananaText = this.createBananaCounter()
    this.timerText = this.createTimerText()
  }

  static preload(scene: Phaser.Scene): void {
    if (!scene.textures.exists('hud-heart-full')) {
      Hud.createHeartTexture(scene, 'hud-heart-full', 0xf25c69)
    }

    if (!scene.textures.exists('hud-heart-empty')) {
      Hud.createHeartTexture(scene, 'hud-heart-empty', 0x5e3d46, 0.3)
    }

    if (!scene.textures.exists('hud-banana')) {
      scene.load.image('hud-banana', 'assets/banana.png')
    }
  }

  setHearts(hearts: number): void {
    this.heartSprites.forEach((sprite, index) => {
      const key = index < hearts ? 'hud-heart-full' : 'hud-heart-empty'
      sprite.setTexture(key)
    })
  }

  setBananas(count: number): void {
    this.bananaText.setText(count.toString().padStart(3, '0'))
  }

  updateTimer(elapsedSeconds: number): void {
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = Math.floor(elapsedSeconds % 60)
    const remainder = Math.floor((elapsedSeconds % 1) * 10)
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}.${remainder}`)
  }

  destroy(): void {
    this.container.destroy(true)
  }

  private createHearts(): void {
    for (let i = 0; i < this.maxHearts; i += 1) {
      const heart = this.scene.add.image(24 + i * 48, 24, 'hud-heart-full')
      heart.setOrigin(0)
      heart.setScale(0.9)
      this.container.add(heart)
      this.heartSprites.push(heart)
    }
  }

  private createBananaCounter(): Phaser.GameObjects.Text {
    const icon = this.scene.add.image(20, 70, 'hud-banana')
    icon.setOrigin(0)
    icon.setScale(0.042)
    icon.setAngle(-12)
    this.container.add(icon)

    const text = this.scene.add.text(60, 66, '000', BANANA_TEXT_STYLE)
    text.setOrigin(0)
    text.setShadow(2, 2, '#2b1c0c', 2, true, true)
    this.container.add(text)

    return text
  }

  private createTimerText(): Phaser.GameObjects.Text {
    const text = this.scene.add.text(200, 66, '0:00.0', TIMER_TEXT_STYLE)
    text.setOrigin(0)
    text.setShadow(2, 2, '#151515', 2, true, true)
    this.container.add(text)
    return text
  }

  private static createHeartTexture(
    scene: Phaser.Scene,
    key: string,
    color: number,
    alpha = 1
  ): void {
    const graphics = scene.add.graphics()
    graphics.setVisible(false)
    graphics.fillStyle(color, alpha)
    graphics.fillPoints(
      [
        new Phaser.Math.Vector2(16, 0),
        new Phaser.Math.Vector2(32, 12),
        new Phaser.Math.Vector2(28, 30),
        new Phaser.Math.Vector2(16, 40),
        new Phaser.Math.Vector2(4, 30),
        new Phaser.Math.Vector2(0, 12),
      ],
      true
    )
    graphics.generateTexture(key, 32, 40)
    graphics.destroy()
  }
}


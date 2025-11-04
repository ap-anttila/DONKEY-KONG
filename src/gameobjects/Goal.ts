import Phaser from 'phaser'

const WIDTH = 128
const HEIGHT = 192

export default class Goal extends Phaser.Physics.Arcade.Sprite {
  private pulseTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'goal-idle')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setOrigin(0.5, 1)
    this.setDepth(15)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setImmovable(true)
    body.setSize(WIDTH * 0.6, HEIGHT * 0.8)
    body.setOffset((WIDTH - body.width) / 2, HEIGHT * 0.2)

    this.setScale(1)

    this.pulseTween = scene.tweens.add({
      targets: this,
      duration: 1400,
      scale: 1.05,
      alpha: 1,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  static preload(scene: Phaser.Scene): void {
    if (scene.textures.exists('goal-idle')) {
      return
    }

    const graphics = scene.add.graphics()
    graphics.setVisible(false)

    graphics.fillStyle(0xf2d16b, 1)
    graphics.fillRoundedRect(0, HEIGHT * 0.45, WIDTH, HEIGHT * 0.55, 24)
    graphics.fillGradientStyle(0xfff2a6, 0xffd86a, 0xf2c24f, 0xe3a927, 1, 1, 1, 1)
    graphics.fillRoundedRect(8, HEIGHT * 0.1, WIDTH - 16, HEIGHT * 0.65, 18)
    graphics.fillStyle(0xfff8ce, 0.8)
    graphics.fillRect(WIDTH / 2 - 6, HEIGHT * 0.05, 12, HEIGHT * 0.5)

    graphics.lineStyle(6, 0xb88330, 1)
    graphics.strokeRoundedRect(0, HEIGHT * 0.45, WIDTH, HEIGHT * 0.55, 24)
    graphics.strokeRoundedRect(8, HEIGHT * 0.1, WIDTH - 16, HEIGHT * 0.65, 18)

    graphics.generateTexture('goal-idle', WIDTH, HEIGHT)
    graphics.destroy()
  }

  playCompletionEffects(): void {
    this.pulseTween?.stop()
    this.scene.tweens.add({
      targets: this,
      duration: 400,
      scale: 1.2,
      alpha: 0,
      ease: 'Sine.easeOut',
    })
  }

  override destroy(fromScene?: boolean): void {
    this.pulseTween?.stop()
    this.pulseTween = undefined
    super.destroy(fromScene)
  }
}


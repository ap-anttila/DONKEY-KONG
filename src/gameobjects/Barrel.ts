import Phaser from 'phaser'

import { CAMERA_BOUNDS } from '@/config/gameConfig'

export interface BarrelConfig {
  x: number
  y: number
  speed: number
}

export default class Barrel extends Phaser.Physics.Arcade.Sprite {
  private readonly spawnX: number
  private readonly spawnY: number
  private readonly baseSpeed: number

  constructor(scene: Phaser.Scene, config: BarrelConfig) {
    super(scene, config.x, config.y, 'barrel')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.spawnX = config.x
    this.spawnY = config.y

    const configuredSpeed = config.speed || 0
    const intendedSpeed = configuredSpeed === 0 ? -160 : configuredSpeed
    this.baseSpeed = intendedSpeed > 0 ? -intendedSpeed : intendedSpeed

    const body = this.body as Phaser.Physics.Arcade.Body

    this.setCircle(28, 4, 4)
    this.setBounce(0.1, 0)
    this.setDragX(0)
    this.setDepth(8)
    this.setVelocityX(this.baseSpeed)
    body.setAllowGravity(true)
    body.setMaxVelocity(Math.max(Math.abs(this.baseSpeed), 160) * 1.1, 900)
  }

  static preload(scene: Phaser.Scene): void {
    if (scene.textures.exists('barrel')) {
      return
    }

    const graphics = scene.add.graphics()
    graphics.setVisible(false)
    const center = 32
    const outerRadius = 30
    const midRadius = 24

    graphics.fillStyle(0x703d1c, 1)
    graphics.fillCircle(center, center, outerRadius)

    graphics.fillStyle(0x9c6030, 1)
    graphics.fillCircle(center, center, midRadius)

    graphics.lineStyle(6, 0x3c1f10, 1)
    graphics.strokeCircle(center, center, outerRadius)

    graphics.lineStyle(5, 0x3c1f10, 1)
    graphics.beginPath()
    graphics.arc(center, center, midRadius, Phaser.Math.DegToRad(40), Phaser.Math.DegToRad(140))
    graphics.strokePath()
    graphics.beginPath()
    graphics.arc(center, center, midRadius, Phaser.Math.DegToRad(220), Phaser.Math.DegToRad(320))
    graphics.strokePath()

    graphics.fillStyle(0xb17943, 0.7)
    graphics.fillEllipse(center - 10, center - 8, 18, 12)
    graphics.generateTexture('barrel', 64, 64)
    graphics.destroy()
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta)

    const body = this.body as Phaser.Physics.Arcade.Body

    if (!Phaser.Math.Within(body.velocity.x, this.baseSpeed, 12)) {
      body.setVelocityX(this.baseSpeed)
    }

    if (this.y > CAMERA_BOUNDS.maxY + 200 || this.x < CAMERA_BOUNDS.minX - 200) {
      this.resetPosition()
    }

    this.rotation += (-body.velocity.x / 220) * (delta / 16.67)
  }

  private resetPosition(): void {
    this.setPosition(this.spawnX, this.spawnY)
    this.setVelocity(this.baseSpeed, 0)
  }
}


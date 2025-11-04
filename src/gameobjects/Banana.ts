import Phaser from 'phaser'

const FLOAT_SPEED = 0.0035
const FLOAT_RANGE = 10

export default class Banana extends Phaser.Physics.Arcade.Sprite {
  private readonly baseY: number
  private elapsed = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'banana')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(9)
    this.setScale(0.06) // Scaled down to fit the game better (banana bunch is quite large)
    this.setOrigin(0.5, 0.5)
    
    // Adjust physics body to match your banana image dimensions
    // You may need to adjust these values after seeing your image
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(this.width * 0.7, this.height * 0.7)

    this.baseY = y
  }

  static preload(scene: Phaser.Scene): void {
    // Always try to load if not already loaded
    if (!scene.textures.exists('banana')) {
      // Load banana image from assets folder
      scene.load.image('banana', 'assets/banana.png')
    }
  }

  update(delta: number): void {
    this.elapsed += delta
    const offset = Math.sin(this.elapsed * FLOAT_SPEED) * FLOAT_RANGE
    this.setY(this.baseY + offset)
  }

  collect(): void {
    this.disableBody(true, true)
    const sparkle = this.scene.add.circle(this.x, this.y, 6, 0xf7d64c, 1)
    sparkle.setDepth(9)

    this.scene.tweens.add({
      targets: sparkle,
      duration: 250,
      y: sparkle.y - 30,
      scale: 0,
      alpha: 0,
      ease: 'Sine.easeOut',
      onComplete: () => sparkle.destroy(),
    })
  }

}


import Phaser from 'phaser'

import { PHYSICS } from '@/config/gameConfig'

const RUN_ACCELERATION = 1400
const RUN_DECELERATION = 1800
const MIN_MOVE_SPEED = 40
const INVULNERABILITY_DURATION = 1200
const CLIMB_SPEED = 220
const MAX_HEARTS = 3
const SPRITE_SCALE = 0.15
const BODY_WIDTH_RATIO = 0.5
const BODY_HEIGHT_RATIO = 0.70

type UpdateContext = {
  onLadder?: boolean
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private canDoubleJump = false
  private coyoteTimer = 0
  private invulnerableTimer = 0
  private hurtAnimTimer = 0
  private bananaCount = 0
  private hearts = MAX_HEARTS
  private isClimbing = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle')

    // Set origin and scale before adding physics
    // Origin at top-center (0) to avoid flickering from transparent space at bottom
    this.setOrigin(0.5, 0)
    this.setScale(SPRITE_SCALE)
    
    // Adjust Y position: spawn positions assume bottom-origin, but we're using top-origin
    // So we need to shift down by the sprite's display height
    this.y = y - this.displayHeight

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(10)
    this.setBounce(0)
    this.setDragX(RUN_DECELERATION)
    this.setMaxVelocity(PHYSICS.PLAYER_MAX_VELOCITY_X, 1200)

    // Setup physics body - must be done after scale and origin are set
    this.setupPhysicsBody()

    this.setCollideWorldBounds(true)
    this.play('player-idle')
  }

  private setupPhysicsBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    
    // Get the actual texture dimensions
    const textureWidth = this.width
    const textureHeight = this.height

    // Calculate body size - smaller than texture to match actual character dimensions
    const bodyWidth = textureWidth * BODY_WIDTH_RATIO
    const bodyHeight = textureHeight * BODY_HEIGHT_RATIO
    
    // Center the body horizontally
    const xOffset = (textureWidth - bodyWidth) / 2
    
    // Position body so its BOTTOM aligns with texture bottom (where ground contact is)
    // Since origin is (0.5, 0), sprite.y represents the top of the sprite
    // yOffset positions the body within the texture, measured from texture top
    // To align body bottom with texture bottom: yOffset = textureHeight - bodyHeight
    const yOffset = textureHeight - bodyHeight
    
    body.setSize(bodyWidth, bodyHeight)
    body.setOffset(xOffset, yOffset)
    body.setCollideWorldBounds(true)
  }

  static preload(scene: Phaser.Scene): void {
    const textureKeys = [
      'player_idle',
      'player_running',
      'player_jumping',
      'player_hurt',
      'player_dead',
      'player_climbing',
      'player_celebrating',
    ] as const

    textureKeys.forEach((key) => {
      if (!scene.textures.exists(key)) {
        scene.load.image(key, `assets/player/${key}.png`)
      }
    })
  }

  static createAnimations(scene: Phaser.Scene): void {
    const anims = scene.anims

    const ensureAnim = (
      key: string,
      frameKey: string,
      frameRate = 1,
      repeat = -1
    ): void => {
      if (anims.exists(key)) {
        return
      }
      anims.create({
        key,
        frames: [{ key: frameKey }],
        frameRate,
        repeat,
      })
    }

    ensureAnim('player-idle', 'player_idle')
    ensureAnim('player-run', 'player_running')
    ensureAnim('player-jump', 'player_jumping')
    ensureAnim('player-climb', 'player_climbing')
    ensureAnim('player-hurt', 'player_hurt')
    ensureAnim('player-dead', 'player_dead', 1, 0)
    ensureAnim('player-celebrate', 'player_celebrating')
  }

  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    delta: number,
    context: UpdateContext = {}
  ): void {
    if (!cursors) {
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    const onLadder = context.onLadder ?? false

    // Clamp very small vertical velocities to prevent micro-bouncing
    // Zero out tiny velocities and small upward velocities when on floor
    if (body.onFloor()) {
      if (Math.abs(body.velocity.y) < 10) {
        body.setVelocityY(0)
      }
    }

    this.handleClimbing(cursors, onLadder)

    let onGround = body.onFloor()

    if (this.isClimbing) {
      onGround = true
      this.canDoubleJump = true
      this.coyoteTimer = 0
    } else if (onGround) {
      this.canDoubleJump = true
      this.coyoteTimer = 120
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= delta
    }

    if (!this.isClimbing) {
      this.handleHorizontalMovement(cursors)
    } else {
      body.setAccelerationX(0)
      body.setVelocityX(0)
    }

    this.handleJumping(cursors, onGround)
    this.updateAnimation(onGround)
    this.updateInvulnerability(delta)
  }

  collectBanana(amount = 1): void {
    this.bananaCount += amount
    this.scene.events.emit('player-banana-collected', this.bananaCount)
  }

  takeDamage(amount = 1): void {
    if (this.invulnerableTimer > 0) {
      return
    }

    this.hearts = Math.max(0, this.hearts - amount)
    this.invulnerableTimer = INVULNERABILITY_DURATION
    this.hurtAnimTimer = 320
    this.setTint(0xff8a8a)
    this.scene.cameras.main.shake(200, 0.01)
    this.play('player-hurt', true)
    this.scene.events.emit('player-damaged', this.hearts)

    if (this.hearts <= 0) {
      this.scene.events.emit('player-died')
    }
  }

  heal(amount = 1): void {
    this.hearts = Math.min(MAX_HEARTS, this.hearts + amount)
    this.scene.events.emit('player-healed', this.hearts)
  }

  isInvulnerable(): boolean {
    return this.invulnerableTimer > 0
  }

  applyKnockback(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    this.stopClimbing()
    body.setVelocity(x, y)
  }

  getBananas(): number {
    return this.bananaCount
  }

  getHealth(): number {
    return this.hearts
  }

  getMaxHealth(): number {
    return MAX_HEARTS
  }

  private handleHorizontalMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    const leftPressed = cursors.left?.isDown ?? false
    const rightPressed = cursors.right?.isDown ?? false

    if (leftPressed === rightPressed) {
      body.setAccelerationX(0)
      if (body.onFloor() && Math.abs(body.velocity.x) < MIN_MOVE_SPEED) {
        body.setVelocityX(0)
      }
      return
    }

    const direction = leftPressed ? -1 : 1
    body.setAccelerationX(direction * RUN_ACCELERATION)

    if (Math.abs(body.velocity.x) > MIN_MOVE_SPEED) {
      this.setFlipX(direction < 0)
    }
  }

  private handleJumping(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    onGround: boolean
  ): void {
    const primaryJump = cursors.up
    const altJump = cursors.space
    const jumpPressed =
      (primaryJump && Phaser.Input.Keyboard.JustDown(primaryJump)) ||
      (altJump && Phaser.Input.Keyboard.JustDown(altJump))

    if (!jumpPressed) {
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.isClimbing) {
      this.stopClimbing()
      body.setVelocityY(PHYSICS.PLAYER_JUMP_VELOCITY * 0.85)
      this.play('player-jump', true)
      return
    }

    if (onGround || this.coyoteTimer > 0) {
      body.setVelocityY(PHYSICS.PLAYER_JUMP_VELOCITY)
      this.canDoubleJump = true
      this.coyoteTimer = 0
      this.play('player-jump', true)
    } else if (this.canDoubleJump) {
      body.setVelocityY(PHYSICS.PLAYER_DOUBLE_JUMP_VELOCITY)
      this.canDoubleJump = false
      this.play('player-jump', true)
    }
  }

  private handleClimbing(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    onLadder: boolean
  ): void {
    const up = cursors.up?.isDown ?? false
    const down = cursors.down?.isDown ?? false
    const horizontal = (cursors.left?.isDown ?? false) || (cursors.right?.isDown ?? false)

    if (!this.isClimbing) {
      if (onLadder && (up || down)) {
        this.startClimbing()
      } else {
        return
      }
    }

    if (!onLadder) {
      this.stopClimbing()
      return
    }

    if (horizontal) {
      this.stopClimbing()
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    let velocityY = 0

    if (up) {
      velocityY -= CLIMB_SPEED
    }

    if (down) {
      velocityY += CLIMB_SPEED
    }

    body.setVelocityY(velocityY)

    if (velocityY === 0) {
      body.setVelocityY(0)
    }
  }

  private startClimbing(): void {
    if (this.isClimbing) {
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    this.isClimbing = true
    body.setAllowGravity(false)
    body.setVelocity(0, 0)
    body.setAcceleration(0, 0)
    this.play('player-climb', true)
  }

  private stopClimbing(): void {
    if (!this.isClimbing) {
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    this.isClimbing = false
    body.setAllowGravity(true)
  }

  private updateAnimation(onGround: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.hurtAnimTimer > 0) {
      this.play('player-hurt', true)
      return
    }

    if (this.isClimbing) {
      this.play('player-climb', true)
      return
    }

    const movingHorizontally = Math.abs(body.velocity.x) > MIN_MOVE_SPEED

    if (!onGround) {
      this.play('player-jump', true)
      return
    }

    if (movingHorizontally) {
      this.play('player-run', true)
    } else {
      this.play('player-idle', true)
    }
  }

  private updateInvulnerability(delta: number): void {
    if (this.hurtAnimTimer > 0) {
      this.hurtAnimTimer = Math.max(0, this.hurtAnimTimer - delta)
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta
      const flicker = Math.floor(this.invulnerableTimer / 100) % 2 === 0
      this.setAlpha(flicker ? 0.6 : 1)

      if (this.invulnerableTimer <= 0) {
        this.invulnerableTimer = 0
      }
    }

    if (this.invulnerableTimer <= 0) {
      this.setAlpha(1)

      if (this.hurtAnimTimer <= 0) {
        this.clearTint()
      }
    }
  }
}


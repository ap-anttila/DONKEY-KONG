import Phaser from 'phaser'

import Banana from '@/gameobjects/Banana'
import Goal from '@/gameobjects/Goal'
import Player from '@/gameobjects/Player'
import Hud from '@/ui/Hud'
import LevelBuilder from '@/world/LevelBuilder'
import { CAMERA_BOUNDS, GAME_HEIGHT, GAME_WIDTH } from '@/config/gameConfig'

const PARALLAX_FACTORS = [0.2]

export default class MainScene extends Phaser.Scene {
  private parallaxLayers: Phaser.GameObjects.TileSprite[] = []
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private terrain!: Phaser.Physics.Arcade.StaticGroup
  private hazards!: Phaser.Physics.Arcade.Group
  private climbZones!: Phaser.Physics.Arcade.StaticGroup
  private bananaGroup!: Phaser.Physics.Arcade.Group
  private bananas: Banana[] = []
  private goal!: Goal
  private hud!: Hud
  private levelStartTime = 0
  private gameOver = false
  private levelComplete = false
  private gameOverOverlay?: Phaser.GameObjects.Container
  private levelCompleteOverlay?: Phaser.GameObjects.Container
  private restartKey?: Phaser.Input.Keyboard.Key
  private pauseKey?: Phaser.Input.Keyboard.Key
  private debugKey?: Phaser.Input.Keyboard.Key
  private debugText?: Phaser.GameObjects.Text
  private pauseOverlay?: Phaser.GameObjects.Container
  private pauseResumeButton?: Phaser.GameObjects.Text
  private pauseMenuButton?: Phaser.GameObjects.Text
  private paused = false
  private debugEnabled = false
  private nextLevelKey?: Phaser.Input.Keyboard.Key
  private currentLevelIndex = 0
  private levelName = ''
  private soundtrack?: Phaser.Sound.BaseSound

  private readonly handleBananaPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    playerObject,
    bananaObject
  ) => {
    const player = playerObject as Player
    const banana = bananaObject as Banana

    if (!banana.active) {
      return
    }

    banana.collect()
    player.collectBanana()
  }

  private readonly handlePlayerHitHazard: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    playerObject,
    hazardObject
  ) => {
    const player = playerObject as Player

    if (player.isInvulnerable()) {
      return
    }

    player.takeDamage()

    const hazard = hazardObject as Phaser.Physics.Arcade.Sprite
    const direction = player.x >= hazard.x ? 1 : -1
    player.applyKnockback(280 * direction, -520)
  }

  private readonly handleLevelComplete: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerObject
  ) => {
    if (this.levelComplete || this.gameOver) {
      return
    }

    this.levelComplete = true
    const goalBody = this.goal.body as Phaser.Physics.Arcade.Body | null
    if (goalBody) {
      goalBody.enable = false
      goalBody.setVelocity(0, 0)
    }
    this.goal.playCompletionEffects()
    this.player.play('player-celebrate')
    this.paused = false
    this.showLevelCompleteOverlay(this.hasNextLevel())
    this.physics.world.pause()
    this.anims.pauseAll()
  }

  constructor() {
    super('MainScene')
  }

  init(data: { levelIndex?: number } = {}): void {
    const maxLevels = Math.max(1, LevelBuilder.getLevelCount())
    const requestedIndex = data.levelIndex ?? 0
    this.currentLevelIndex = Phaser.Math.Clamp(requestedIndex, 0, maxLevels - 1)

    this.resetSceneState()
  }

  preload(): void {
    this.generateBackgroundTextures()
    LevelBuilder.preload(this)
    Player.preload(this)
    Banana.preload(this)
    Hud.preload(this)

    if (!this.cache.audio.exists('soundtrack')) {
      this.load.audio('soundtrack', 'assets/sounds/soundtrack.mp3')
    }
  }

  create(): void {
    this.setupWorldBounds()
    this.createBackground()
    const levelObjects = LevelBuilder.build(this, this.currentLevelIndex)
    this.levelName = levelObjects.levelName

    this.terrain = levelObjects.platforms
    this.hazards = levelObjects.hazards
    this.climbZones = levelObjects.ladders
    this.bananaGroup = levelObjects.bananaGroup
    this.bananas = levelObjects.bananas
    this.goal = levelObjects.goal

    Player.createAnimations(this)
    this.createPlayer(levelObjects.spawnPoint.x, levelObjects.spawnPoint.y)
    this.registerInputs()
    this.configureCamera()
    this.createColliders()
    this.createHud()
    this.bindPlayerEvents()
    this.playSoundtrack()
    this.events.emit('scene-ready')
  }

  update(_time: number, delta: number): void {
    this.updateParallax()

    if (!this.player || !this.cursors) {
      return
    }

    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.physics.world.resume()
      this.scene.restart({ levelIndex: this.currentLevelIndex })
      return
    }

    if (this.pauseKey && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.togglePause()
    }

    if (this.debugKey && Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.toggleDebugOverlay()
    }

    if (this.levelComplete) {
      if (
        this.nextLevelKey &&
        Phaser.Input.Keyboard.JustDown(this.nextLevelKey) &&
        this.hasNextLevel()
      ) {
        this.scene.start('MainScene', { levelIndex: this.currentLevelIndex + 1 })
        return
      }

      this.updateDebugOverlay()
      return
    }

    if (this.gameOver) {
      this.updateDebugOverlay()
      return
    }

    if (this.paused) {
      this.updateDebugOverlay()
      return
    }

    const onLadder = this.physics.overlap(this.player, this.climbZones)
    this.player.update(this.cursors, delta, { onLadder })

    this.bananas.forEach((banana) => {
      if (banana.active) {
        banana.update(delta)
      }
    })

    const elapsedSeconds = (this.time.now - this.levelStartTime) / 1000
    this.hud.updateTimer(elapsedSeconds)
    this.updateDebugOverlay()
  }

  private hasNextLevel(): boolean {
    return this.currentLevelIndex + 1 < LevelBuilder.getLevelCount()
  }

  private resetSceneState(): void {
    this.gameOver = false
    this.levelComplete = false
    this.paused = false
    this.levelCompleteOverlay?.destroy()
    this.levelCompleteOverlay = undefined
    this.gameOverOverlay?.destroy()
    this.gameOverOverlay = undefined
    this.pauseOverlay?.destroy()
    this.pauseOverlay = undefined
    this.pauseResumeButton?.destroy()
    this.pauseResumeButton = undefined
    this.pauseMenuButton?.destroy()
    this.pauseMenuButton = undefined
    this.debugText?.destroy()
    this.debugText = undefined
    this.parallaxLayers = []

    if (this.physics.world) {
      this.physics.world.resume()
    }

    if (this.anims) {
      this.anims.resumeAll()
    }
  }

  private setupWorldBounds(): void {
    this.physics.world.setBounds(
      CAMERA_BOUNDS.minX,
      CAMERA_BOUNDS.minY,
      CAMERA_BOUNDS.maxX,
      CAMERA_BOUNDS.maxY
    )

    this.cameras.main.setBounds(
      CAMERA_BOUNDS.minX,
      CAMERA_BOUNDS.minY,
      CAMERA_BOUNDS.maxX,
      CAMERA_BOUNDS.maxY
    )
    this.cameras.main.setBackgroundColor('#87ceeb')
    this.cameras.main.roundPixels = true
  }

  private createPlayer(x: number, y: number): void {
    this.player = new Player(this, x, y)
  }

  private registerInputs(): void {
    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard plugin missing')
    }

    this.cursors = keyboard.createCursorKeys()
    this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1)
    this.nextLevelKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
  }

  private configureCamera(): void {
    this.cameras.main.startFollow(this.player, false, 0.1, 0.1)
    this.cameras.main.setDeadzone(GAME_WIDTH * 0.25, GAME_HEIGHT * 0.4)
  }

  private createColliders(): void {
    this.physics.add.collider(this.player, this.terrain)
    this.physics.add.collider(this.hazards, this.terrain)
    this.physics.add.collider(
      this.player,
      this.hazards,
      this.handlePlayerHitHazard,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.player,
      this.bananaGroup,
      this.handleBananaPickup,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.player,
      this.goal,
      this.handleLevelComplete,
      undefined,
      this
    )
  }

  private createHud(): void {
    this.hud = new Hud(this, this.player.getMaxHealth())
    this.hud.setHearts(this.player.getHealth())
    this.hud.setBananas(this.player.getBananas())
    this.levelStartTime = this.time.now
  }

  private bindPlayerEvents(): void {
    this.events.on('player-banana-collected', this.onBananaCountUpdated, this)
    this.events.on('player-damaged', this.onPlayerHealthUpdated, this)
    this.events.on('player-healed', this.onPlayerHealthUpdated, this)
    this.events.on('player-died', this.onPlayerDied, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupEvents, this)
  }

  private cleanupEvents(): void {
    this.events.off('player-banana-collected', this.onBananaCountUpdated, this)
    this.events.off('player-damaged', this.onPlayerHealthUpdated, this)
    this.events.off('player-healed', this.onPlayerHealthUpdated, this)
    this.events.off('player-died', this.onPlayerDied, this)
  }

  private togglePause(): void {
    if (this.gameOver || this.levelComplete) {
      return
    }

    this.paused = !this.paused

    if (this.paused) {
      this.physics.world.pause()
      this.anims.pauseAll()
      this.soundtrack?.pause()
      this.showPauseOverlay()
    } else {
      this.physics.world.resume()
      this.anims.resumeAll()
      this.soundtrack?.resume()
      this.hidePauseOverlay()
    }
  }

  private showPauseOverlay(): void {
    if (this.pauseOverlay) {
      return
    }

    const { width, height } = this.cameras.main
    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.35)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(170)

    const title = this.add
      .text(width / 2, height / 2 - 90, 'Paused', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(171)

    const subtitle = this.add
      .text(width / 2, height / 2 - 40, 'Press P to resume', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffeea1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(171)

    this.pauseResumeButton = this.createPauseButton(
      width / 2,
      height / 2 + 30,
      'Resume',
      () => this.togglePause()
    )

    this.pauseMenuButton = this.createPauseButton(width / 2, height / 2 + 100, 'Main Menu', () => {
      this.hidePauseOverlay()
      this.physics.world.resume()
      this.anims.resumeAll()
      this.stopSoundtrack()
      this.scene.start('MenuScene')
    })

    this.pauseOverlay = this.add.container(0, 0, [
      overlay,
      title,
      subtitle,
      this.pauseResumeButton,
      this.pauseMenuButton,
    ])
    this.pauseOverlay.setScrollFactor(0)
    this.pauseOverlay.setDepth(170)
  }

  private hidePauseOverlay(): void {
    if (!this.pauseOverlay) {
      return
    }

    this.pauseOverlay.destroy()
    this.pauseOverlay = undefined
    this.pauseResumeButton?.destroy()
    this.pauseResumeButton = undefined
    this.pauseMenuButton?.destroy()
    this.pauseMenuButton = undefined
  }

  private createPauseButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        color: '#1b1205',
        backgroundColor: '#ffd95b',
        padding: { x: 26, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(171)
      .setInteractive({ useHandCursor: true })

    button.on('pointerover', () => button.setStyle({ backgroundColor: '#ffb347' }))
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#ffd95b' }))
    button.on('pointerdown', onClick)

    return button
  }

  private playSoundtrack(): void {
    const soundtrack = this.ensureSoundtrack()

    if (!soundtrack) {
      return
    }

    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        const unlockedTrack = this.ensureSoundtrack()

        if (unlockedTrack && !unlockedTrack.isPlaying) {
          unlockedTrack.play()
        }
      })
      return
    }

    if (soundtrack.isPaused) {
      soundtrack.resume()
    } else if (!soundtrack.isPlaying) {
      soundtrack.play()
    }
  }

  private stopSoundtrack(): void {
    const target = this.soundtrack ?? this.sound.get('soundtrack') ?? undefined

    if (!target) {
      return
    }

    if (target.isPlaying || target.isPaused) {
      target.stop()
    }

    if (target === this.soundtrack) {
      this.soundtrack = undefined
    }
  }

  private ensureSoundtrack(): Phaser.Sound.BaseSound | undefined {
    if (this.soundtrack) {
      return this.soundtrack
    }

    const existing = this.sound.get('soundtrack')

    if (existing) {
      this.soundtrack = existing
      return this.soundtrack
    }

    if (!this.cache.audio.exists('soundtrack')) {
      return undefined
    }

    this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: 0.6 })

    return this.soundtrack
  }

  private toggleDebugOverlay(): void {
    this.debugEnabled = !this.debugEnabled

    if (this.debugEnabled) {
      this.debugText = this.add
        .text(16, GAME_HEIGHT - 140, '', {
          fontFamily: 'Courier Prime, monospace',
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#00000080',
          padding: { x: 8, y: 6 },
        })
        .setScrollFactor(0)
        .setDepth(160)
    } else if (this.debugText) {
      this.debugText.destroy()
      this.debugText = undefined
    }
  }

  private updateDebugOverlay(): void {
    if (!this.debugEnabled || !this.debugText) {
      return
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body

    this.debugText.setText(
      `Pos: ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}\n` +
        `Vel: ${body.velocity.x.toFixed(1)}, ${body.velocity.y.toFixed(1)}\n` +
        `Bananas: ${this.player.getBananas()}  Hearts: ${this.player.getHealth()}\n` +
        `Paused: ${this.paused}  GameOver: ${this.gameOver}`
    )
  }

  private onBananaCountUpdated(total: number): void {
    this.hud.setBananas(total)
  }

  private onPlayerHealthUpdated(hearts: number): void {
    this.hud.setHearts(hearts)
  }

  private onPlayerDied(): void {
    if (this.gameOver) {
      return
    }

    this.gameOver = true
    this.player.play('player-dead')
    this.showGameOverOverlay()
  }

  private showGameOverOverlay(): void {
    if (this.pauseOverlay) {
      this.hidePauseOverlay()
    }

    this.paused = false

    const { width, height } = this.cameras.main
    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(200)

    const text = this.add
      .text(width / 2, height / 2 - 20, 'Game Over', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '56px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)

    const subtitle = this.add
      .text(width / 2, height / 2 + 40, 'Press R to restart', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffeea1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)

    this.gameOverOverlay = this.add.container(0, 0, [overlay, text, subtitle])
    this.gameOverOverlay.setScrollFactor(0)
    this.gameOverOverlay.setDepth(200)

    this.physics.world.pause()
    this.anims.pauseAll()
  }

  private showLevelCompleteOverlay(hasNextLevel: boolean): void {
    if (this.pauseOverlay) {
      this.hidePauseOverlay()
    }

    const { width, height } = this.cameras.main
    const totalBananas = this.player.getBananas()
    const elapsedSeconds = (this.time.now - this.levelStartTime) / 1000
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = Math.floor(elapsedSeconds % 60)
    const tenths = Math.floor((elapsedSeconds % 1) * 10)
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.45)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(200)

    const title = this.add
      .text(width / 2, height / 2 - 80, 'Level Complete!', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '54px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)

    const levelSummary = this.levelName
      ? `Level ${this.currentLevelIndex + 1}: ${this.levelName}`
      : `Level ${this.currentLevelIndex + 1}`

    const subtitle = this.add
      .text(width / 2, height / 2 - 28, levelSummary, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffeea1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)

    const stats = this.add
      .text(
        width / 2,
        height / 2 + 12,
        `Bananas: ${totalBananas}\nTime: ${formattedTime}`,
        {
          fontFamily: 'Arial',
          fontSize: '26px',
          color: '#ffeea1',
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)

    const promptText = hasNextLevel
      ? 'Press Enter for next level\nPress R to retry'
      : 'Press R to restart'

    const prompt = this.add
      .text(width / 2, height / 2 + 110, promptText, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201)

    this.levelCompleteOverlay = this.add.container(0, 0, [overlay, title, subtitle, stats, prompt])
    this.levelCompleteOverlay.setScrollFactor(0)
    this.levelCompleteOverlay.setDepth(200)
  }

  private createBackground(): void {
    this.add
      .rectangle(0, 0, CAMERA_BOUNDS.maxX, GAME_HEIGHT, 0xb4e0ff)
      .setOrigin(0)
      .setScrollFactor(0)

    const groundLineY = GAME_HEIGHT - 64

    const backgroundKey = this.textures.exists('bg-layer-near')
      ? 'bg-layer-near'
      : this.textures.exists('bg-layer-mid')
        ? 'bg-layer-mid'
        : 'bg-layer-far'

    const backgroundLayer = this.add
      .tileSprite(0, 0, CAMERA_BOUNDS.maxX, GAME_HEIGHT, backgroundKey)
      .setOrigin(0, 0)

    this.parallaxLayers = [backgroundLayer]
    this.parallaxLayers.forEach((layer) => layer.setScrollFactor(0))

    this.add
      .rectangle(0, groundLineY, CAMERA_BOUNDS.maxX, GAME_HEIGHT - groundLineY, 0x2d1a10)
      .setOrigin(0)
      .setScrollFactor(0.9)
  }

  private updateParallax(): void {
    const scrollX = this.cameras.main.scrollX

    this.parallaxLayers.forEach((layer, index) => {
      const factor = PARALLAX_FACTORS[index] ?? 0.1
      layer.tilePositionX = scrollX * factor
    })
  }

  private generateBackgroundTextures(): void {
    const layerConfigs = [
      {
        key: 'bg-layer-far',
        assetFile: 'bg_layer-far.jpeg',
        topColor: 0x6f90bf,
        bottomColor: 0x5474a3,
        addHighlights: false,
      },
      {
        key: 'bg-layer-mid',
        assetFile: 'bg_layer-mid.jpeg',
        topColor: 0x4f704e,
        bottomColor: 0x345237,
        addHighlights: false,
      },
      {
        key: 'bg-layer-near',
        assetFile: 'bg_layer-near.jpeg',
        topColor: 0x3d3325,
        bottomColor: 0x2c241a,
        addHighlights: true,
      },
    ] as const

    const pendingFallbacks = layerConfigs.filter((config) => {
      if (this.textures.exists(config.key)) {
        return false
      }

      this.load.image(config.key, `assets/backgrounds/${config.assetFile}`)
      return true
    })

    if (pendingFallbacks.length === 0) {
      return
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      pendingFallbacks.forEach((config) => {
        if (!this.textures.exists(config.key)) {
          this.createLayerTexture(
            config.key,
            config.topColor,
            config.bottomColor,
            config.addHighlights
          )
        }
      })
    })
  }

  private createLayerTexture(
    key: string,
    topColor: number,
    bottomColor: number,
    addHighlights = false
  ): void {
    const width = 512
    const height = 256

    const graphics = this.add.graphics()
    graphics.setVisible(false)

    graphics.fillGradientStyle(
      topColor,
      topColor,
      bottomColor,
      bottomColor,
      1,
      1,
      1,
      1
    )
    graphics.fillRect(0, 0, width, height)

    if (addHighlights) {
      graphics.fillStyle(0x56422c, 0.8)
      for (let i = 0; i < 6; i += 1) {
        const baseX = 40 + i * 80
        graphics.fillEllipse(baseX, height - 60, 160, 80)
      }
    } else {
      graphics.fillStyle(0xffffff, 0.08)
      for (let i = 0; i < 5; i += 1) {
        const baseX = 30 + i * 100
        graphics.fillCircle(baseX, height / 3, 40)
      }
    }

    graphics.generateTexture(key, width, height)
    graphics.destroy()
  }
}


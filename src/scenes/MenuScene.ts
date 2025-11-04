import Phaser from 'phaser'

export default class MenuScene extends Phaser.Scene {
  private startButton?: Phaser.GameObjects.Text

  private quitButton?: Phaser.GameObjects.Text

  private quitOverlay?: Phaser.GameObjects.Container

  constructor() {
    super('MenuScene')
  }

  create(): void {
    const { width, height } = this.scale

    this.add.rectangle(0, 0, width, height, 0x1c1c1f, 0.92).setOrigin(0)

    this.add
      .text(width / 2, height * 0.2, 'DONKEY KONG', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '64px',
        color: '#ffd95b',
        stroke: '#3a1f07',
        strokeThickness: 6,
      })
      .setOrigin(0.5)

    const instructions = [
      'Controls:',
      '← / → : Move',
      '↑ or Space : Jump / Climb up',
      '↓ : Climb down',
      'P : Pause',
      'R : Restart current level',
      'Enter : Advance after completing a level',
    ]

    this.add
      .text(width / 2, height * 0.45, instructions.join('\n'), {
        fontFamily: 'Arial',
        fontSize: '26px',
        color: '#f4f4f4',
        align: 'center',
      })
      .setOrigin(0.5)

    this.startButton = this.createButton(width / 2, height * 0.7, 'Start Game', () =>
      this.handleStartGame()
    )

    this.quitButton = this.createButton(width / 2, height * 0.82, 'Quit', () =>
      this.handleQuit()
    )

    this.input.keyboard?.on('keydown-ENTER', this.handleStartGame, this)
    this.input.keyboard?.on('keydown-Q', this.handleQuit, this)
    this.input.keyboard?.on('keydown-ESC', this.handleQuit, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupInputs, this)
  }

  private cleanupInputs(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleStartGame, this)
    this.input.keyboard?.off('keydown-Q', this.handleQuit, this)
    this.input.keyboard?.off('keydown-ESC', this.handleQuit, this)
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '32px',
        color: '#1b1205',
        backgroundColor: '#ffd95b',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    button.on('pointerover', () => {
      button.setStyle({ backgroundColor: '#ffb347' })
    })

    button.on('pointerout', () => {
      button.setStyle({ backgroundColor: '#ffd95b' })
    })

    button.on('pointerdown', onClick)

    return button
  }

  private handleStartGame(): void {
    this.startButton?.disableInteractive()
    this.quitButton?.disableInteractive()

    const camera = this.cameras.main
    camera.fadeOut(250, 0, 0, 0)
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('MainScene', { levelIndex: 0 })
    })
  }

  private handleQuit(): void {
    if (this.quitOverlay) {
      return
    }

    this.startButton?.disableInteractive()
    this.quitButton?.disableInteractive()

    const { width, height } = this.scale

    const overlayBackground = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0)

    const message = this.add
      .text(width / 2, height / 2, 'Thanks for playing!\nPlease close the tab to quit.', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)

    this.quitOverlay = this.add.container(0, 0, [overlayBackground, message])

    if (typeof window !== 'undefined' && typeof window.close === 'function') {
      // Attempt to close the window; will only work if the tab was opened programmatically.
      window.close()
    }
  }
}



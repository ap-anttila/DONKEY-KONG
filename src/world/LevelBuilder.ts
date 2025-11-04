import Phaser from 'phaser'

import { CAMERA_BOUNDS, GAME_HEIGHT } from '@/config/gameConfig'
import Banana from '@/gameobjects/Banana'
import Barrel from '@/gameobjects/Barrel'
import Goal from '@/gameobjects/Goal'
import type { BarrelConfig } from '@/gameobjects/Barrel'

type PlatformConfig = {
  x: number
  y: number
  tiles: number
}

type LadderEndpoint = 'ground' | { platformIndex: number }

type LadderConfig = {
  x: number
  lower: LadderEndpoint
  upper: LadderEndpoint
}

type BananaConfig = {
  x: number
  y: number
}

interface LevelDefinition {
  name: string
  spawn: { x: number; y: number }
  goal: { x: number; y: number }
  platforms: PlatformConfig[]
  ladders: LadderConfig[]
  bananas: BananaConfig[]
  barrels: BarrelConfig[]
}

const GROUND_TILE_WIDTH = 128
const TILE_HEIGHT = 64
const HALF_TILE_HEIGHT = TILE_HEIGHT / 2
const GROUND_Y = GAME_HEIGHT - 32
const GROUND_SURFACE_Y = GROUND_Y - HALF_TILE_HEIGHT

const createPlatform = (left: number, y: number, tiles: number): PlatformConfig => ({
  x: left + GROUND_TILE_WIDTH / 2,
  y,
  tiles,
})

const getPlatformSpan = (platform: PlatformConfig) => {
  const left = platform.x - GROUND_TILE_WIDTH / 2
  const right = platform.x + (platform.tiles - 0.5) * GROUND_TILE_WIDTH
  return { left, right, width: right - left }
}

const getPlatformTop = (platform: PlatformConfig): number => platform.y - HALF_TILE_HEIGHT

const getPlatformMidpointX = (platform: PlatformConfig): number => {
  const span = getPlatformSpan(platform)
  return span.left + span.width / 2
}

const getOverlapCenterX = (a: PlatformConfig, b: PlatformConfig): number => {
  const spanA = getPlatformSpan(a)
  const spanB = getPlatformSpan(b)
  const left = Math.max(spanA.left, spanB.left)
  const right = Math.min(spanA.right, spanB.right)

  if (right <= left) {
    return getPlatformMidpointX(a)
  }

  return left + (right - left) / 2
}

const ladderBetweenPlatforms = (
  platforms: PlatformConfig[],
  aIndex: number,
  bIndex: number
): LadderConfig => {
  const a = platforms[aIndex]
  const b = platforms[bIndex]
  const aTop = getPlatformTop(a)
  const bTop = getPlatformTop(b)

  const lowerIndex = aTop > bTop ? aIndex : bIndex
  const upperIndex = lowerIndex === aIndex ? bIndex : aIndex

  return {
    x: getOverlapCenterX(a, b),
    lower: { platformIndex: lowerIndex },
    upper: { platformIndex: upperIndex },
  }
}

const bananaOnPlatform = (
  platform: PlatformConfig,
  ratio = 0.5,
  verticalOffset = -48
): BananaConfig => {
  const span = getPlatformSpan(platform)
  const t = Math.max(0, Math.min(1, ratio))
  return {
    x: span.left + span.width * t,
    y: getPlatformTop(platform) + verticalOffset,
  }
}

const bananaCluster = (
  platform: PlatformConfig,
  ratios: number[],
  verticalOffset = -48
): BananaConfig[] => ratios.map((ratio) => bananaOnPlatform(platform, ratio, verticalOffset))

const barrelOnGround = (x: number, speed: number): BarrelConfig => ({
  x,
  y: GROUND_SURFACE_Y - 28,
  speed,
})

const barrelOnPlatform = (
  platform: PlatformConfig,
  ratio: number,
  speed: number,
  verticalOffset = -28
): BarrelConfig => {
  const span = getPlatformSpan(platform)
  const t = Math.max(0, Math.min(1, ratio))
  return {
    x: span.left + span.width * t,
    y: getPlatformTop(platform) + verticalOffset,
    speed,
  }
}

const level1Platforms: PlatformConfig[] = [
  createPlatform(512, GAME_HEIGHT - 220, 3),
  createPlatform(832, GAME_HEIGHT - 340, 3),
  createPlatform(1168, GAME_HEIGHT - 260, 4),
  createPlatform(1648, GAME_HEIGHT - 420, 3),
  createPlatform(2000, GAME_HEIGHT - 320, 4),
  createPlatform(2448, GAME_HEIGHT - 240, 5),
  createPlatform(3008, GAME_HEIGHT - 360, 4),
  createPlatform(3472, GAME_HEIGHT - 280, 4),
  createPlatform(3920, GAME_HEIGHT - 440, 3),
  createPlatform(4240, GAME_HEIGHT - 300, 4),
  createPlatform(4704, GAME_HEIGHT - 220, 5),
  createPlatform(5280, GAME_HEIGHT - 320, 4),
  createPlatform(5760, GAME_HEIGHT - 220, 4),
]

const level1Ladders: LadderConfig[] = [
  {
    x: getPlatformMidpointX(level1Platforms[0]),
    lower: 'ground',
    upper: { platformIndex: 0 },
  },
  ladderBetweenPlatforms(level1Platforms, 0, 1),
  ladderBetweenPlatforms(level1Platforms, 1, 2),
  ladderBetweenPlatforms(level1Platforms, 2, 3),
  ladderBetweenPlatforms(level1Platforms, 3, 4),
  ladderBetweenPlatforms(level1Platforms, 4, 5),
  ladderBetweenPlatforms(level1Platforms, 5, 6),
  ladderBetweenPlatforms(level1Platforms, 6, 7),
  ladderBetweenPlatforms(level1Platforms, 7, 8),
  ladderBetweenPlatforms(level1Platforms, 8, 9),
  ladderBetweenPlatforms(level1Platforms, 9, 10),
  ladderBetweenPlatforms(level1Platforms, 10, 11),
  ladderBetweenPlatforms(level1Platforms, 11, 12),
]

const level1Bananas: BananaConfig[] = [
  ...bananaCluster(level1Platforms[0], [0.25, 0.6]),
  ...bananaCluster(level1Platforms[1], [0.45], -52),
  ...bananaCluster(level1Platforms[2], [0.2, 0.5, 0.8]),
  ...bananaCluster(level1Platforms[3], [0.5], -56),
  ...bananaCluster(level1Platforms[4], [0.2, 0.85]),
  ...bananaCluster(level1Platforms[5], [0.25, 0.5, 0.75]),
  ...bananaCluster(level1Platforms[6], [0.6], -48),
  ...bananaCluster(level1Platforms[7], [0.35, 0.8]),
  ...bananaCluster(level1Platforms[8], [0.5], -52),
  ...bananaCluster(level1Platforms[9], [0.3, 0.7]),
  ...bananaCluster(level1Platforms[10], [0.15, 0.45, 0.75]),
  ...bananaCluster(level1Platforms[11], [0.35, 0.9], -50),
  ...bananaCluster(level1Platforms[12], [0.55]),
  { x: 420, y: GROUND_SURFACE_Y - 36 },
  { x: 980, y: GROUND_SURFACE_Y - 32 },
]

const level1Barrels: BarrelConfig[] = [
  barrelOnGround(1150, 160),
  barrelOnPlatform(level1Platforms[4], 0.7, 190),
  barrelOnPlatform(level1Platforms[7], 0.4, 210),
  barrelOnGround(3600, 200),
  barrelOnPlatform(level1Platforms[10], 0.6, 220),
]

const level1Definition: LevelDefinition = {
  name: 'Jungle Approach',
  spawn: { x: 180, y: GAME_HEIGHT - 200 },
  goal: {
    x: getPlatformMidpointX(level1Platforms[level1Platforms.length - 1]),
    y: level1Platforms[level1Platforms.length - 1].y,
  },
  platforms: level1Platforms,
  ladders: level1Ladders,
  bananas: level1Bananas,
  barrels: level1Barrels,
}

const level2Platforms: PlatformConfig[] = [
  createPlatform(480, GAME_HEIGHT - 260, 4),
  createPlatform(928, GAME_HEIGHT - 380, 3),
  createPlatform(1248, GAME_HEIGHT - 320, 4),
  createPlatform(1696, GAME_HEIGHT - 460, 3),
  createPlatform(2016, GAME_HEIGHT - 300, 4),
  createPlatform(2464, GAME_HEIGHT - 220, 4),
  createPlatform(2912, GAME_HEIGHT - 380, 4),
  createPlatform(3360, GAME_HEIGHT - 240, 5),
  createPlatform(3936, GAME_HEIGHT - 360, 4),
  createPlatform(4384, GAME_HEIGHT - 220, 5),
  createPlatform(4960, GAME_HEIGHT - 340, 4),
  createPlatform(5408, GAME_HEIGHT - 420, 4),
  createPlatform(5856, GAME_HEIGHT - 300, 4),
]

const level2Ladders: LadderConfig[] = [
  {
    x: getPlatformMidpointX(level2Platforms[0]),
    lower: 'ground',
    upper: { platformIndex: 0 },
  },
  ladderBetweenPlatforms(level2Platforms, 0, 1),
  ladderBetweenPlatforms(level2Platforms, 1, 2),
  ladderBetweenPlatforms(level2Platforms, 2, 3),
  ladderBetweenPlatforms(level2Platforms, 3, 4),
  {
    x: getPlatformMidpointX(level2Platforms[5]),
    lower: 'ground',
    upper: { platformIndex: 5 },
  },
  ladderBetweenPlatforms(level2Platforms, 4, 5),
  ladderBetweenPlatforms(level2Platforms, 5, 6),
  ladderBetweenPlatforms(level2Platforms, 6, 7),
  ladderBetweenPlatforms(level2Platforms, 7, 8),
  {
    x: getPlatformMidpointX(level2Platforms[9]),
    lower: 'ground',
    upper: { platformIndex: 9 },
  },
  ladderBetweenPlatforms(level2Platforms, 8, 9),
  ladderBetweenPlatforms(level2Platforms, 9, 10),
  ladderBetweenPlatforms(level2Platforms, 10, 11),
  ladderBetweenPlatforms(level2Platforms, 11, 12),
]

const level2Bananas: BananaConfig[] = [
  ...bananaCluster(level2Platforms[0], [0.3, 0.7]),
  ...bananaCluster(level2Platforms[1], [0.5], -54),
  ...bananaCluster(level2Platforms[2], [0.2, 0.8]),
  ...bananaCluster(level2Platforms[3], [0.5], -58),
  ...bananaCluster(level2Platforms[4], [0.25, 0.5, 0.75]),
  ...bananaCluster(level2Platforms[5], [0.35, 0.65], -46),
  ...bananaCluster(level2Platforms[6], [0.4, 0.9], -52),
  ...bananaCluster(level2Platforms[7], [0.2, 0.5, 0.8]),
  ...bananaCluster(level2Platforms[8], [0.45], -56),
  ...bananaCluster(level2Platforms[9], [0.25, 0.5, 0.75]),
  ...bananaCluster(level2Platforms[10], [0.35, 0.85], -48),
  ...bananaCluster(level2Platforms[11], [0.4, 0.6], -58),
  ...bananaCluster(level2Platforms[12], [0.55]),
  { x: 760, y: GROUND_SURFACE_Y - 36 },
  { x: 3200, y: GROUND_SURFACE_Y - 36 },
  { x: 5200, y: GROUND_SURFACE_Y - 36 },
]

const level2Barrels: BarrelConfig[] = [
  barrelOnGround(900, 180),
  barrelOnPlatform(level2Platforms[2], 0.6, 220),
  barrelOnPlatform(level2Platforms[4], 0.3, 240),
  barrelOnGround(2800, 210),
  barrelOnPlatform(level2Platforms[7], 0.7, 260),
  barrelOnGround(3600, 230),
  barrelOnPlatform(level2Platforms[9], 0.5, 280),
  barrelOnPlatform(level2Platforms[11], 0.4, 300),
]

const level2Definition: LevelDefinition = {
  name: 'Treetop Gauntlet',
  spawn: { x: 180, y: GAME_HEIGHT - 200 },
  goal: {
    x: getPlatformMidpointX(level2Platforms[level2Platforms.length - 1]),
    y: level2Platforms[level2Platforms.length - 1].y,
  },
  platforms: level2Platforms,
  ladders: level2Ladders,
  bananas: level2Bananas,
  barrels: level2Barrels,
}

const LEVEL_DEFINITIONS: LevelDefinition[] = [level1Definition, level2Definition]

export interface LevelObjects {
  spawnPoint: Phaser.Math.Vector2
  platforms: Phaser.Physics.Arcade.StaticGroup
  hazards: Phaser.Physics.Arcade.Group
  bananas: Banana[]
  bananaGroup: Phaser.Physics.Arcade.Group
  ladders: Phaser.Physics.Arcade.StaticGroup
  goal: Goal
  levelName: string
}

export default class LevelBuilder {
  static preload(scene: Phaser.Scene): void {
    if (!scene.textures.exists('ground-block')) {
      LevelBuilder.createGroundTexture(scene)
    }

    if (!scene.textures.exists('platform-block')) {
      LevelBuilder.createPlatformTexture(scene)
    }

    if (!scene.textures.exists('ladder')) {
      LevelBuilder.createLadderTexture(scene)
    }

    Barrel.preload(scene)
    Goal.preload(scene)
  }

  static build(scene: Phaser.Scene, levelIndex = 0): LevelObjects {
    const level = LEVEL_DEFINITIONS[levelIndex] ?? LEVEL_DEFINITIONS[0]

    const platforms = scene.physics.add.staticGroup()
    const ladders = scene.physics.add.staticGroup()
    const bananaGroup = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    })

    const bananas: Banana[] = []

    LevelBuilder.createGround(platforms)
    LevelBuilder.createPlatforms(platforms, level)
    LevelBuilder.createLadders(scene, ladders, level)

    level.bananas.forEach((config) => {
      const banana = new Banana(scene, config.x, config.y)
      bananas.push(banana)
      bananaGroup.add(banana)
    })

    const hazards = scene.physics.add.group({
      runChildUpdate: true,
    })

    level.barrels.forEach((config) => {
      const barrel = new Barrel(scene, config)
      hazards.add(barrel)
    })

    const goal = new Goal(scene, level.goal.x, level.goal.y)

    const spawnPoint = new Phaser.Math.Vector2(level.spawn.x, level.spawn.y)

    return {
      spawnPoint,
      platforms,
      hazards,
      bananas,
      bananaGroup,
      ladders,
      goal,
      levelName: level.name,
    }
  }

  static getLevelCount(): number {
    return LEVEL_DEFINITIONS.length
  }

  private static createGround(platforms: Phaser.Physics.Arcade.StaticGroup): void {
    const tileCount = Math.ceil(CAMERA_BOUNDS.maxX / GROUND_TILE_WIDTH)

    for (let index = 0; index < tileCount; index += 1) {
      const tile = platforms.create(
        index * GROUND_TILE_WIDTH + GROUND_TILE_WIDTH / 2,
        GROUND_Y,
        'ground-block'
      ) as Phaser.Physics.Arcade.Sprite

      tile.refreshBody()
    }
  }

  private static createPlatforms(
    platforms: Phaser.Physics.Arcade.StaticGroup,
    level: LevelDefinition
  ): void {
    const ladderGaps = LevelBuilder.computeLadderGaps(level)

    const tolerance = GROUND_TILE_WIDTH * 0.1

    level.platforms.forEach((segment, index) => {
      const gaps = ladderGaps.get(index) ?? []

      for (let i = 0; i < segment.tiles; i += 1) {
        const tileCenterX = segment.x + i * GROUND_TILE_WIDTH
        const tileLeft = tileCenterX - GROUND_TILE_WIDTH / 2
        const tileRight = tileCenterX + GROUND_TILE_WIDTH / 2

        const shouldSkip = gaps.some((gapX) => gapX >= tileLeft - tolerance && gapX <= tileRight + tolerance)

        if (shouldSkip) {
          continue
        }

        const tile = platforms.create(tileCenterX, segment.y, 'platform-block') as Phaser.Physics.Arcade.Sprite
        tile.refreshBody()
      }
    })
  }

  private static computeLadderGaps(level: LevelDefinition): Map<number, number[]> {
    const gaps = new Map<number, number[]>()

    const registerGap = (endpoint: LadderEndpoint, x: number): void => {
      if (endpoint === 'ground') {
        return
      }

      const list = gaps.get(endpoint.platformIndex)
      if (list) {
        list.push(x)
      } else {
        gaps.set(endpoint.platformIndex, [x])
      }
    }

    level.ladders.forEach((ladder) => {
      registerGap(ladder.lower, ladder.x)
      registerGap(ladder.upper, ladder.x)
    })

    return gaps
  }

  private static createLadders(
    scene: Phaser.Scene,
    ladders: Phaser.Physics.Arcade.StaticGroup,
    level: LevelDefinition
  ): void {
    level.ladders.forEach((config) => {
      const lowerSurface = LevelBuilder.resolveSurfaceY(level, config.lower)
      const upperSurface = LevelBuilder.resolveSurfaceY(level, config.upper)
      const bottom = Math.max(lowerSurface, upperSurface)
      const top = Math.min(lowerSurface, upperSurface)
      const height = bottom - top

      if (height <= 24) {
        return
      }

      const centerY = top + height / 2
      const ladder = ladders.create(config.x, centerY, 'ladder') as Phaser.Physics.Arcade.Sprite
      ladder.setDisplaySize(64, height)
      ladder.setDepth(5)
      ladder.setAlpha(0)
      ladder.refreshBody()

      scene.add
        .image(config.x, centerY, 'ladder')
        .setDisplaySize(64, height)
        .setDepth(4)
    })
  }

  private static resolveSurfaceY(level: LevelDefinition, endpoint: LadderEndpoint): number {
    if (endpoint === 'ground') {
      return GROUND_SURFACE_Y
    }

    const platform = level.platforms[endpoint.platformIndex]
    if (!platform) {
      throw new Error(`Invalid ladder platform index: ${endpoint.platformIndex}`)
    }

    return getPlatformTop(platform)
  }

  private static createGroundTexture(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics()
    graphics.setVisible(false)
    graphics.fillStyle(0x5a3b1f, 1)
    graphics.fillRect(0, 16, GROUND_TILE_WIDTH, 48)
    graphics.fillStyle(0x784e27, 1)
    graphics.fillRect(0, 0, GROUND_TILE_WIDTH, 24)
    graphics.fillStyle(0x925f33, 1)
    graphics.fillRect(0, 0, GROUND_TILE_WIDTH, 12)
    graphics.generateTexture('ground-block', GROUND_TILE_WIDTH, 64)
    graphics.destroy()
  }

  private static createPlatformTexture(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics()
    graphics.setVisible(false)
    graphics.fillStyle(0x3a2f1f, 1)
    graphics.fillRoundedRect(0, 12, GROUND_TILE_WIDTH, 36, 10)
    graphics.fillStyle(0x684e2d, 1)
    graphics.fillRect(0, 0, GROUND_TILE_WIDTH, 22)
    graphics.generateTexture('platform-block', GROUND_TILE_WIDTH, 64)
    graphics.destroy()
  }

  private static createLadderTexture(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics()
    graphics.setVisible(false)
    graphics.fillStyle(0xa87b3b, 1)
    graphics.fillRect(24, 0, 16, 256)
    graphics.fillRect(48, 0, 16, 256)
    graphics.fillStyle(0xcfa864, 1)
    for (let i = 0; i < 12; i += 1) {
      graphics.fillRect(16, i * 20 + 8, 48, 6)
    }
    graphics.generateTexture('ladder', 80, 256)
    graphics.destroy()
  }
}


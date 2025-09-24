// src/scenes/MainScene.ts
import { GameEventBus } from '../utils/GameEventBus';
import { ChunkManager } from './chunks/ChunkManager';
import { Player } from './entities/Player';
import { AssetLoader } from '../utils/assetLoader';

export class MainScene extends Phaser.Scene {
  private eventBus: GameEventBus;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private chunkManager!: ChunkManager;
  private playerChunk: { x: number; y: number } = { x: 0, y: 0 };
  private itemsGroup!: Phaser.Physics.Arcade.Group;
  private obstaclesGroup!: Phaser.Physics.Arcade.StaticGroup;
  private currentItem: Phaser.Types.Physics.Arcade.GameObjectWithStaticBody | null = null;
  joystickBase!: Phaser.GameObjects.Arc;
  joystickThumb!: Phaser.GameObjects.Arc;
  public container!: Phaser.GameObjects.Container;

  private terrainSpeedMultipliers: { [key: number]: number } = {
    0: 0,      // WATER - полная остановка
    1: 0.8,    // SAND - медленнее
    4: 1.0,    // GRASS - нормальная скорость
    2: 0.7,    // FOREST - медленнее из-за деревьев
    3: 0.5,    // MOUNTAIN - очень медленно
  };

  private currentTerrainType: number = 2; // По умолчанию трава

  constructor() {
    super('MainScene');
    this.eventBus = GameEventBus.getInstance();
  }

  async preload() {
    await AssetLoader.loadAssets(this);
    this.loadDefaultAssets();
  }

  private loadDefaultAssets(): void {
    // Проверяем и загружаем обязательные assets если они не загрузились автоматически
    const requiredAssets = ['player', 'star', 'items'];

    requiredAssets.forEach(asset => {
      if (!this.textures.exists(asset)) {
        // Загружаем стандартные assets
        switch (asset) {
          case 'star':
            this.load.image('star', '/star.png');
            break;
          case 'items':
            this.load.spritesheet('items', '/roguelikeSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
            break;
        }
      }
    });

    this.load.spritesheet("tiles", "/roguelikeSheet_transparent.png", { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet("player", "/character_maleAdventurer_sheet.png", { frameWidth: 96, frameHeight: 128 });
  }

  create() {

    this.physics.world.setBounds(-Number.MAX_SAFE_INTEGER / 2, -Number.MAX_SAFE_INTEGER / 2, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

    // Создаем группы для предметов и препятствий
    this.itemsGroup = this.physics.add.group();
    this.obstaclesGroup = this.physics.add.staticGroup(); // Статическая группа для неподвижных препятствий

    this.chunkManager = new ChunkManager(this, this.itemsGroup, this.obstaclesGroup, 40, 32);
    this.player = new Player(this, 0, 0);

    this.player.createAnimations(this);

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cursors = this.input!.keyboard!.createCursorKeys();

    this.createUI();
    this.createPlaceholderSprites(); // Создаем временные спрайты если нужно
    this.generateInitialChunks();
    this.setupEventListeners();
    this.setupCollisions();
    this.createJoystick();

  }

  joystickData!: any;

  createJoystick() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2 + height / 4;

    const size = 40;
    const alpha = 0.3;

    this.joystickBase = this.add.circle(centerX, centerY, size, 0x0000ff, 0.1).setScrollFactor(0).setDepth(2000);
    this.joystickThumb = this.add.circle(centerX, centerY, size / 1.5, 0x00ff00, alpha).setScrollFactor(0).setInteractive().setDepth(2001);
    this.container = this.add.container(0, 0, [this.joystickBase, this.joystickThumb]).setScrollFactor(0).setDepth(20000);

    // Включаем drag
    this.input.setDraggable(this.joystickThumb);

    this.input.on("drag", (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      console.log("pointer", pointer);
      if (gameObject !== this.joystickThumb) return;

      const dx = dragX - this.joystickBase.x;
      const dy = dragY - this.joystickBase.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = size;
      const angle = Math.atan2(dy, dx);

      const clampedDistance = Math.min(distance, maxDistance);

      this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * clampedDistance;
      this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * clampedDistance;

      this.joystickData = {
        force: clampedDistance / maxDistance,
        angle,
        active: true
      };
    });

    this.input.on("pointerup", () => {
      this.joystickThumb.x = this.joystickBase.x;
      this.joystickThumb.y = this.joystickBase.y;
      this.joystickData = { active: false, force: 0, angle: 0 };
    });
  }


  private createPlaceholderSprites(): void {
    // Создаем простые графические спрайты для препятствий если они не загрузились
    const createPlaceholder = (color: number, key: string) => {
      if (!this.textures.exists(key)) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color);
        graphics.fillRect(0, 0, 64, 64);
        graphics.generateTexture(key, 64, 64);
        graphics.destroy();
      }
    };

    createPlaceholder(0x228822, 'tree'); // Зеленый для деревьев
    createPlaceholder(0xf0f0f8, 'rock'); // Серый для камней
    createPlaceholder(0x44aa44, 'bush'); // Светло-зеленый для кустов
  }

  private createUI(): void {
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(1000);

    const chunkText = this.add.text(20, 60, 'Chunk: [0, 0]', {
      fontSize: '16px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(1000);

    // Добавляем отладочную информацию
    const debugText = this.add.text(20, 100, 'Items: 0, Obstacles: 0', {
      fontSize: '14px',
      color: '#ff9900',
      stroke: '#000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(1000);

    this.events.on('update', () => {
      chunkText.setText(`Chunk: [${this.playerChunk.x}, ${this.playerChunk.y}]`);
      debugText.setText(`Items: ${this.itemsGroup.getLength()}, Obstacles: ${this.obstaclesGroup.getLength()}`);
    });

    this.eventBus.on('doAction', ({ action }: any) => {
      console.log("action", action);
      this.time.delayedCall(100, () => {
        if (this.currentItem) {
          this.currentItem.destroy();
        }
      });
      this.eventBus.emit('disableActions');
      this.events.emit('showMessage', 'Дерево срублено!');
      if (this.currentItem?.active) {
        this.createWoodCollectionEffect(this.currentItem.body.x + 20, this.currentItem.body.y + 20);
      }
    });
  }

  private generateInitialChunks(): void {
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        this.chunkManager.generateChunk(x, y);
      }
    }
  }

  private setupEventListeners(): void {
    this.eventBus.on('addScore', (data: { points: number }) => {
      this.score += data.points;
      this.scoreText.setText(`Score: ${this.score}`);
    });

    this.events.on('showMessage', (message: string) => {
      // Временное отображение сообщения в консоли
      console.log('Message:', message);

      // Можно добавить всплывающее сообщение на экране
      const messageText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 100,
        message,
        {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 10, y: 5 }
        }
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2000);

      this.tweens.add({
        targets: messageText,
        alpha: 0,
        duration: 1000,
        onComplete: () => messageText.destroy()
      });
    });
  }

  private setupCollisions(): void {
    // Коллизии с предметами
    this.physics.add.overlap(
      this.player.sprite,
      this.itemsGroup,
      this.collectItem.bind(this),
      undefined,
      this
    );

    // Коллизии с препятствиями (игрок не может проходить сквозь твердые препятствия)
    this.physics.add.collider(
      this.player.sprite,
      this.obstaclesGroup,
      this.handleObstacleCollision.bind(this),
      this.checkIfObstacleIsSolid.bind(this),
      this
    );
  }

  private checkIfObstacleIsSolid(player: any, obstacle: any): boolean {
    console.log('player', player);
    return obstacle.getData('isSolid') === true;
  }

  private handleObstacleCollision(player: any, obstacle: any): void {
    console.log('player', player);
    // Устанавливаем состояние столкновения для игрока
    this.player.setColliding(true);

    // Можно добавить дополнительную логику при столкновении
    const obstacleType = obstacle.getData('type');
    if (obstacleType === 'tree' || obstacleType === 'bush' || obstacleType === 'stone' || obstacleType === 'mountain' ) {
      this.currentItem = obstacle;
      this.eventBus.emit('enableAction', { action: obstacleType });
    }
  }

  private collectItem(player: any, item: any): void {
    console.log('player', player);
    if (item.getData('collected')) return;

    const itemType = item.getData('itemType') || item.getData('type');
    const quantity = item.getData('itemQuantity') || 1;
    const isEdible = item.getData('isEdible');
    const healthEffect = item.getData('healthEffect') || 0;

    // Отправляем событие в стор
    this.eventBus.emit('itemCollected', {
      player,
      itemType,
      quantity,
      isEdible,
      healthEffect,
      position: { x: item.x, y: item.y }
    });

    switch (itemType) {
      case 'gold_ore':
        this.events.emit('showMessage', 'Найдена золотая жила!');
        // this.createSparkleEffect(item.x, item.y, 0xffd700);
        break;

      case 'wood':
        this.events.emit('showMessage', `Собрано дров: +${quantity}`);
        // this.createWoodCollectionEffect(item.x, item.y);
        break;

      case 'stone':
        this.events.emit('showMessage', `Подобран камень: +${quantity}`);
        // this.createSparkleEffect(item.x, item.y, 0x888888);
        break;

      case 'star':
        this.events.emit('showMessage', '⭐ Найдена звезда! +10 очков');
        // this.createSparkleEffect(item.x, item.y, 0xffff00);
        break;

      case 'mushroom':
      case 'mushroom_poison':
      case 'mushroom_rare':
        // Обработка всех типов грибов
        if (!isEdible) {
          this.events.emit('showMessage', '⚠️ Ядовитый гриб! Будьте осторожны');
          // this.createPoisonEffect(item.x, item.y);
        } else if (healthEffect > 15) {
          this.events.emit('showMessage', '🎯 Ценный гриб! +' + healthEffect + ' HP');
          // this.createHealEffect(item.x, item.y);
        } else {
          this.events.emit('showMessage', '🍄 Собран гриб: +' + healthEffect + ' HP');
          // this.createMushroomEffect(item.x, item.y);
        }
        break;

      default:
        this.events.emit('showMessage', `Подобран: ${this.getItemName(itemType)}`);
        // Дефолтный эффект для неизвестных предметов
        // this.createSparkleEffect(item.x, item.y, 0xffffff);
        break;
    }

    item.setData('collected', true);
    item.disableBody(true, true);

    this.time.delayedCall(100, () => {
      if (item.active) {
        item.destroy();
      }
    });
  }

  // private createHealEffect(x: number, y: number): void {
  //   const heal = this.add.particles(x, y, 'items', {
  //     speed: { min: 40, max: 100 },
  //     angle: { min: 270, max: 360 },
  //     scale: { start: 0.4, end: 0 },
  //     lifespan: 1000,
  //     quantity: 10,
  //     tint: 0x4caf50
  //   });
  //   this.time.delayedCall(1000, () => heal.destroy());
  // }

  // private createPoisonEffect(x: number, y: number): void {
  //   const poison = this.add.particles(x, y, 'items', {
  //     speed: { min: 20, max: 60 },
  //     angle: { min: 0, max: 360 },
  //     scale: { start: 0.3, end: 0 },
  //     lifespan: 1500,
  //     quantity: 8,
  //     tint: 0xff5252
  //   });
  //   this.time.delayedCall(1500, () => poison.destroy());
  // }

  // private createMushroomEffect(x: number, y: number): void {
  //   const spores = this.add.particles(x, y, 'items', {
  //     speed: { min: 30, max: 80 },
  //     angle: { min: 180, max: 360 },
  //     scale: { start: 0.2, end: 0 },
  //     lifespan: 1200,
  //     quantity: 6,
  //     tint: 0x8bc34a
  //   });
  //   this.time.delayedCall(1200, () => spores.destroy());
  // }

  private createWoodCollectionEffect(x: number, y: number): void {
    const chips = this.add.particles(x, y, 'tree', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      blendMode: 'NORMAL',
      lifespan: 300,
      quantity: 3,
      tint: 0x00ff00
    });

    this.time.delayedCall(800, () => chips.destroy());
  }

  // private createSparkleEffect(x: number, y: number, color: number): void {
  //   const particles = this.add.particles(x, y, 'items', {
  //     speed: 100,
  //     scale: { start: 0.5, end: 0 },
  //     blendMode: 'ADD',
  //     lifespan: 1000,
  //     quantity: 10,
  //     color: [color],
  //     tint: color,
  //   });

  //   this.time.delayedCall(1000, () => particles.destroy());
  // }

  private getItemName(itemType: string): string {
    const names: { [key: string]: string } = {
      'star': 'Звезда',
      'wood': 'Дерево',
      'stone': 'Камень'
    };
    return names[itemType] || 'Предмет';
  }

  update() {
    this.updateTerrainUnderPlayer(); // Определяем тип тайла под игроком
    this.handleMovement();
    this.updateChunks();
    this.player.setColliding(false);
  }

  private updateTerrainUnderPlayer(): void {
    if (!this.chunkManager) return;

    // Получаем мировые координаты игрока
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;

    // Определяем тип тайла под игроком
    this.currentTerrainType = this.chunkManager.getTerrainTypeAt(playerX, playerY);
  }


  private handleMovement(): void {
    let velocityX = 0;
    let velocityY = 0;
    const baseSpeed = 100;

    // Получаем множитель скорости для текущего типа terrain
    const speedMultiplier = this.terrainSpeedMultipliers[this.currentTerrainType] || 1.0;
    const currentSpeed = baseSpeed * speedMultiplier;

    // Обычное управление
    if (this.cursors.left.isDown) velocityX = -currentSpeed;
    if (this.cursors.right.isDown) velocityX = currentSpeed;
    if (this.cursors.up.isDown) velocityY = -currentSpeed;
    if (this.cursors.down.isDown) velocityY = currentSpeed;

    if (this.joystickData?.active) {
      velocityX = Math.cos(this.joystickData.angle) * currentSpeed * this.joystickData.force;
      velocityY = Math.sin(this.joystickData.angle) * currentSpeed * this.joystickData.force;
    }

    // Проверяем, будет ли следующая позиция в воде
    if (this.currentTerrainType === 0) { // Игрок СЕЙЧАС в воде
      // Но разрешаем движение, если целевая позиция НЕ вода
      const nextX = this.player.sprite.x + velocityX * 2; // Примерное смещение за кадр
      const nextY = this.player.sprite.y + velocityY * 2;

      const nextTerrainType = this.chunkManager.getTerrainTypeAt(nextX, nextY);

      if (nextTerrainType === 0) {
        // Если целевая позиция тоже вода - блокируем движение
        this.player.setVelocity(0, 0);
        this.player.sprite.anims.stop();

        // Показываем сообщение только если еще не показывали
        if (!this.player.sprite.getData('inWater')) {
          this.player.sprite.setData('inWater', true);
          this.events.emit('showMessage', '💧 Вода! Движение невозможно');
          this.createWaterSplashEffect(this.player.sprite.x, this.player.sprite.y);
        }
        return;
      } else {
        // Разрешаем движение из воды на сушу
        this.player.sprite.setData('inWater', false);
        this.events.emit('showMessage', 'Выбираемся из воды...');
      }
    }

    let moving = velocityX !== 0 || velocityY !== 0;
    if (moving) {
      this.player.setVelocity(velocityX, velocityY);
      this.player.playAnim(velocityX, velocityY);
      this.eventBus.emit('disableActions');
      this.currentItem = null;

      // Показываем сообщение о замедлении
      this.showTerrainSpeedMessage(speedMultiplier);
    } else {
      this.player.sprite.anims.stop();
      this.player.setVelocity(0, 0);
    }
  }

  private createWaterSplashEffect(x: number, y: number): void {
    const splash = this.add.particles(x, y, 'items', {
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      lifespan: 800,
      quantity: 8,
      tint: 0x4fc3f7
    });

    this.time.delayedCall(800, () => splash.destroy());
  }

  private showTerrainSpeedMessage(speedMultiplier: number): void {
    const wasInWater = this.player.sprite.getData('inWater');

    if (wasInWater && this.currentTerrainType !== 0) {
      this.player.sprite.setData('inWater', false);
      this.events.emit('showMessage', 'Вы вышли из воды');
    }

    // Показываем сообщения о типе местности при значительном изменении скорости
    if (speedMultiplier < 0.6 && !this.player.sprite.getData('slowTerrainShown')) {
      this.player.sprite.setData('slowTerrainShown', true);

      switch (this.currentTerrainType) {
        case 1: // SAND
          this.events.emit('showMessage', '🏖️ Песок - движение замедлено');
          break;
        case 3: // FOREST
          this.events.emit('showMessage', '🌳 Лес - пробираться сложнее');
          break;
        case 4: // MOUNTAIN
          this.events.emit('showMessage', '⛰️ Горы - очень медленно');
          break;
      }
    } else if (speedMultiplier >= 0.9 && this.player.sprite.getData('slowTerrainShown')) {
      this.player.sprite.setData('slowTerrainShown', false);
      this.events.emit('showMessage', '🌿 Равнина - нормальная скорость');
    }
  }

  private updateChunks(): void {
    const newPlayerChunk = this.getPlayerChunk();

    if (newPlayerChunk.x !== this.playerChunk.x || newPlayerChunk.y !== this.playerChunk.y) {
      this.playerChunk = newPlayerChunk;

      for (let x = this.playerChunk.x - 1; x <= this.playerChunk.x + 1; x++) {
        for (let y = this.playerChunk.y - 1; y <= this.playerChunk.y + 1; y++) {
          this.chunkManager.generateChunk(x, y);
        }
      }

      this.unloadDistantChunks();
    }
  }

  private getPlayerChunk(): { x: number; y: number } {
    const chunkX = Math.floor(this.player.sprite.x / (40 * 32));
    const chunkY = Math.floor(this.player.sprite.y / (40 * 32));
    return { x: chunkX, y: chunkY };
  }

  private unloadDistantChunks(): void {
    const chunksToUnload: string[] = [];

    this.chunkManager.getLoadedChunks().forEach((chunk, key) => {
      const distance = Math.max(
        Math.abs(chunk.x - this.playerChunk.x),
        Math.abs(chunk.y - this.playerChunk.y)
      );

      if (distance > 2) {
        chunksToUnload.push(key);
      }
    });

    chunksToUnload.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      this.chunkManager.unloadChunk(x, y);
    });
  }
}
// src/scenes/MainScene.ts
import { GameEventBus } from '../utils/GameEventBus';
import { ChunkManager } from './chunks/ChunkManager';
import { Player } from './entities/Player';
import { Joystick } from '../components/Joystick';

export class MainScene extends Phaser.Scene {
  private eventBus: GameEventBus;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private joystick!: Joystick;
  private chunkManager!: ChunkManager;
  private playerChunk: { x: number; y: number } = { x: 0, y: 0 };
  private itemsGroup!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('MainScene');
    this.eventBus = GameEventBus.getInstance();
  }

  preload() {
    this.load.image('star', 'https://labs.phaser.io/assets/sprites/star.png');
    this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');

    // Загрузка спрайтов предметов
    this.load.spritesheet('items', 'https://labs.phaser.io/assets/sprites/items.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create() {
    this.physics.world.setBounds(-Number.MAX_SAFE_INTEGER / 2, -Number.MAX_SAFE_INTEGER / 2, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

    // Создаем группу для предметов ДО создания chunkManager
    this.itemsGroup = this.physics.add.group();

    this.chunkManager = new ChunkManager(this, this.itemsGroup, 40, 32);
    this.player = new Player(this, 0, 0);

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cursors = this.input!.keyboard!.createCursorKeys();
    this.joystick = new Joystick(this, 100, this.cameras.main.height - 150);

    this.createUI();
    this.generateInitialChunks();
    this.setupEventListeners();
    this.setupCollisions();
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
    const debugText = this.add.text(20, 100, 'Items: 0', {
      fontSize: '14px',
      color: '#ff9900',
      stroke: '#000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(1000);

    this.events.on('update', () => {
      chunkText.setText(`Chunk: [${this.playerChunk.x}, ${this.playerChunk.y}]`);
      debugText.setText(`Items: ${this.itemsGroup.getLength()}`);
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
        duration: 2000,
        onComplete: () => messageText.destroy()
      });
    });

    this.events.on('inventoryUpdated', (inventory: Map<string, any>) => {
      this.eventBus.emit('inventoryUpdated', { inventory });
    });
  }

  private setupCollisions(): void {
    // Правильно настраиваем overlap между игроком и предметами
    this.physics.add.overlap(
      this.player.sprite,
      this.itemsGroup,
      this.collectItem.bind(this),
      undefined,
      this
    );
  }

  private collectItem(player: any, item: any): void {
    if (item.getData('collected')) return;

    const itemType = item.getData('itemType');

    // Отправляем событие в стор
    this.eventBus.emit('itemCollected', { itemType });

    // Визуальная обратная связь
    this.events.emit('showMessage', `Найден: ${this.getItemName(itemType)}`);

    // Помечаем как собранный и удаляем
    item.setData('collected', true);
    item.disableBody(true, true);

    this.time.delayedCall(100, () => {
      if (item.active) {
        item.destroy();
      }
    });

  }

  private getItemName(itemType: string): string {
    const names: { [key: string]: string } = {
      'star': 'Звезда',
      'wood': 'Дерево',
      'stone': 'Камень'
    };
    return names[itemType] || 'Предмет';
  }

  update() {
    this.handleMovement();
    this.updateChunks();
  }

  private handleMovement(): void {
    let velocityX = 0;
    let velocityY = 0;
    const speed = 200;

    if (this.cursors.left.isDown) velocityX = -speed;
    if (this.cursors.right.isDown) velocityX = speed;
    if (this.cursors.up.isDown) velocityY = -speed;
    if (this.cursors.down.isDown) velocityY = speed;

    if (this.joystick.data.active) {
      velocityX = Math.cos(this.joystick.data.angle) * speed * this.joystick.data.force;
      velocityY = Math.sin(this.joystick.data.angle) * speed * this.joystick.data.force;
    }

    this.player.setVelocity(velocityX, velocityY);
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
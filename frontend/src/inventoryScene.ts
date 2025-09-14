import Phaser from "phaser";
import { socket } from "./socket"; // Импортируем сокет для отправки событий
import type GameScene from "./gameScene";
import { getItemFrame } from "./chunkManager";
import type { InventoryItem } from "./gameScene";

export class InventoryScene extends Phaser.Scene {
  inventoryItems: { type: string; count: number }[] = [];
  inventoryContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "InventoryScene" });
  }

  preload() {
    // Здесь можно загрузить спрайты для предметов, например:

  }

  create() {
    const { width, height } = this.scale;
    const invWidth = 400;
    const invHeight = 300;
    const x = width / 2 - invWidth / 2;
    const y = height / 2 - invHeight / 2;

    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRect(x, y, invWidth, invHeight);
    background.setScrollFactor(0);

    this.add.text(x + 20, y + 20, "Инвентарь", { fontSize: "24px", color: "#ffffff" }).setScrollFactor(0);

    const closeButton = this.add.text(x + invWidth - 40, y + 20, "X", { fontSize: "24px", color: "#ffffff", backgroundColor: "#ff0000" })
      .setInteractive()
      .setScrollFactor(0);

    closeButton.on("pointerdown", () => {
      this.scene.stop("InventoryScene");
      this.scene.resume("GameScene");
    });

    this.inventoryContainer = this.add.container(x + 20, y + 60).setScrollFactor(0);

    this.updateInventoryDisplay();
  }

  setInventory(inventoryData: { [key: string]: InventoryItem }) {
    this.inventoryItems = Object.entries(inventoryData).map(([type, item]) => ({ type, count: item.quantity }));
    if (this.scene.isActive()) {
      this.updateInventoryDisplay();
    }
  }

  updateInventoryDisplay() {
    if (!this.inventoryContainer) return;
    this.inventoryContainer.removeAll(true);

    const spriteSize = 48;
    const padding = 10;
    const cols = 5;

    if (this.inventoryItems.length === 0) {
      this.inventoryContainer.add(this.add.text(0, 0, "Инвентарь пуст.", { fontSize: "16px", color: "#ffffff" }));
      return;
    }

    this.inventoryItems.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (spriteSize + padding);
      const y = row * (spriteSize + padding);

      const frame = getItemFrame(item.type);
      const sprite = this.add.sprite(x, y, "tiles", frame)
        .setInteractive()
        .setOrigin(0, 0)
        .setScale(1.2);

      const countText = this.add.text(x + spriteSize - 10, y + spriteSize - 10, `${item.count}`, {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 2, y: 2 }
      }).setOrigin(1, 1);

      sprite.on("pointerdown", () => {
        socket.emit("dropItem", { itemType: item.type });

        const gameScene = this.scene.get("GameScene") as GameScene;
        if (gameScene) {
          if (gameScene.inventory[item.type].quantity > 1) {
            gameScene.inventory[item.type].quantity--;
          } else {
            delete gameScene.inventory[item.type];
          }
        }

        this.setInventory(gameScene.inventory);
      });

      // вместо addMultiple
      this.inventoryContainer.add(sprite);
      this.inventoryContainer.add(countText);
    });
  }

}

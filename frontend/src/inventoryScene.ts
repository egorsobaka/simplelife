import Phaser from "phaser";
import socket from "./socket"; // Импортируем сокет для отправки событий
import type GameScene from "./gameScene";

export class InventoryScene extends Phaser.Scene {
  inventoryItems: { type: string; count: number }[] = [];
  inventoryContainer!: Phaser.GameObjects.Container; // Контейнер для предметов

  constructor() {
    super({ key: "InventoryScene" });
  }

  preload() {
    //
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
    
    // Создаем контейнер для элементов инвентаря
    this.inventoryContainer = this.add.container(x + 20, y + 60).setScrollFactor(0);
    
    this.updateInventoryDisplay();
  }
  
  // Новый метод для получения инвентаря из GameScene
  setInventory(inventoryData: { [key: string]: number }) {
    this.inventoryItems = Object.entries(inventoryData).map(([type, count]) => ({ type, count }));
    // Если сцена уже активна, обновляем отображение
    if (this.scene.isActive()) {
      this.updateInventoryDisplay();
    }
  }

  updateInventoryDisplay() {
    if (!this.inventoryContainer) return;

    this.inventoryContainer.removeAll(true); // Удаляем старые элементы
    
    let currentY = 0;
    if (this.inventoryItems.length === 0) {
      this.inventoryContainer.add(this.add.text(0, 0, "Инвентарь пуст.", { fontSize: "16px", color: "#ffffff" }));
    } else {
      this.inventoryItems.forEach(item => {
        const itemText = this.add.text(0, currentY, `${item.type}: ${item.count}`, { fontSize: "16px", color: "#ffffff" })
          .setInteractive()
          .setPadding(5);
          
        itemText.on("pointerover", () => itemText.setBackgroundColor("#444"));
        itemText.on("pointerout", () => itemText.setBackgroundColor(""));
        
        itemText.on("pointerdown", () => {
          // Отправляем на сервер запрос на выбрасывание
          socket.emit("dropItem", { itemType: item.type });
          
          // Обновляем инвентарь на клиенте
          const gameScene = this.scene.get("GameScene") as GameScene;
          if (gameScene) {
            if (gameScene.inventory[item.type] > 1) {
              gameScene.inventory[item.type]--;
            } else {
              delete gameScene.inventory[item.type];
            }
          }
          
          // Обновляем отображение инвентаря
          this.setInventory(gameScene.inventory);
        });
        
        this.inventoryContainer.add(itemText);
        currentY += itemText.height + 5;
      });
    }
  }
}
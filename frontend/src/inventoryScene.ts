// inventoryScene.ts
import Phaser from "phaser";

export class InventoryScene extends Phaser.Scene {
  inventoryItems: { type: string; count: number }[] = [];
  inventoryText!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: "InventoryScene" });
  }

  preload() {
    // В будущем тут можно загружать иконки предметов, если они будут отдельными спрайтами
  }

  create() {
    const { width, height } = this.scale;
    const invWidth = 400;
    const invHeight = 300;
    const x = width / 2 - invWidth / 2;
    const y = height / 2 - invHeight / 2;

    // Фон инвентаря
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRect(x, y, invWidth, invHeight);
    background.setScrollFactor(0);
    
    // Заголовок
    this.add.text(x + 20, y + 20, "Инвентарь", { fontSize: "24px", color: "#ffffff" }).setScrollFactor(0);
    
    // Кнопка закрытия
    const closeButton = this.add.text(x + invWidth - 40, y + 20, "X", { fontSize: "24px", color: "#ffffff", backgroundColor: "#ff0000" })
      .setInteractive()
      .setScrollFactor(0);
      
    closeButton.on("pointerdown", () => {
      this.scene.stop("InventoryScene");
      this.scene.resume("GameScene");
    });

    // Текст для отображения предметов
    this.inventoryText = this.add.text(x + 20, y + 60, "", { fontSize: "16px", color: "#ffffff", wordWrap: { width: invWidth - 40 } }).setScrollFactor(0);
    
    this.updateInventoryDisplay();
  }

  updateInventoryDisplay() {
    if (!this.inventoryText) return;

    let displayString = "";
    if (this.inventoryItems.length === 0) {
        displayString = "Инвентарь пуст.";
    } else {
        this.inventoryItems.forEach(item => {
            displayString += `${item.type}: ${item.count}\n`;
        });
    }
    this.inventoryText.setText(displayString);
  }
}
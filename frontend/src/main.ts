import Phaser from "phaser";
import GameScene from "./gameScene.js";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000000",
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE, // автоматическое изменение размера при смене ориентации
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  }
};

const game = new Phaser.Game(config);

// обновление размера при повороте экрана
window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

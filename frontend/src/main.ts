import Phaser from "phaser";
import GameScene from "./GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 640,
  pixelArt: true,
  scene: [GameScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
};

window.addEventListener("load", () => {
  const game = new Phaser.Game(config);
});

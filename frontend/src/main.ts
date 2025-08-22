import Phaser from "phaser";
import GameScene from "./GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1200,
  height: 1400,
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

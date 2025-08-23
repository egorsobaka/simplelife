import Phaser from "phaser";
import { player } from "./playerController";

export let hudText!: Phaser.GameObjects.Text;

export function createHUD(scene: Phaser.Scene) {
  hudText = scene.add.text(10, 10, '', {
    font: '16px Arial',
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: { x: 5, y: 5 }
  }).setScrollFactor(0).setDepth(1000);
}

export function updateHUD(currentChunkX: number, currentChunkY: number) {
  hudText.setText(
    `X: ${Math.floor(player.x)} Y: ${Math.floor(player.y)}\n` +
    `Chunk: ${currentChunkX}_${currentChunkY}`
  );
}

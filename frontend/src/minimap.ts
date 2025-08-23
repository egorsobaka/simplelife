import Phaser from "phaser";
import { player } from "./playerController";
import type { Item } from "./mapGenerator";

export let minimap!: Phaser.GameObjects.Graphics;

export function createMinimap(scene: Phaser.Scene) {
  minimap = scene.add.graphics();
}

export function drawMinimap(items: Item[], otherPlayers: Phaser.GameObjects.Sprite[]) {
  if (!minimap) return;
  const scale = 0.1;
  minimap.clear();
  minimap.fillStyle(0x000000, 0.5);
  minimap.fillRect(0, 0, 20 * 32 * scale, 20 * 32 * scale);

  minimap.fillStyle(0x00ff00, 1);
  minimap.fillRect(player.x * scale, player.y * scale, 3, 3);

  minimap.fillStyle(0xff0000, 1);
  otherPlayers.forEach(p => minimap.fillRect(p.x * scale, p.y * scale, 3, 3));

  minimap.fillStyle(0xffff00, 1);
  items.forEach(item => minimap.fillRect(item.x * 32 * scale, item.y * 32 * scale, 2, 2));
}

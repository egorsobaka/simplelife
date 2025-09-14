import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface InventoryItem {
  quantity: number;
}

@Schema()
export class Player extends Document {
  @Prop({ required: true, unique: true })
  telegramId: string;

  @Prop({ required: true, default: 100 })
  x: number;

  @Prop({ required: true, default: 100 })
  y: number;

  @Prop({ default: '' })
  anim: string;

  @Prop({
    type: Map,
    of: {
      quantity: { type: Number, default: 1 }
    },
    default: {}
  })
  inventory: Map<string, InventoryItem>;

  @Prop({
    type: {
      chunkX: Number,
      chunkY: Number,
      tileX: Number,
      tileY: Number
    },
    default: { chunkX: 0, chunkY: 0, tileX: 0, tileY: 0 }
  })
  lastChunk: {
    chunkX: number;
    chunkY: number;
    tileX: number;
    tileY: number;
  };

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
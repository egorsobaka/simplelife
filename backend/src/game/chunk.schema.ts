// chunk.schema.ts
import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class Tile {
  @Prop({ required: true, type: String })
  type: string;
}

const TileSchema = SchemaFactory.createForClass(Tile);

@Schema({ _id: false })
class Item {
  @Prop({ required: true, type: Number })
  x: number;

  @Prop({ required: true, type: Number })
  y: number;

  @Prop({ required: true, type: String })
  type: string;
}

const ItemSchema = SchemaFactory.createForClass(Item);

@Schema()
export class ChunkDocument extends Document {
  @Prop({ required: true, type: Number })
  chunkX: number;

  @Prop({ required: true, type: Number })
  chunkY: number;

  @Prop({ type: [[TileSchema]], required: true })
  tiles: Tile[][];

  @Prop({ type: [ItemSchema], default: [] })
  items: Item[];

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const ChunkSchema = SchemaFactory.createForClass(ChunkDocument);

// Создаем составной индекс для быстрого поиска по координатам
ChunkSchema.index({ chunkX: 1, chunkY: 1 }, { unique: true });
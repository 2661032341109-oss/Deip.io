
import { Entity, Particle } from './entities';
import { ChatMessage, WorldEventType } from './gameplay';

export interface NetInput {
  keys: string[];
  mouse: { x: number, y: number, down: boolean, rightDown: boolean };
  angle: number;
  skillActive: boolean;
  timestamp: number; // Required for Server Reconciliation
}

export interface NetSnapshot {
  entities: Partial<Entity>[];
  particles: Partial<Particle>[];
  timestamp: number; // Host Server Time
  chat?: ChatMessage[];
  worldEvent?: { type: WorldEventType, timeLeft: number };
}

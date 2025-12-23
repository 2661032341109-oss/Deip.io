
import { MutableRefObject, RefObject } from 'react';
import { Entity, Particle, PlayerStatsUpgrade, GameSettings, ChatMessage, WorldEventType, Shockwave } from '../types';
import { SoundManager } from './SoundManager';
import { NetworkManager } from './NetworkManager';

export interface GameContext {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  minimapRef: RefObject<HTMLCanvasElement | null>;
  entities: MutableRefObject<Entity[]>;
  particles: MutableRefObject<Particle[]>;
  shockwaves: MutableRefObject<Shockwave[]>; 
  deadEntities: MutableRefObject<Entity[]>;
  deadParticles: MutableRefObject<Particle[]>;
  lightningBeams: MutableRefObject<{x1:number, y1:number, x2:number, y2:number, life:number}[]>;
  camera: MutableRefObject<{ x: number, y: number, zoom: number, shake: number }>;
  mouse: MutableRefObject<{ x: number, y: number, down: boolean, rightDown: boolean }>;
  keys: MutableRefObject<Set<string>>;
  joystick: MutableRefObject<{ active: boolean, id: null | number, origin: { x: number, y: number }, curr: { x: number, y: number }, vector: { x: number, y: number } }>;
  fireButton: MutableRefObject<{ active: boolean, id: null | number }>;
  skillButton: MutableRefObject<{ active: boolean, id: null | number }>; 
  gameState: MutableRefObject<{ 
      score: number, level: number, exp: number, nextLevelExp: number, frames: number, upgradesPoints: number, mapSize: number, gameMode: string,
      killStreak: number, streakTimer: number
  }>; 
  
  worldEvent: MutableRefObject<{ type: WorldEventType, timeLeft: number, timer: number }>;

  playerStats: MutableRefObject<PlayerStatsUpgrade[]>;
  playerTargetRotation: MutableRefObject<number>;
  isAdminMode: MutableRefObject<boolean>;
  globalTick: MutableRefObject<number>;
  isMobile: MutableRefObject<boolean>;
  stars: MutableRefObject<{x: number, y: number, size: number, alpha: number, layer: number}[]>;
  soundManager: MutableRefObject<SoundManager | null>;
  network: MutableRefObject<NetworkManager>;
  settings: MutableRefObject<GameSettings>; 
  chatMessages: MutableRefObject<ChatMessage[]>; 
}

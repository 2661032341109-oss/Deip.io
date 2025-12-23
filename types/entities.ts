
import { Vector2 } from './primitives';

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
  DUMMY_TARGET = 'DUMMY_TARGET', 
  
  // Basic Food
  FOOD_SQUARE = 'FOOD_SQUARE', 
  FOOD_TRIANGLE = 'FOOD_TRIANGLE', 
  FOOD_PENTAGON = 'FOOD_PENTAGON', 
  
  // Advanced Food
  FOOD_HEXAGON = 'FOOD_HEXAGON',
  FOOD_ALPHA_PENTAGON = 'FOOD_ALPHA_PENTAGON',
  FOOD_GEM = 'FOOD_GEM', 
  FOOD_STAR = 'FOOD_STAR', 
  
  // Ultra/3D Food
  FOOD_OCTAGON = 'FOOD_OCTAGON', 
  FOOD_TESSERACT = 'FOOD_TESSERACT', 
  FOOD_ICOSAHEDRON = 'FOOD_ICOSAHEDRON', 

  // Projectiles
  BULLET = 'BULLET',
  MISSILE = 'MISSILE', 
  LASER_BOLT = 'LASER_BOLT', 
  TRAP = 'TRAP',
  WAVE = 'WAVE', 
  CONSTRUCT_WALL = 'CONSTRUCT_WALL',
  CONSTRUCT_TURRET = 'CONSTRUCT_TURRET',
  
  // Drones & Minions
  DRONE_TRIANGLE = 'DRONE_TRIANGLE', 
  DRONE_SQUARE = 'DRONE_SQUARE', 
  DRONE_MINION = 'DRONE_MINION', 
  DRONE_SWARM = 'DRONE_SWARM', 
  DRONE_HEALER = 'DRONE_HEALER',

  WALL = 'WALL',
  ZONE = 'ZONE', 
  PARTICLE = 'PARTICLE'
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'smoke' | 'text' | 'ring' | 'fire' | 'snow' | 'muzzle_flash' | 'casing' | 'shockwave' | 'glitch' | 'bubble' | 'energy_arc' | 'pixel' | 'code' | 'heart' | 'debris' | 'explosion_core';
  text?: string;
  rotation?: number;
  rotationSpeed?: number;
}

export interface Shockwave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    color: string;
}

export interface StatusEffect {
  type: 'BURN' | 'FREEZE' | 'SHOCK' | 'CORROSION' | 'TIME_SLOW';
  duration: number;
  magnitude: number; 
  tickTimer?: number;
}

export type SkinId = string; 
export type TrailId = string;
export type FlagId = string; 

export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  baseRadius?: number;
  rotation: number;
  health: number;
  maxHealth: number;
  color: string;
  depth: number; 
  tier?: number;
  name?: string;
  expValue?: number;
  score?: number; 
  level?: number; 
  
  // Interpolation State
  serverPosition?: Vector2;
  targetPosition?: Vector2;
  serverRotation?: number;
  
  // Combat
  weaponId?: string;
  reloadTimer?: number;
  recoilForce?: number;
  barrelRecoils?: number[]; 
  teamId?: number; 
  lastCombatTime?: number;

  // Status
  statusEffects: StatusEffect[];
  isGodMode?: boolean; 
  
  // Skill System
  skillState?: {
    active: boolean;
    cooldown: number; 
    duration: number; 
    maxCooldown: number;
    channelProgress?: number; 
  };

  // Chat
  chatText?: string;
  chatTimer?: number;

  // Specifics
  ownerId?: string; 
  damage?: number; 
  lifeTime?: number; 
  isSolid?: boolean; 
  hitIds?: string[]; 
  
  isFlame?: boolean;
  isSpike?: boolean; 
  trailColor?: string;
  orbitAngle?: number; 
  targetId?: string; 
  
  skinId?: SkinId;
  trailId?: TrailId;
  flagId?: FlagId;
  
  width?: number;
  height?: number;

  aiState?: {
    state: 'IDLE' | 'CHASE' | 'FLEE';
    targetPos?: Vector2;
    acqRange: number;
  };
}

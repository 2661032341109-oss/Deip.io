
import { Vector2, EntityType, Entity, FontTheme, Language } from './';

export interface WeaponStats {
  damage: number;
  reload: number;
  range: number;
  speed: number;
  spread: number;
  recoil: number;
  bulletSize: number;
  bulletCount: number;
}

export type SkillType = 
  | 'DASH' | 'SHIELD' | 'OVERCLOCK' | 'STEALTH' | 'REPEL' | 'RECALL' | 'EMP' | 'TELEPORT' | 'BARRAGE' | 'FORTIFY' | 'GRAVITY_WELL' | 'ROCKET_JUMP' | 'MAGNET' | 'FOCUS'
  | 'CHRONO_FIELD' | 'ORBITAL_BEAM' | 'MIRROR_PRISM' | 'NANO_ARMOR' | 'PHANTOM_STEP' | 'CONSTRUCT_WALL' | 'TIME_WARP' | 'BERSERK' | 'THUNDER_STORM' | 'MIRAGE' | 'NONE';

export interface WeaponSchema {
  id: string;
  name: string;
  description: string;
  tier: number;
  type: 'Bullet' | 'Laser' | 'Drone' | 'Trap' | 'Flamethrower' | 'Tesla' | 'Shotgun' | 'Launcher' | 'Necro' | 'Minion' | 'Ram' | 'Sonic' | 'Swarm' | 'Builder' | 'Healer';
  barrels: {
    offset: number; 
    width: number;
    length: number;
    angle: number;
    delay: number;
    type?: 'Launcher' | 'Auto' | 'Spike' | 'Dish' | 'Construct' | 'Injector' | 'Trapezoid'; 
  }[];
  stats: WeaponStats;
  effect?: 'BURN' | 'FREEZE' | 'SHOCK' | 'CORROSION' | 'HEAL' | 'NONE';
  bodyType?: 'Normal' | 'Spike' | 'Square' | 'Saw' | 'Hexagon' | 'Star' | 'Tri' | 'Cross' | 'Crescent' | 'Octagon' | 'Diamond' | 'Trapezoid';
  
  skill?: {
    type: SkillType;
    name: string;
    cooldown: number; 
    duration: number; 
    description?: string;
  };
}

export interface PlayerStatsUpgrade {
  id: string;
  label: string;
  level: number;
  maxLevel: number;
  value: number; 
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  level: number; 
  isSelf: boolean;
  rank?: number;
  flagId?: string;
  skinId?: string;
  mainClass?: string;
  verified?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  system?: boolean;
  ownerId?: string; 
}

export interface KillFeedEntry {
    id: string;
    killer: string;
    victim: string;
    icon: EntityType;
    time: number;
}

export type WorldEventType = 'NONE' | 'GOLD_RUSH' | 'DARK_MATTER' | 'LOW_GRAVITY' | 'BOSS_RAID';

export interface GameStats {
  fps: number;
  ping: number;
  score: number;
  level: number;
  maxLevel: number;
  entitiesCount: number;
  position: Vector2; 
  upgradesAvailable: number;
  isAdminMode: boolean; 
  stats?: PlayerStatsUpgrade[];
  activeSkill?: {
    name: string;
    cooldown: number;
    maxCooldown: number;
    active: boolean;
  };
  roomId?: string;
  leaderboard?: LeaderboardEntry[]; 
  chatMessages?: ChatMessage[];
  chatVersion: number;
  activeBoss?: { name: string, health: number, maxHealth: number, color: string };
  killFeed?: KillFeedEntry[];
  worldEvent?: {
      type: WorldEventType;
      timeLeft: number;
      label: string;
  };
  activeStreak?: {
      count: number;
      label: string;
      timer: number;
  };
  isCombatActive?: boolean; 
  extractionProgress?: number;
}

export type MissionType = 'SCORE' | 'KILL' | 'LEVEL' | 'PLAYTIME' | 'BOSS_KILL';

export interface Mission {
    id: string;
    type: MissionType;
    description: string;
    targetValue: number;
    currentValue: number;
    reward: number; 
    isClaimed: boolean;
    icon?: string;
}

export interface LifetimeStats {
    gamesPlayed: number;
    totalKills: number;
    totalScore: number;
    totalPlayTime: number; 
    highestLevel: number;
    bossesKilled: number;
}

export interface SavedRun {
    level: number;
    score: number;
    weaponId: string;
    stats: PlayerStatsUpgrade[];
    timestamp: number;
    gameMode: string;
}

export interface AccountData {
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  nickname?: string; 
  lastNameChange: number; 
  totalExp: number;
  rank: number;
  currency: number; 
  unlockedSkins: string[];
  unlockedTrails: string[]; 
  unlockedFlags: string[]; 
  equippedSkin: string;
  equippedTrail: string; 
  equippedFlag: string; 
  highScore: number;
  lastLogin: number;
  dailyStreak: number;
  missions: Mission[];
  stats: LifetimeStats;
  lastMissionReset: number;
  savedRun?: SavedRun | null;
  badges?: string[]; 
}

export interface PlayerProfile {
  nickname: string;
  gameMode: string; 
  roomId?: string;
  isHost?: boolean;
  skinId: string;
  trailId: string; 
  flagId: string; 
  savedRun?: SavedRun; 
  teamId?: number;
}

export interface SandboxOptions {
  godMode: boolean;
  infiniteAmmo: boolean;
  spawnBossSignal: number;
  resetLevelSignal: number;
  healSignal: number;
  maxLevelSignal: number; 
  maxStatsSignal: number; 
  suicideSignal: number; 
  clearEnemiesSignal: number; 
  spawnFoodSignal: number; 
  statOverrideSignal: { id: string, max: boolean } | null; 
}

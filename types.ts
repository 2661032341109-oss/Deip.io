
export enum ViewState {
  LOBBY = 'LOBBY',
  GAME = 'GAME',
  SETTINGS = 'SETTINGS',
  ENCYCLOPEDIA = 'ENCYCLOPEDIA',
  SPECTATE = 'SPECTATE',
  SHOP = 'SHOP'
}

export type Language = 'EN' | 'TH' | 'JP';
export type FontTheme = 'CORE' | 'CLEAN' | 'STRIKE' | 'TERMINAL';

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
  CONSTRUCT_WALL = 'CONSTRUCT_WALL', // New: Architect walls
  CONSTRUCT_TURRET = 'CONSTRUCT_TURRET', // New: Architect turrets
  
  // Drones & Minions
  DRONE_TRIANGLE = 'DRONE_TRIANGLE', 
  DRONE_SQUARE = 'DRONE_SQUARE', 
  DRONE_MINION = 'DRONE_MINION', 
  DRONE_SWARM = 'DRONE_SWARM', 
  DRONE_HEALER = 'DRONE_HEALER', // New

  WALL = 'WALL',
  ZONE = 'ZONE', 
  PARTICLE = 'PARTICLE'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'smoke' | 'text' | 'ring' | 'fire' | 'snow' | 'muzzle_flash' | 'casing' | 'shockwave' | 'glitch' | 'bubble' | 'energy_arc' | 'pixel' | 'code' | 'heart' | 'debris' | 'explosion_core'; // Added explosion_core
  text?: string;
  rotation?: number;
  rotationSpeed?: number;
}

// Visual Shockwave for rendering distortion
export interface Shockwave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number; // 0 to 1
    color: string;
}

export interface StatusEffect {
  type: 'BURN' | 'FREEZE' | 'SHOCK' | 'CORROSION' | 'TIME_SLOW';
  duration: number;
  magnitude: number; 
  tickTimer?: number;
}

// EXPANDED COSMETICS
export type SkinId = 
  | 'DEFAULT' | 'NEON_RED' | 'GOLDEN_GLORY' | 'VOID_WALKER' | 'CYBER_PUNK' | 'TOXIC_HAZARD' 
  | 'VAPORWAVE' | 'ARCTIC_OPS' | 'MAGMA_LORD' | 'MATRIX_CODE' | 'GLASS_CANNON' | 'MIDNIGHT';

export type TrailId = 
  | 'NONE' | 'EMBER' | 'FROST' | 'RAINBOW' | 'MATRIX' | 'SHADOW' | 'ELECTRIC' | 'HEARTS' | 'PIXEL';

// ISO Country Codes or Special IDs
export type FlagId = string; 

export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  baseRadius?: number; // New: Original size before scaling
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
  
  // Interpolation State (New for AAA Smoothness)
  serverPosition?: Vector2; // The authoritative position from server
  targetPosition?: Vector2; // Where we are lerping to
  serverRotation?: number;
  
  // Combat
  weaponId?: string;
  reloadTimer?: number;
  recoilForce?: number;
  barrelRecoils?: number[]; 
  teamId?: number; 
  lastCombatTime?: number; // New: For Extraction Logic

  // Status
  statusEffects: StatusEffect[];
  isGodMode?: boolean; 
  
  // Skill System
  skillState?: {
    active: boolean;
    cooldown: number; 
    duration: number; 
    maxCooldown: number;
    // For channeled skills like Beam
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
  
  // Visual Specifics
  isFlame?: boolean;
  isSpike?: boolean; 
  trailColor?: string;
  orbitAngle?: number; 
  targetId?: string; 
  
  // Cosmetics
  skinId?: SkinId;
  trailId?: TrailId;
  flagId?: FlagId; // NEW: Country Flag
  
  // Map Props
  width?: number;
  height?: number;

  // AI & Physics
  aiState?: {
    state: 'IDLE' | 'CHASE' | 'FLEE';
    targetPos?: Vector2;
    acqRange: number;
  };
}

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
  | 'DASH'          
  | 'SHIELD'        
  | 'OVERCLOCK'     
  | 'STEALTH'       
  | 'REPEL'         
  | 'RECALL'        
  | 'EMP'           
  | 'TELEPORT'      
  | 'BARRAGE'       
  | 'FORTIFY'       
  | 'GRAVITY_WELL'  
  | 'ROCKET_JUMP'   
  | 'MAGNET'        
  | 'FOCUS'
  // NEW ULTIMATE SKILLS AAA
  | 'CHRONO_FIELD'  // Slows time in area
  | 'ORBITAL_BEAM'  // Strikes from above
  | 'MIRROR_PRISM'  // Reflects projectiles
  | 'NANO_ARMOR'    // Rapid Regen + Dmg Reduction
  | 'PHANTOM_STEP'  // Invisibility + Decoy + Speed
  | 'CONSTRUCT_WALL' // Spawns a shield wall
  | 'TIME_WARP'     // The Matrix stop
  | 'BERSERK'       // Rage mode
  | 'THUNDER_STORM' // Auto lightning
  | 'MIRAGE'        // Clones
  | 'NONE';

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
  rank?: number; // Global Rank Position
  // Expanded Identity
  flagId?: string;
  skinId?: string;
  mainClass?: string; // e.g., 'Sniper', 'Overlord'
  verified?: boolean; // If they are a top player
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
    icon: EntityType; // Or weapon type
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
  // AAA Additions
  activeBoss?: { name: string, health: number, maxHealth: number, color: string };
  killFeed?: KillFeedEntry[];
  
  // NEW: Events & Streaks
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
  extractionProgress?: number; // 0 to 100, undefined if not extracting
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

// New: Saved Run Structure
export interface SavedRun {
    level: number;
    score: number;
    weaponId: string;
    stats: PlayerStatsUpgrade[];
    timestamp: number;
    gameMode: string;
}

export interface AccountData {
  role: 'USER' | 'ADMIN' | 'MODERATOR'; // Added Role
  nickname?: string; 
  lastNameChange: number; 
  totalExp: number;
  rank: number;
  currency: number; 
  unlockedSkins: SkinId[];
  unlockedTrails: TrailId[]; 
  unlockedFlags: FlagId[]; 
  equippedSkin: SkinId;
  equippedTrail: TrailId; 
  equippedFlag: FlagId; 
  highScore: number;
  lastLogin: number;
  dailyStreak: number;
  missions: Mission[];
  stats: LifetimeStats;
  lastMissionReset: number;
  savedRun?: SavedRun | null;
  // Identity Metadata
  badges?: string[]; 
}

export interface PlayerProfile {
  nickname: string;
  gameMode: string; 
  roomId?: string;
  isHost?: boolean;
  skinId: SkinId;
  trailId: TrailId; 
  flagId: FlagId; 
  savedRun?: SavedRun; 
  teamId?: number; // 1 for Blue, 2 for Red
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

export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

// --- SETTINGS STRUCTURE ---
export interface GameSettings {
  language: Language; 
  fontTheme: FontTheme;
  qualityPreset: QualityPreset;
  
  graphics: {
    resolution: number; 
    particles: number; 
    bloom: boolean;
    motionBlur: boolean;
    shake: boolean;
    shadows: boolean;
    damageNumbers: boolean; 
    chromaticAberration: boolean; 
    gridVisibility: number; 
  };
  
  controls: {
    sensitivity: number; 
    mobileOrientation: 'AUTO' | 'LANDSCAPE' | 'PORTRAIT';
    haptic: boolean;
    leftHanded: boolean;
    joystickSize: number; 
    joystickOpacity: number; 
    joystickDeadzone: number; 
    aimAssistStrength: number; // Mobile Buff
    touchSmoothing: number;    // Mobile Buff
  };
  
  interface: {
    crosshairType: 'DEFAULT' | 'CROSS' | 'CIRCLE' | 'DOT' | 'OFF'; 
    crosshairColor: string; 
    showNetGraph: boolean; 
    minimapScale: number; 
    minimapOpacity: number; 
    streamerMode: boolean; 
    aimLine: boolean; 
  };

  // --- NETCODE & ADVANCED ---
  gameplay: {
    autoLevelPriority: boolean; 
  };

  network: {
    interpDelay: number;        // ms: "Network Buff" (Lower = faster, riskier)
    buffering: 'NONE' | 'MINIMUM' | 'BALANCED'; // Presets
    prediction: boolean;        // Client-side prediction
    packetRate: '30' | '60' | '120'; // Simulation tickrate
  };

  advanced: {
    lowLatencyMode: boolean;    // "Reflex" simulation (input queue optimization)
    fpsCap: number;             // 0 = Unlimited
    rawInput: boolean;          // Bypass smoothing
    batterySaver: boolean;      // Mobile specific
  };

  audio: {
    master: number; 
    sfx: number;
    music: number;
  };

  accessibility: {
    colorblindMode: 'NONE' | 'PROTANOPIA' | 'DEUTERANOPIA' | 'TRITANOPIA';
    screenFlash: boolean;
    uiScale: number;
  }
}

export interface NetInput {
  keys: string[];
  mouse: { x: number, y: number, down: boolean, rightDown: boolean };
  angle: number;
  skillActive: boolean;
}

export interface NetSnapshot {
  entities: Partial<Entity>[];
  particles: Partial<Particle>[];
  timestamp: number;
  chat?: ChatMessage[];
  // Sync Events
  worldEvent?: { type: WorldEventType, timeLeft: number };
}
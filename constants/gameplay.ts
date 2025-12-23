
import { PlayerStatsUpgrade } from '../types';

export const GAMEPLAY_CONSTANTS = {
    SIZE_PER_LEVEL: 0.012,          // Slightly reduced scaling to keep high-lvl play visible
    SPEED_PENALTY_PER_LEVEL: 0.003, 
    BULLET_SIZE_PER_LEVEL: 0.005,   
    CAMERA_ZOOM_PER_LEVEL: 0.004    
};

export const UPGRADE_TEMPLATE: PlayerStatsUpgrade[] = [
  { id: '1', label: 'Hull Regen', level: 0, maxLevel: 10, value: 1 },
  { id: '2', label: 'Max Integrity', level: 0, maxLevel: 10, value: 1 },
  { id: '3', label: 'Body Impact', level: 0, maxLevel: 10, value: 1 },
  { id: '4', label: 'Bullet Velocity', level: 0, maxLevel: 10, value: 1 },
  { id: '5', label: 'Penetration', level: 0, maxLevel: 10, value: 1 },
  { id: '6', label: 'Damage Output', level: 0, maxLevel: 10, value: 1 },
  { id: '7', label: 'Reload Rate', level: 0, maxLevel: 10, value: 1 },
  { id: '8', label: 'Engine Power', level: 0, maxLevel: 10, value: 1 },
];

export const MODES = ['FFA', '2-Teams', 'Sandbox', 'Boss Raid', 'Mega'];

// MEGA Mode: Darker, Void-like aesthetic
export const MAP_CONFIGS: Record<string, { size: number, gridColor: string, wallColor: string, borderColor: string, floorColor: string }> = {
    'FFA': { size: 4000, gridColor: '#1a1a25', wallColor: '#4a4a55', borderColor: '#00f3ff', floorColor: '#0a0a10' },
    '2-Teams': { size: 6000, gridColor: '#222', wallColor: '#555', borderColor: '#ffffff', floorColor: '#0f0f12' }, 
    'Sandbox': { size: 3000, gridColor: '#25200a', wallColor: '#ddd', borderColor: '#ffd700', floorColor: '#1a1a1a' },
    'Boss Raid': { size: 3000, gridColor: '#250a0a', wallColor: '#330505', borderColor: '#ff0033', floorColor: '#0f0505' },
    'Mega': { size: 10000, gridColor: '#111', wallColor: '#222', borderColor: '#d946ef', floorColor: '#020202' } // Huge map, Void style
};

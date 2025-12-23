
import { PlayerStatsUpgrade, Vector2 } from '../types';

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpAngle = (start: number, end: number, t: number) => {
  const dt = (end - start + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return start + dt * t;
};

export const distSq = (a: Vector2, b: Vector2) => Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
export const dist = (a: Vector2, b: Vector2) => Math.sqrt(distSq(a, b));

export const getStatMultiplier = (stats: PlayerStatsUpgrade[], statId: string) => {
  const stat = stats.find(s => s.id === statId);
  return stat ? 1 + (stat.level * 0.15) : 1;
};

// --- COLORBLIND UTILS ---
export const resolveColor = (hex: string, mode: string): string => {
    if (mode === 'NONE') return hex;

    // Normalize input
    const color = hex.toLowerCase();

    // Palettes
    // 1. NEON BLUE (Player / Ally) -> #00f3ff
    // 2. NEON PINK/RED (Enemy) -> #ff0055
    // 3. GREEN (Ally/Success) -> #00ff9d
    // 4. YELLOW (Gold/Score) -> #ffd700

    // PROTANOPIA (Red-Blind): Can't see Red well. Make Enemies Yellow/High Contrast.
    if (mode === 'PROTANOPIA') {
        if (color.includes('#ff0055') || color.includes('#f00') || color.includes('rgb(255, 0, 85)')) return '#ffe600'; // Enemy -> Bright Yellow
        if (color.includes('#00f3ff')) return '#0055ff'; // Player -> Deep Blue (Contrast)
        if (color.includes('#00ff9d')) return '#ffffff'; // Ally -> White
    }
    
    // DEUTERANOPIA (Green-Blind): Can't see Green. Red looks brownish.
    if (mode === 'DEUTERANOPIA') {
        if (color.includes('#ff0055')) return '#ffaa00'; // Enemy -> Orange
        if (color.includes('#00f3ff')) return '#0099ff'; // Player -> Standard Blue
        if (color.includes('#00ff9d')) return '#ffcc00'; // Ally -> Gold
    }

    // TRITANOPIA (Blue-Blind): Can't see Blue.
    if (mode === 'TRITANOPIA') {
        if (color.includes('#00f3ff')) return '#00ffaa'; // Player -> Teal/Green
        if (color.includes('#ff0055')) return '#ff0066'; // Enemy -> Pink (Keep)
        if (color.includes('#ffd700')) return '#ffccff'; // Gold -> Light Pink
    }

    return hex;
};

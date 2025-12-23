
import { GameContext } from '../GameContext';
import { EntityType } from '../../types';
import { resolveColor } from '../utils';

export const drawMinimap = (gameCtx: GameContext) => {
    const canvas = gameCtx.minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const opacity = gameCtx.settings.current.interface.minimapOpacity / 100;
    if (canvas.style.opacity !== opacity.toString()) canvas.style.opacity = opacity.toString();

    const mapSize = gameCtx.gameState.current.mapSize;
    const width = canvas.width;
    const height = canvas.height;
    const scale = width / mapSize;
    const cx = width / 2;
    const cy = height / 2;
    const cbMode = gameCtx.settings.current.accessibility.colorblindMode;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(5, 5, 10, 0.85)';
    ctx.fillRect(0, 0, width, height);

    gameCtx.entities.current.forEach(e => {
        if (e.type !== EntityType.WALL && e.type !== EntityType.ZONE) return;
        const mx = cx + (e.position.x * scale);
        const my = cy + (e.position.y * scale);
        // @ts-ignore
        const w = (e.width || e.radius * 2) * scale;
        // @ts-ignore
        const h = (e.height || e.radius * 2) * scale;

        if (e.type === EntityType.ZONE) {
            ctx.fillStyle = resolveColor(e.color, cbMode);
            ctx.fillRect(mx - w/2, my - h/2, w, h);
        } else if (e.type === EntityType.WALL) {
            ctx.fillStyle = '#555';
            if (e.color !== '#4a4a55' && e.color !== '#222' && e.color !== '#330505') ctx.fillStyle = resolveColor(e.color, cbMode);
            ctx.fillRect(mx - w/2, my - h/2, w, h);
        }
    });

    gameCtx.entities.current.forEach(e => {
        if (e.type === EntityType.WALL || e.type === EntityType.ZONE || e.type === EntityType.PARTICLE || e.type.includes('BULLET') || e.type.includes('DRONE') || e.type.includes('MISSILE') || e.type.includes('TRAP')) return;
        const mx = cx + (e.position.x * scale);
        const my = cy + (e.position.y * scale);
        if (mx < 0 || mx > width || my < 0 || my > height) return;

        let color = '#fff'; let size = 2; let isRect = false;
        if (e.type === EntityType.PLAYER) {
            if (e.id === 'player') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1;
                const vw = window.innerWidth * scale; const vh = window.innerHeight * scale;
                ctx.strokeRect(mx - vw/2, my - vh/2, vw, vh); color = '#fff'; size = 3;
            } else { color = e.teamId === 1 ? '#00f3ff' : '#ff0055'; size = 2.5; }
        } else if (e.type === EntityType.ENEMY) { color = '#ff0055'; size = e.name === 'GUARDIAN' ? 6 : 3; isRect = true; } 
        else if (e.type === EntityType.DUMMY_TARGET) { color = '#fff'; size = 2; } 
        else if (e.type.startsWith('FOOD')) { if (e.expValue && e.expValue >= 1000) { color = e.color; size = e.expValue > 10000 ? 4 : 2; } else return; } 
        else return;

        ctx.fillStyle = resolveColor(color, cbMode);
        ctx.beginPath();
        if (isRect) ctx.fillRect(mx - size/2, my - size/2, size, size); else { ctx.arc(mx, my, Math.max(0, size), 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, width, height);
};

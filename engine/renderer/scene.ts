
import { GameContext } from '../GameContext';
import { EntityType } from '../../types';
import { COLORS, EVOLUTION_TREE } from '../../constants';
import { resolveColor } from '../utils';
import { drawStars, drawLightningBeams, drawSkillEffects, drawShockwaves } from './effects';
import { drawPoly, drawFlagOverlay } from './utils';
import { drawTank } from './tanks';

export const drawScene = (gameCtx: GameContext) => {
    const canvas = gameCtx.canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    const settings = gameCtx.settings.current;
    const cbMode = settings.accessibility.colorblindMode;
    const isMobile = gameCtx.isMobile.current;
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
    const tick = gameCtx.globalTick.current;

    const camOffset = { x: gameCtx.camera.current.x - (window.innerWidth/2), y: gameCtx.camera.current.y - (window.innerHeight/2) };

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    drawStars(ctx, gameCtx, window.innerWidth, window.innerHeight, camOffset);

    // Render Entities
    gameCtx.entities.current.sort((a,b) => a.depth - b.depth).forEach(e => {
       const x = e.position.x - camOffset.x;
       const y = e.position.y - camOffset.y;
       if (x < -200 || x > window.innerWidth + 200 || y < -200 || y > window.innerHeight + 200) return;

       ctx.save();
       ctx.translate(x, y);

       // --- DROP-IN LOGIC MAGIC ---
       // @ts-ignore
       if (e.isDropIn && e.dropInTimer > 0) {
           // @ts-ignore
           const t = e.dropInTimer / 60;
           ctx.scale(1 + t * 2, 1 + t * 2);
           ctx.globalAlpha = 1 - t;
           // Draw Scanning Ring
           ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.arc(0, 0, e.radius * (1+t), 0, Math.PI*2); ctx.stroke();
           // @ts-ignore
           e.dropInTimer--;
           // @ts-ignore
           if (e.dropInTimer <= 0) e.isDropIn = false;
       }

       const resolvedColor = resolveColor(e.color, cbMode);
       
       if (e.type === EntityType.PLAYER || e.type === EntityType.ENEMY) {
           let weapon = EVOLUTION_TREE.find(w => w.id === e.weaponId) || EVOLUTION_TREE[0];
           if (e.skillState?.active) drawSkillEffects(ctx, e, weapon.skill!.type, tick);
           ctx.rotate(e.rotation);
           const barrelScale = e.radius / (e.baseRadius || 24);
           drawTank(ctx, e, weapon, barrelScale, resolvedColor, tick, cbMode);
       } else if (e.type.startsWith('FOOD')) {
           ctx.fillStyle = resolvedColor;
           drawPoly(ctx, 0, 0, e.radius, e.type === EntityType.FOOD_SQUARE ? 4 : (e.type === EntityType.FOOD_TRIANGLE ? 3 : 5));
           ctx.fill();
           ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
       } else if (e.type === EntityType.BULLET) {
           ctx.fillStyle = resolvedColor;
           ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI*2); ctx.fill();
       } else if (e.type === EntityType.WALL) {
           // @ts-ignore
           ctx.fillStyle = resolvedColor; ctx.fillRect(-(e.width||0)/2, -(e.height||0)/2, e.width||0, e.height||0);
       }
       
       ctx.restore();

       // Health Bars for damaged entities
       if (e.health < e.maxHealth && e.type !== 'WALL') {
           const bw = e.radius * 2;
           ctx.fillStyle = '#000'; ctx.fillRect(x - bw/2, y + e.radius + 10, bw, 4);
           ctx.fillStyle = '#0f0'; ctx.fillRect(x - bw/2, y + e.radius + 10, bw * (e.health/e.maxHealth), 4);
       }

       // Name tags for players
       if (e.name && e.type === EntityType.PLAYER) {
           ctx.font = 'bold 12px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
           ctx.fillText(e.name, x, y - e.radius - 10);
       }
    });

    // Particle Rendering
    gameCtx.particles.current.forEach(p => {
        const px = p.position.x - camOffset.x;
        const py = p.position.y - camOffset.y;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(px, py, p.size * p.life, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
};

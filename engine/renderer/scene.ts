
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
    const qualityScale = settings.graphics.resolution / 100;
    const isMobile = gameCtx.isMobile.current;
    const useBloom = isMobile ? false : settings.graphics.bloom; 
    const useShadows = isMobile ? false : settings.graphics.shadows; 
    const dpr = (isMobile ? 1 : Math.min(window.devicePixelRatio, 2)) * qualityScale;
    const targetW = window.innerWidth * dpr; const targetH = window.innerHeight * dpr;
    const tick = gameCtx.globalTick.current;

    if (Math.abs(canvas.width - targetW) > 10 || Math.abs(canvas.height - targetH) > 10) { 
        canvas.width = targetW; canvas.height = targetH; if (!isMobile) ctx.scale(dpr, dpr);
    }
    
    const shakeX = settings.graphics.shake ? (Math.random()-0.5) * gameCtx.camera.current.shake : 0;
    const shakeY = settings.graphics.shake ? (Math.random()-0.5) * gameCtx.camera.current.shake : 0;
    const camOffset = { x: gameCtx.camera.current.x - (window.innerWidth/2) + shakeX, y: gameCtx.camera.current.y - (window.innerHeight/2) + shakeY };

    ctx.fillStyle = COLORS.background; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (!isMobile || settings.graphics.particles > 50) {
        drawStars(ctx, gameCtx, window.innerWidth, window.innerHeight, camOffset);
    }

    const gridOpacity = settings.graphics.gridVisibility / 100;
    if (gridOpacity > 0) {
        const firstWall = gameCtx.entities.current.find(e => e.type === EntityType.WALL);
        let gridColor = COLORS.grid; let gridSize = 50;
        if (firstWall) {
            if (firstWall.color === '#222') { gridColor = '#111'; gridSize = 100; } 
            else if (firstWall.color === '#330505') { gridColor = '#250a0a'; } 
            else if (firstWall.color === '#ddd') { gridColor = '#25200a'; } 
        }
        ctx.globalAlpha = gridOpacity; ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.beginPath();
        const startX = (window.innerWidth/2 - camOffset.x) % gridSize; const startY = (window.innerHeight/2 - camOffset.y) % gridSize;
        for(let x=startX - gridSize; x<window.innerWidth; x+=gridSize) { ctx.moveTo(x,0); ctx.lineTo(x, window.innerHeight); }
        for(let y=startY - gridSize; y<window.innerHeight; y+=gridSize) { ctx.moveTo(0,y); ctx.lineTo(window.innerWidth, y); }
        ctx.stroke(); ctx.globalAlpha = 1.0;
    }

    if (settings.interface.aimLine && !isMobile) {
        const cx = window.innerWidth / 2; const cy = window.innerHeight / 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(gameCtx.mouse.current.x, gameCtx.mouse.current.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }

    drawLightningBeams(ctx, gameCtx, camOffset, useBloom);
    drawShockwaves(ctx, gameCtx, camOffset); 

    const useChromatic = settings.graphics.chromaticAberration && !isMobile;
    
    gameCtx.entities.current.sort((a,b) => a.depth - b.depth).forEach(e => {
       const x = e.position.x - camOffset.x; const y = e.position.y - camOffset.y;
       const cullRadius = e.type === EntityType.ZONE || e.type === EntityType.WALL ? Math.max(e.width||0, e.height||0)/2 : e.radius;
       if (x < -cullRadius - 100 || x > window.innerWidth + cullRadius + 100 || y < -cullRadius - 100 || y > window.innerHeight + cullRadius + 100) return;

       ctx.save(); ctx.translate(x, y);

       let alpha = 1.0;
       const resolvedColor = resolveColor(e.color, cbMode); 
       
       if (e.type === EntityType.PLAYER && e.skillState?.active) {
           const weapon = EVOLUTION_TREE.find(w => w.id === e.weaponId);
           const skillType = weapon?.skill?.type;
           if (skillType === 'STEALTH' || skillType === 'PHANTOM_STEP') {
               alpha = 0.15;
               if (useChromatic && Math.random() > 0.8) {
                   ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*5);
                   ctx.fillStyle = '#00f3ff'; ctx.globalAlpha = 0.4;
                   ctx.fillRect((Math.random()-0.5)*e.radius, (Math.random()-0.5)*e.radius, Math.random()*20, 2);
               }
           } else if (skillType === 'TELEPORT' && useChromatic) { ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 20; }
       }
       ctx.globalAlpha = alpha;

       // --- TRAIL RENDERING ---
       if (e.type === EntityType.PLAYER && e.trailId && e.trailId !== 'NONE' && (Math.abs(e.velocity.x) > 0.1 || Math.abs(e.velocity.y) > 0.1)) {
           if (tick % 3 === 0) { 
               const trailId = e.trailId;
               let type: any = 'smoke'; let color = '#fff'; let size = 4;
               if (trailId === 'EMBER') { type = 'fire'; color = '#ff4400'; size = 6; }
               else if (trailId === 'FROST') { type = 'snow'; color = '#a5f3fc'; }
               else if (trailId === 'ELECTRIC') { type = 'spark'; color = '#00ffff'; }
               else if (trailId === 'RAINBOW') { type = 'smoke'; color = `hsl(${(tick * 5) % 360}, 100%, 50%)`; }
               else if (trailId === 'MATRIX') { type = 'code'; color = '#00ff00'; }
               else if (trailId === 'PIXEL') { type = 'pixel'; color = '#fff'; }
               else if (trailId === 'HEARTS') { type = 'heart'; color = '#ff69b4'; }
               else if (trailId === 'SHADOW') { type = 'smoke'; color = '#000'; }

               gameCtx.particles.current.push({
                   id: Math.random().toString(),
                   position: { ...e.position },
                   velocity: { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2 },
                   life: 1.0, maxLife: 1.0, size, color, type, 
                   text: type === 'code' ? String.fromCharCode(48+Math.round(Math.random())) : undefined,
                   rotation: Math.random() * Math.PI
               });
           }
       }

       if (e.type === EntityType.ZONE) {
           // @ts-ignore
           const w = e.width; const h = e.height; ctx.fillStyle = resolvedColor; ctx.fillRect(-w/2, -h/2, w, h);
           if (!isMobile) { ctx.strokeStyle = resolvedColor.replace('0.08', '0.2'); ctx.lineWidth = 2; ctx.strokeRect(-w/2, -h/2, w, h); }
       } else if (e.type === EntityType.WALL) {
          // @ts-ignore
          const w = e.width; const h = e.height;
          ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.save(); ctx.clip(); ctx.fillStyle = resolvedColor; ctx.fill();
          if (e.color === '#330505') {
              ctx.fillStyle = '#000'; ctx.beginPath(); const stripeW = 40; const diagSize = w + h;
              for(let i = -diagSize; i < diagSize; i += stripeW * 2) { ctx.moveTo(i, -h); ctx.lineTo(i + stripeW, -h); ctx.lineTo(i + stripeW - h, h*2); ctx.lineTo(i - h, h*2); }
              ctx.fill(); ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 8; ctx.strokeRect(-w/2, -h/2, w, h);
          } else {
              ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-w/2 + 5, -h/2 + 5, w - 10, h - 10); 
              const isTeamWall = e.color === '#0044aa' || e.color === '#aa0044';
              if (useBloom && !isMobile && isTeamWall) {
                  ctx.strokeStyle = resolveColor(e.color === '#0044aa' ? '#00f3ff' : '#ff0055', cbMode);
                  ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 15; ctx.lineWidth = 4; ctx.strokeRect(-w/2, -h/2, w, h); ctx.shadowBlur = 0;
              } else if (e.color === '#ddd') { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.strokeRect(-w/2, -h/2, w, h); } 
              else { ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(-w/2, -h/2, w, h); }
          }
          ctx.restore(); 
       } else {
          if (e.name === 'GUARDIAN') {
              ctx.rotate(e.rotation);
              if (useShadows && !isMobile) { ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 30; }
              ctx.beginPath(); const spikes = 8; const outerRadius = Math.max(0, e.radius); const innerRadius = Math.max(0, e.radius * 0.6);
              for(let i=0; i<spikes*2; i++) { const r = i%2===0 ? outerRadius : innerRadius; const angle = (Math.PI * i) / spikes; if(i===0) ctx.moveTo(r*Math.cos(angle), r*Math.sin(angle)); else ctx.lineTo(r*Math.cos(angle), r*Math.sin(angle)); }
              ctx.closePath(); ctx.fillStyle = '#1a0505'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = resolveColor('#ff0033', cbMode); ctx.stroke(); ctx.shadowBlur = 0;
          } else {
             if (e.type === EntityType.PLAYER || e.type === EntityType.ENEMY) {
                let weapon = EVOLUTION_TREE.find(w => w.id === e.weaponId) || EVOLUTION_TREE[0];
                
                if (e.skillState?.active && weapon.skill) {
                    drawSkillEffects(ctx, e, weapon.skill.type, tick);
                }

                if (e.skillState?.active && (weapon.skill?.type === 'DASH' || weapon.skill?.type === 'PHANTOM_STEP')) {
                     ctx.save();
                     const trailCount = isMobile ? 1 : 2;
                     for(let i=1; i<=trailCount; i++) {
                         ctx.translate(-e.velocity.x * i * 3, -e.velocity.y * i * 3);
                         ctx.globalAlpha = 0.3 / i;
                         ctx.fillStyle = resolveColor('#00f3ff', cbMode);
                         ctx.beginPath(); ctx.arc(0,0, Math.max(0, e.radius), 0, Math.PI*2); ctx.fill();
                     }
                     ctx.restore();
                }

                ctx.rotate(e.rotation);
                
                const barrelScale = e.radius / (e.baseRadius || 24); 
                
                // DELEGATE TO TANK RENDERER
                drawTank(ctx, e, weapon, barrelScale, resolvedColor, tick, cbMode);
             }
          }

          ctx.rotate(e.rotation); 
          ctx.globalAlpha = 1.0; 
          
          if (e.type === EntityType.BULLET || e.type === EntityType.LASER_BOLT) {
             const r = Math.max(0, e.radius);
             
             // --- CUSTOM BULLET RENDERING ---
             if (e.weaponId === 'cluster_launcher') {
                 // CANISTER SHELL
                 ctx.fillStyle = '#18181b';
                 ctx.fillRect(-r*1.5, -r/2, r*3, r);
                 // Warning stripes
                 ctx.fillStyle = '#fbbf24';
                 ctx.fillRect(-r/2, -r/2, r, r);
                 // Blinking Light
                 if (tick % 10 < 5) {
                     ctx.fillStyle = '#ef4444';
                     ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
                     ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
                     ctx.shadowBlur = 0;
                 }
             }
             else if (e.weaponId === 'supernova') {
                 // UNSTABLE CORE
                 const pulse = 1 + Math.sin(tick * 0.5) * 0.2;
                 const coreR = r * pulse;
                 
                 if(useBloom) { ctx.shadowColor = resolvedColor; ctx.shadowBlur = 30; }
                 
                 // Inner Core
                 ctx.fillStyle = '#fff';
                 ctx.beginPath(); ctx.arc(0,0, coreR * 0.6, 0, Math.PI*2); ctx.fill();
                 
                 // Plasma Shell
                 ctx.fillStyle = resolvedColor;
                 ctx.globalAlpha = 0.6;
                 ctx.beginPath(); 
                 // Distorted Circle
                 for(let i=0; i<8; i++) {
                     const a = (i/8)*Math.PI*2 + (tick*0.1);
                     const dist = coreR + (Math.random() * 5);
                     if(i===0) ctx.moveTo(Math.cos(a)*dist, Math.sin(a)*dist);
                     else ctx.lineTo(Math.cos(a)*dist, Math.sin(a)*dist);
                 }
                 ctx.fill();
                 ctx.globalAlpha = 1.0;
                 ctx.shadowBlur = 0;
                 
                 // Lightning Arcs
                 if(Math.random() > 0.5) {
                     ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
                     ctx.beginPath(); ctx.moveTo(0,0);
                     ctx.lineTo((Math.random()-0.5)*r*3, (Math.random()-0.5)*r*3);
                     ctx.stroke();
                 }
             }
             // --- END CUSTOM RENDERING ---
             
             // Standard Projectiles
             else if (e.isFlame) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = resolvedColor; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'source-over'; } 
             else if (e.type === EntityType.LASER_BOLT) { const len = r * 12; const wid = r * 0.6; if (useBloom) { ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = resolvedColor; ctx.shadowBlur = 20; } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-len/2, -wid/2, len, wid, wid/2); ctx.fill(); ctx.strokeStyle = resolvedColor; ctx.lineWidth = 4; ctx.stroke(); ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over'; } 
             else { if (useBloom && !isMobile) { ctx.shadowColor = resolvedColor; ctx.shadowBlur = r * 0.8; } const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, resolvedColor); grad.addColorStop(0.9, resolvedColor); grad.addColorStop(1, '#000000'); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); if (r > 6) { ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.stroke(); } ctx.shadowBlur = 0; }
          } else if (e.type === EntityType.WAVE) { ctx.globalCompositeOperation = 'lighter'; const alpha = Math.max(0, e.maxHealth / (e.lifeTime || 50)); ctx.strokeStyle = resolvedColor; ctx.lineWidth = 4; ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, e.radius), 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 2; ctx.globalAlpha = alpha * 0.5; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, e.radius * 0.8), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'source-over'; } 
          else if (e.type === EntityType.MISSILE) { const w = e.radius * 2.5; const h = Math.max(0, e.radius * 0.8); ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(-w/2, -h); ctx.lineTo(-w/2 + w*0.3, 0); ctx.lineTo(-w/2, h); ctx.fill(); const bodyGrad = ctx.createLinearGradient(0, -h, 0, h); bodyGrad.addColorStop(0, '#9ca3af'); bodyGrad.addColorStop(0.5, '#e5e7eb'); bodyGrad.addColorStop(1, '#9ca3af'); ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w*0.8, h, 2); ctx.fill(); ctx.fillStyle = resolvedColor; ctx.beginPath(); ctx.ellipse(w*0.3, 0, h*0.8, h/2, 0, -Math.PI/2, Math.PI/2); ctx.fill(); if (gameCtx.globalTick.current % 2 === 0) { ctx.shadowBlur = 10; ctx.shadowColor = '#f97316'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-w/2 - 2, 0, Math.max(0, h/2), 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } } 
          else if (e.type === EntityType.TRAP) { const r = e.radius; ctx.beginPath(); for(let i=0; i<3; i++) { const angle = (i * 2 * Math.PI / 3) + Math.PI/2; if(i===0) ctx.moveTo(r*Math.cos(angle), r*Math.sin(angle)); else ctx.lineTo(r*Math.cos(angle), r*Math.sin(angle)); } ctx.closePath(); ctx.fillStyle = '#18181b'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = resolvedColor; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r*0.35), 0, Math.PI*2); ctx.fillStyle = resolvedColor; if (useBloom && !isMobile) { ctx.shadowBlur = 15; ctx.shadowColor = resolvedColor; } ctx.fill(); ctx.shadowBlur = 0; } 
          else if (e.type === EntityType.DRONE_SWARM) { ctx.fillStyle = resolvedColor; if(useBloom) { ctx.shadowColor = resolvedColor; ctx.shadowBlur = 5; } const r = e.radius; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r, r*0.6); ctx.lineTo(-r*0.5, 0); ctx.lineTo(-r, -r*0.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-r, -1, 2, 2); ctx.shadowBlur = 0; } 
          else if (e.type === EntityType.DRONE_TRIANGLE || e.type === EntityType.DRONE_SQUARE || e.type === EntityType.DRONE_MINION) { 
              const r = Math.max(0, e.radius);
              const sides = e.type === EntityType.DRONE_SQUARE ? 4 : 3;
              const dGrad = ctx.createRadialGradient(0,0,0,0,0,r);
              dGrad.addColorStop(0, resolvedColor);
              dGrad.addColorStop(1, '#000');
              ctx.fillStyle = dGrad;
              drawPoly(ctx, 0, 0, r, sides);
              ctx.fill();
              ctx.strokeStyle = '#222';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.fillStyle = '#fff';
              if(useBloom && !isMobile) { ctx.shadowColor = resolvedColor; ctx.shadowBlur = 10; } 
              ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI*2); ctx.fill(); 
              ctx.shadowBlur = 0;
          } 
          else {
             // Food Rendering
             const r = e.radius;
             const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
             grad.addColorStop(0, '#ffffff'); 
             grad.addColorStop(0.3, resolvedColor);
             grad.addColorStop(1, '#000000'); 

             if (useBloom && !isMobile && e.expValue && e.expValue > 1000) {
                 ctx.shadowColor = resolvedColor;
                 ctx.shadowBlur = e.expValue > 10000 ? 30 : 15;
             }

             if (e.type === EntityType.FOOD_TESSERACT) {
                 ctx.strokeStyle = resolvedColor; ctx.lineWidth = 3;
                 ctx.save(); ctx.rotate(tick * 0.02);
                 const s = r * 0.8; ctx.strokeRect(-s, -s, s*2, s*2);
                 ctx.rotate(tick * -0.04); const innerS = s * 0.5;
                 ctx.fillStyle = resolvedColor + '44'; ctx.fillRect(-innerS, -innerS, innerS*2, innerS*2);
                 ctx.strokeRect(-innerS, -innerS, innerS*2, innerS*2);
                 ctx.restore();
                 ctx.save();
                 if (tick % 10 === 0) {
                     ctx.fillStyle = '#fff'; const px = (Math.random()-0.5) * r * 2; const py = (Math.random()-0.5) * r * 2; ctx.fillRect(px, py, 2, 2);
                 }
                 ctx.restore();
             } else if (e.type === EntityType.FOOD_ICOSAHEDRON) {
                 const points = 6;
                 ctx.fillStyle = resolvedColor + '22'; ctx.strokeStyle = resolvedColor; ctx.lineWidth = 2;
                 ctx.beginPath();
                 for (let i = 0; i < points; i++) { const a = (i * 2 * Math.PI / points) + (tick * 0.01); if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
                 ctx.closePath(); ctx.fill(); ctx.stroke();
                 ctx.beginPath(); for (let i = 0; i < points; i++) { const a = (i * 2 * Math.PI / points) + (tick * 0.01); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.stroke();
                 ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(r*0.3, -r*0.3, r*0.1, 0, Math.PI*2); ctx.fill();
             } else if (e.type === EntityType.FOOD_OCTAGON) {
                 ctx.fillStyle = grad; drawPoly(ctx, 0, 0, r, 8); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#b45309'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; drawPoly(ctx, 0, 0, r*0.7, 8); ctx.stroke();
             } else if (e.type === EntityType.FOOD_STAR) {
                 const spikes = 5; const outer = r; const inner = r * 0.4;
                 ctx.fillStyle = grad; ctx.beginPath(); for(let i=0; i<spikes*2; i++) { const rad = i%2===0 ? outer : inner; const a = (Math.PI * i) / spikes + (tick * 0.02); if(i===0) ctx.moveTo(rad*Math.cos(a), rad*Math.sin(a)); else ctx.lineTo(rad*Math.cos(a), rad*Math.sin(a)); }
                 ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
             } else if (e.type === EntityType.FOOD_GEM) {
                 ctx.save(); ctx.rotate(Math.PI/4); ctx.fillStyle = resolvedColor; ctx.fillRect(-r/2, -r/2, r, r);
                 ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(-r/2, -r/2); ctx.lineTo(r/2, -r/2); ctx.lineTo(0, 0); ctx.fill(); ctx.restore();
             } else {
                 let sides = 0;
                 if (e.type === EntityType.FOOD_SQUARE) sides = 4; else if (e.type === EntityType.FOOD_TRIANGLE) sides = 3; else if (e.type === EntityType.FOOD_PENTAGON || e.type === EntityType.FOOD_ALPHA_PENTAGON) sides = 5; else if (e.type === EntityType.FOOD_HEXAGON) sides = 6;
                 if (sides > 0) {
                     ctx.fillStyle = resolvedColor;
                     const depth = 3; for(let d = depth; d > 0; d--) { ctx.fillStyle = d === 1 ? resolvedColor : 'rgba(0,0,0,0.2)'; if (e.type === EntityType.FOOD_ALPHA_PENTAGON) { if (d===1) { ctx.fillStyle = grad; } drawPoly(ctx, 0, 0, r, sides); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#222'; ctx.stroke(); } else { drawPoly(ctx, 0, 0, r, sides); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#222'; ctx.stroke(); } }
                     ctx.fillStyle = 'rgba(255,255,255,0.1)'; drawPoly(ctx, 0, 0, r * 0.5, sides); ctx.fill();
                 }
             }
             ctx.shadowBlur = 0; 
          }
       }
       ctx.restore();

       if (e.chatText && e.chatTimer && e.chatTimer > 0) {
           ctx.save(); ctx.translate(x, y - e.radius - 30); e.chatTimer -= 1; const text = e.chatText;
           ctx.font = 'bold 12px "JetBrains Mono", monospace'; const textMetrics = ctx.measureText(text); const p = 8; const textW = textMetrics.width; const boxW = textW + p * 2; const boxH = 24;
           ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-boxW/2, -boxH, boxW, boxH, 4); else ctx.rect(-boxW/2, -boxH, boxW, boxH); ctx.fill(); ctx.stroke();
           ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, -boxH/2);
           ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.closePath(); ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fill(); ctx.restore();
       }

       if (e.statusEffects && e.statusEffects.length > 0) {
           const screenX = e.position.x - camOffset.x; const screenY = e.position.y - camOffset.y;
           e.statusEffects.forEach(s => {
               if (s.type === 'BURN') { ctx.fillStyle = `rgba(255, 60, 0, ${0.3 + Math.sin(gameCtx.globalTick.current * 0.2) * 0.1})`; ctx.beginPath(); ctx.arc(screenX, screenY, Math.max(0, e.radius * 1.2), 0, Math.PI * 2); ctx.fill(); } 
               else if (s.type === 'FREEZE') { ctx.fillStyle = 'rgba(0, 200, 255, 0.4)'; ctx.beginPath(); ctx.arc(screenX, screenY, Math.max(0, e.radius * 1.1), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(200, 255, 255, 0.6)'; ctx.lineWidth = 2; ctx.stroke(); } 
               else if (s.type === 'SHOCK') { ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.beginPath(); for(let k=0; k<5; k++) { const a1 = Math.random() * Math.PI * 2; const r1 = e.radius; const r2 = e.radius * 1.5; ctx.moveTo(screenX + Math.cos(a1)*r1, screenY + Math.sin(a1)*r1); ctx.lineTo(screenX + Math.cos(a1)*r2, screenY + Math.sin(a1)*r2); } ctx.stroke(); } 
               else if (s.type === 'CORROSION') { ctx.fillStyle = `rgba(0, 255, 50, ${0.3 + Math.cos(gameCtx.globalTick.current * 0.1) * 0.1})`; ctx.beginPath(); ctx.arc(screenX, screenY, Math.max(0, e.radius * 1.15), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#00ff44'; for(let k=0; k<3; k++) { const a1 = (gameCtx.globalTick.current * 0.1) + (k * 2); const r1 = e.radius * 1.2; ctx.beginPath(); ctx.arc(screenX + Math.cos(a1)*r1, screenY + Math.sin(a1)*r1, 3, 0, Math.PI*2); ctx.fill(); } }
           });
       }

       if ((e.type.startsWith('PLAYER') || e.type.startsWith('ENEMY') || e.type === EntityType.DUMMY_TARGET || e.type.startsWith('FOOD')) && !e.isGodMode) {
          if (e.health < e.maxHealth) { const barW = e.radius * 2; const pct = Math.max(0, e.health / e.maxHealth); ctx.fillStyle = '#000'; ctx.fillRect(x - barW/2, y + e.radius + 15, barW, 4); ctx.fillStyle = '#0f0'; ctx.fillRect(x - barW/2, y + e.radius + 15, barW * pct, 4); }
       }

       if (e.name && e.type === EntityType.PLAYER) {
           const isSelf = e.id === 'player';
           if (!isSelf || !isMobile) { 
               ctx.font = 'bold 12px "Rajdhani"'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillStyle = '#fff';
               let displayName = e.name; if (settings.interface.streamerMode && !isSelf) displayName = 'Player';
               ctx.fillText(displayName, x, y - e.radius - 12); ctx.shadowBlur = 0;
           }
       }
    });

    if (settings.graphics.damageNumbers) {
       gameCtx.particles.current.forEach((p) => {
           if (p.type === 'text' && p.text && /^\d+$/.test(p.text)) {
               const px = p.position.x - camOffset.x; const py = p.position.y - camOffset.y;
               ctx.save(); ctx.translate(px, py); ctx.globalAlpha = p.life; ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Rajdhani"'; ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.strokeText(p.text, 0, 0); ctx.fillText(p.text, 0, 0); ctx.restore();
           }
       });
    }

    gameCtx.particles.current.forEach((p) => {
       if (p.life <= 0) return;
       if (settings.graphics.damageNumbers && p.type === 'text' && p.text && /^\d+$/.test(p.text)) return; 
       const px = p.position.x - camOffset.x; const py = p.position.y - camOffset.y;
       
       // Optimization: Simple Cull for particles off screen
       if (px < -50 || px > window.innerWidth + 50 || py < -50 || py > window.innerHeight + 50) return;

       ctx.save(); ctx.translate(px, py); ctx.globalAlpha = p.life;
       const safeSize = Math.max(0, p.size); const pColor = resolveColor(p.color, cbMode);

       if (p.type === 'explosion_core') {
           // --- NEW EXPLOSION CORE RENDERING ---
           // One big optimized draw call for the main blast
           ctx.globalCompositeOperation = 'lighter';
           
           // Core Flash
           const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, safeSize);
           gradient.addColorStop(0, '#ffffff'); // Center hot white
           gradient.addColorStop(0.3, pColor);  // Mid color (Orange/Purple)
           gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Fade out edge
           
           // Animate expansion slightly with life
           const scale = 1 + (1 - p.life) * 0.5;
           ctx.scale(scale, scale);
           
           ctx.fillStyle = gradient;
           ctx.beginPath(); ctx.arc(0, 0, safeSize, 0, Math.PI*2); ctx.fill();
           
           // Optional ring shockwave attached to core
           if (p.life > 0.5) {
               ctx.strokeStyle = '#ffffff';
               ctx.lineWidth = 2 * p.life;
               ctx.beginPath(); ctx.arc(0, 0, safeSize * 0.8, 0, Math.PI*2); ctx.stroke();
           }
       }
       else if (p.type === 'muzzle_flash') { const scale = 1 + (1 - p.life) * 1.5; ctx.scale(scale, scale * 0.6); ctx.rotate(p.rotation || 0); const gradient = ctx.createRadialGradient(0,0, 0, 0,0, safeSize); gradient.addColorStop(0, '#fff'); gradient.addColorStop(0.4, '#fff700'); gradient.addColorStop(1, 'rgba(255, 100, 0, 0)'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, safeSize, 0, Math.PI*2); ctx.fill(); } 
       else if (p.type === 'casing') { ctx.rotate(p.rotation || 0); ctx.fillStyle = '#facc15'; ctx.fillRect(-2, -1, 4, 2); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1; ctx.strokeRect(-2, -1, 4, 2); }
       else if (p.type === 'bubble') { ctx.fillStyle = pColor; ctx.globalAlpha = p.life * 0.8; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, safeSize * p.life), 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#ccffcc'; ctx.lineWidth = 1; ctx.stroke(); }
       else if (p.type === 'text') { ctx.font = '900 16px "Rajdhani", sans-serif'; if (!isMobile) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(p.text || '', 0, 0); } ctx.fillStyle = pColor; ctx.fillText(p.text || '', 0, 0); }
       else if (p.type === 'glitch' || p.type === 'energy_arc') { 
           ctx.globalCompositeOperation = 'lighter';
           ctx.fillStyle = resolveColor('#00f3ff', cbMode); 
           ctx.fillRect((Math.random()-0.5)*30, (Math.random()-0.5)*50, Math.random()*20, 2); 
       }
       else if (p.type === 'code') {
           ctx.fillStyle = '#00ff00'; ctx.font = '12px monospace'; ctx.fillText(p.text || '0', 0, 0);
       }
       else if (p.type === 'pixel') {
           ctx.fillStyle = pColor; ctx.fillRect(-safeSize/2, -safeSize/2, safeSize, safeSize);
       }
       else if (p.type === 'heart') {
           ctx.fillStyle = pColor; ctx.font = '12px sans-serif'; ctx.fillText('❤', 0, 0);
       }
       else if (p.type === 'debris') {
           ctx.fillStyle = pColor; 
           ctx.save();
           ctx.rotate(p.rotation || 0);
           const s = safeSize * 0.8;
           ctx.fillRect(-s/2, -s/2, s, s);
           ctx.restore();
       }
       else { ctx.fillStyle = pColor; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, safeSize * p.life), 0, Math.PI*2); ctx.fill(); }
       ctx.restore(); ctx.globalAlpha = 1;
    });

    if (!isMobile && settings.interface.crosshairType !== 'OFF') {
        const mx = gameCtx.mouse.current.x; const my = gameCtx.mouse.current.y; const xColor = resolveColor(settings.interface.crosshairColor, cbMode);
        ctx.strokeStyle = xColor; ctx.fillStyle = xColor; ctx.lineWidth = 2; ctx.beginPath();
        if (settings.interface.crosshairType === 'DOT') { ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill(); } 
        else if (settings.interface.crosshairType === 'CROSS') { ctx.moveTo(mx - 8, my); ctx.lineTo(mx + 8, my); ctx.moveTo(mx, my - 8); ctx.lineTo(mx, my + 8); ctx.stroke(); } 
        else if (settings.interface.crosshairType === 'CIRCLE') { ctx.arc(mx, my, 8, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(mx, my, 1, 0, Math.PI * 2); ctx.fill(); } 
        else { ctx.moveTo(mx - 10, my); ctx.lineTo(mx - 4, my); ctx.moveTo(mx + 10, my); ctx.lineTo(mx + 4, my); ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my - 4); ctx.moveTo(mx, my + 10); ctx.lineTo(mx, my + 4); ctx.stroke(); }
    }

    if (gameCtx.joystick.current.active) { 
        ctx.save(); ctx.globalAlpha = settings.controls.joystickOpacity / 100; const sizeScale = settings.controls.joystickSize / 100;
        ctx.beginPath(); ctx.arc(gameCtx.joystick.current.origin.x, gameCtx.joystick.current.origin.y, 40 * sizeScale, 0, Math.PI*2); ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(gameCtx.joystick.current.curr.x, gameCtx.joystick.current.curr.y, 20 * sizeScale, 0, Math.PI*2); ctx.fillStyle = 'rgba(0, 243, 255, 0.5)'; ctx.fill(); ctx.restore(); 
    }
    
    if (window.innerWidth < 800) { 
        ctx.save(); ctx.globalAlpha = settings.controls.joystickOpacity / 100; const fireBtnX = window.innerWidth - 80; const fireBtnY = window.innerHeight - 80; const sizeScale = settings.controls.joystickSize / 100;
        ctx.beginPath(); ctx.arc(fireBtnX, fireBtnY, 35 * sizeScale, 0, Math.PI*2); ctx.fillStyle = gameCtx.fireButton.current.active ? 'rgba(255, 50, 50, 0.6)' : 'rgba(255, 50, 50, 0.3)'; ctx.fill(); ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('FIRE', fireBtnX - 12, fireBtnY + 4); ctx.restore(); 
    }

    if (!isMobile) {
        const gradient = ctx.createRadialGradient(window.innerWidth/2, window.innerHeight/2, window.innerHeight/1.5, window.innerWidth/2, window.innerHeight/2, window.innerHeight);
        gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient; ctx.fillRect(0,0, window.innerWidth, window.innerHeight);
    }
};
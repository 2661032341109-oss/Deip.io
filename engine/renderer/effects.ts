import { Entity, SkillType, Shockwave } from '../../types';
import { GameContext } from '../GameContext';
import { resolveColor } from '../utils';

export const drawSkillEffects = (ctx: CanvasRenderingContext2D, e: Entity, skillType: SkillType, tick: number) => {
    if (!e.skillState?.active) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bodyRadius = Math.max(0, e.radius);

    if (skillType === 'SHIELD' || skillType === 'NANO_ARMOR' || skillType === 'MIRROR_PRISM') {
        const color = skillType === 'NANO_ARMOR' ? '#00ff44' : (skillType === 'MIRROR_PRISM' ? '#ffffff' : '#00f3ff');
        const rotSpeed = skillType === 'MIRROR_PRISM' ? 0.1 : 0.02;
        
        ctx.save();
        ctx.rotate(-e.rotation); 
        ctx.rotate(tick * rotSpeed);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color; 
        ctx.shadowBlur = 15;

        const hexSize = bodyRadius * 1.8;
        ctx.beginPath();
        for(let i=0; i<6; i++) { 
            const angle = i * Math.PI / 3; 
            const hx = Math.cos(angle) * hexSize; 
            const hy = Math.sin(angle) * hexSize; 
            if(i===0) ctx.moveTo(hx,hy); else ctx.lineTo(hx,hy); 
        }
        ctx.closePath();
        ctx.fillStyle = color + '15'; 
        ctx.fill();
        ctx.stroke();
        
        const pulse = Math.sin(tick * 0.1) * 5;
        ctx.beginPath();
        ctx.arc(0,0, bodyRadius * 1.2 + pulse, 0, Math.PI*2);
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    } 
    else if (skillType === 'EMP' || skillType === 'GRAVITY_WELL' || skillType === 'CHRONO_FIELD' || skillType === 'TIME_WARP') {
        const color = skillType === 'GRAVITY_WELL' ? '#a855f7' : (skillType === 'TIME_WARP' ? '#000000' : '#ffff00');
        const maxRad = skillType === 'GRAVITY_WELL' ? 600 : (skillType === 'CHRONO_FIELD' || skillType === 'TIME_WARP' ? 500 : 500);
        const pulse = (tick % 40) / 40;
        
        if (skillType === 'TIME_WARP') {
            const wave = Math.sin(tick * 0.2);
            ctx.strokeStyle = '#00ff9d';
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 15]);
            ctx.beginPath(); ctx.arc(0, 0, maxRad * 0.8 + (wave * 20), 0, Math.PI*2); ctx.stroke();
            
            ctx.fillStyle = 'rgba(0, 255, 100, 0.05)';
            ctx.beginPath(); ctx.arc(0, 0, maxRad, 0, Math.PI*2); ctx.fill();
            
            ctx.save();
            ctx.rotate(-tick * 0.05);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 40]);
            ctx.beginPath(); ctx.arc(0, 0, maxRad * 0.6, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4 * (1-pulse);
            ctx.beginPath();
            ctx.arc(0, 0, bodyRadius + (pulse * maxRad/2), 0, Math.PI*2);
            ctx.stroke();
            
            ctx.fillStyle = color + '05';
            ctx.beginPath(); ctx.arc(0,0, maxRad/2, 0, Math.PI*2); ctx.fill();
        }
    }
    else if (skillType === 'BERSERK') {
        const scale = 1 + Math.sin(tick * 0.5) * 0.1;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(0, 0, bodyRadius * 1.5 * scale, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const spikes = 12;
        for(let i=0; i<spikes*2; i++) {
            const r = (i%2===0 ? bodyRadius*1.2 : bodyRadius*1.8) * scale;
            const a = (Math.PI*i)/spikes + (tick*0.1);
            if(i===0) ctx.moveTo(r*Math.cos(a), r*Math.sin(a)); else ctx.lineTo(r*Math.cos(a), r*Math.sin(a));
        }
        ctx.closePath(); ctx.stroke();
    }
    else if (skillType === 'ORBITAL_BEAM') {
        const targetDist = 400;
        ctx.rotate(-e.rotation); 
        ctx.translate(Math.cos(e.rotation) * targetDist, Math.sin(e.rotation) * targetDist);
        
        ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#fff';
        const beamW = Math.random() * 20 + 10;
        
        const alpha = Math.abs(Math.sin(tick * 0.5));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(0,0, 40 + beamW, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, -1000); ctx.lineTo(0, 0); ctx.stroke();
        
        ctx.beginPath(); ctx.arc(0,0, 150 * alpha, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255,0,255,${1-alpha})`;
        ctx.stroke();
    }
    else if (skillType === 'THUNDER_STORM') {
        if (Math.random() > 0.8) {
            ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.beginPath();
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 300;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0, 350, 0, Math.PI*2); ctx.stroke();
    }

    ctx.restore();
};

export const drawStars = (ctx: CanvasRenderingContext2D, gameCtx: GameContext, width: number, height: number, camOffset: {x:number, y:number}) => {
    ctx.fillStyle = '#fff';
    
    gameCtx.stars.current.forEach(star => {
        const parallaxX = camOffset.x * star.layer * 0.1; 
        const parallaxY = camOffset.y * star.layer * 0.1;
        
        const wrapW = width + 200;
        const wrapH = height + 200;
        
        let x = (star.x - parallaxX) % wrapW;
        let y = (star.y - parallaxY) % wrapH;
        
        if (x < 0) x += wrapW;
        if (y < 0) y += wrapH;
        
        x -= 100;
        y -= 100;

        ctx.globalAlpha = star.alpha * (0.5 + Math.sin(gameCtx.globalTick.current * 0.01 * star.layer) * 0.3); 
        
        const size = star.size * (1 + star.layer); 
        ctx.beginPath(); 
        ctx.arc(x, y, size, 0, Math.PI*2); 
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

export const drawLightningBeams = (ctx: CanvasRenderingContext2D, gameCtx: GameContext, camOffset: {x:number, y:number}, useBloom: boolean) => {
    if (gameCtx.lightningBeams.current.length > 0) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
        
        gameCtx.lightningBeams.current.forEach(beam => {
            const bx1 = beam.x1 - camOffset.x; const by1 = beam.y1 - camOffset.y;
            const bx2 = beam.x2 - camOffset.x; const by2 = beam.y2 - camOffset.y;
            const dx = bx2 - bx1; const dy = by2 - by1; 
            const dist = Math.sqrt(dx*dx + dy*dy); 
            
            const maxJitter = Math.min(60, dist * 0.15); 
            const steps = Math.max(5, Math.ceil(dist / 30)); 

            ctx.beginPath(); 
            ctx.moveTo(bx1, by1);
            for (let i = 1; i < steps; i++) {
                const t = i / steps; 
                const jitter = (Math.random() - 0.5) * maxJitter; 
                const lx = bx1 + dx * t - (dy/dist) * jitter; 
                const ly = by1 + dy * t + (dx/dist) * jitter;
                ctx.lineTo(lx, ly);
            }
            ctx.lineTo(bx2, by2);
            
            if (useBloom) { 
                ctx.shadowBlur = 20; 
                ctx.shadowColor = '#ffff00'; 
            }
            
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)'; 
            ctx.lineWidth = 8; 
            ctx.stroke();
            
            ctx.shadowBlur = 0; 
            ctx.strokeStyle = '#ffffff'; 
            ctx.lineWidth = 3; 
            ctx.stroke();
            
            if (dist > 300 && Math.random() > 0.5) {
                const branchStart = 0.3 + Math.random() * 0.4; 
                const bSx = bx1 + dx * branchStart;
                const bSy = by1 + dy * branchStart;
                const branchLen = dist * 0.3;
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5);
                
                ctx.beginPath();
                ctx.moveTo(bSx, bSy);
                ctx.lineTo(bSx + Math.cos(angle)*branchLen, bSy + Math.sin(angle)*branchLen);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.stroke();
            }
        });
        
        ctx.globalCompositeOperation = 'source-over';
        gameCtx.lightningBeams.current = [];
    }
}

// --- NEW VISUAL EFFECT: SHOCKWAVES ---
export const drawShockwaves = (ctx: CanvasRenderingContext2D, gameCtx: GameContext, camOffset: {x:number, y:number}) => {
    if (gameCtx.shockwaves.current.length > 0) {
        ctx.lineWidth = 3;
        
        gameCtx.shockwaves.current.forEach(wave => {
            const x = wave.x - camOffset.x;
            const y = wave.y - camOffset.y;
            
            // Check visibility
            if (x < -wave.radius || x > window.innerWidth + wave.radius || y < -wave.radius || y > window.innerHeight + wave.radius) return;

            // Opacity fade based on life
            ctx.globalAlpha = Math.max(0, wave.life);
            
            // Distortion Ring (White core)
            ctx.strokeStyle = `rgba(255, 255, 255, ${wave.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, wave.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Color Edge (Bloom)
            if (gameCtx.settings.current.graphics.bloom) {
                ctx.shadowColor = wave.color;
                ctx.shadowBlur = 20;
                ctx.strokeStyle = wave.color;
                ctx.beginPath();
                ctx.arc(x, y, wave.radius - 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        });
        ctx.globalAlpha = 1.0;
    }
}
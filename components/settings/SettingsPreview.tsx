
import React, { useEffect, useRef } from 'react';
import { GameSettings } from '../../types';

interface SettingsPreviewProps {
    settings: GameSettings;
}

export const SettingsPreview: React.FC<SettingsPreviewProps> = ({ settings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimize
        if (!ctx) return;

        let frameId = 0;
        const particles: any[] = [];
        let tick = 0;

        // Colors for simulation
        const COLOR_BG = '#0a0a10';
        const COLOR_GRID = '#1a1a25';
        const COLOR_TANK = '#00f3ff';
        const COLOR_ENEMY = '#ff0055';

        const loop = () => {
            tick++;
            
            // --- 1. Resolution Simulation ---
            // We set the internal canvas size based on resolution %
            // CSS scales it back up to fill the container
            const pixelRatio = window.devicePixelRatio || 1;
            const resFactor = Math.max(0.1, settings.graphics.resolution / 100);
            
            const targetW = Math.floor(container.clientWidth * resFactor);
            const targetH = Math.floor(container.clientHeight * resFactor);

            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
                // Reset context state after resize
            }

            const width = canvas.width;
            const height = canvas.height;
            const cx = width / 2;
            const cy = height / 2;
            
            // Scale context to normalize coordinates to 0-100% space if needed, 
            // but easier here to just draw in the smaller space relative to new width/height
            
            // Clear
            ctx.fillStyle = COLOR_BG;
            ctx.fillRect(0, 0, width, height);

            // --- 2. Grid Visibility ---
            if (settings.graphics.gridVisibility > 0) {
                ctx.strokeStyle = COLOR_GRID;
                ctx.lineWidth = 1 * resFactor; // Scale line width down so it looks right scaled up
                ctx.globalAlpha = settings.graphics.gridVisibility / 100;
                const gridSize = 40 * resFactor;
                const offset = (tick * 0.5 * resFactor) % gridSize;
                
                ctx.beginPath();
                for(let x=0; x<width; x+=gridSize) { ctx.moveTo(x - offset, 0); ctx.lineTo(x - offset, height); }
                for(let y=0; y<height; y+=gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // --- 3. Shake ---
            ctx.save();
            if (settings.graphics.shake) {
                const shakeAmt = 2 * resFactor;
                ctx.translate((Math.random()-0.5)*shakeAmt, (Math.random()-0.5)*shakeAmt);
            }

            // --- 4. Bloom Simulation ---
            if (settings.graphics.bloom) {
                ctx.shadowBlur = 15 * resFactor;
                ctx.shadowColor = COLOR_TANK;
            } else {
                ctx.shadowBlur = 0;
            }

            // --- Draw Tank ---
            const tankSize = 20 * resFactor;
            const tankPos = { x: cx, y: cy };
            const rot = Math.sin(tick * 0.02) * 0.5;

            ctx.translate(tankPos.x, tankPos.y);
            ctx.rotate(rot);

            // Barrel
            ctx.fillStyle = '#333';
            ctx.fillRect(0, -tankSize/2.5, tankSize*1.8, tankSize*0.8);
            
            // Body
            ctx.fillStyle = COLOR_TANK;
            // Colorblind simulation simple shift
            if (settings.accessibility.colorblindMode === 'PROTANOPIA') ctx.fillStyle = '#0055ff';
            
            ctx.beginPath();
            ctx.arc(0, 0, tankSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2 * resFactor;
            ctx.stroke();
            
            // Muzzle Flash spawning
            if (tick % 20 === 0) {
                // Spawn particles based on density setting
                const spawnCount = Math.max(1, Math.floor(settings.graphics.particles / 20)); 
                
                for(let i=0; i<spawnCount; i++) {
                    if (particles.length < settings.graphics.particles) {
                        particles.push({
                            x: tankPos.x + Math.cos(rot) * (tankSize * 1.5),
                            y: tankPos.y + Math.sin(rot) * (tankSize * 1.5),
                            vx: Math.cos(rot + (Math.random()-0.5)*0.5) * (3 * resFactor),
                            vy: Math.sin(rot + (Math.random()-0.5)*0.5) * (3 * resFactor),
                            life: 1.0,
                            color: '#fff',
                            size: (Math.random() * 3 + 1) * resFactor
                        });
                    }
                }
            }
            ctx.restore();

            // --- Draw Particles ---
            for(let i = particles.length - 1; i>=0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                
                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.color;
                
                if (settings.graphics.bloom) {
                    ctx.shadowBlur = 5 * resFactor;
                    ctx.shadowColor = p.color;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;

            // --- 5. Damage Numbers ---
            if (settings.graphics.damageNumbers) {
                 if (tick % 60 === 0) {
                     particles.push({
                         x: cx + (50 * resFactor), y: cy - (50 * resFactor), 
                         vx: 0, vy: -1 * resFactor, life: 1.0, type: 'text', text: '42'
                     });
                 }
                 // Render text particles manually here
                 ctx.fillStyle = '#fff';
                 ctx.font = `bold ${12 * resFactor}px monospace`;
                 particles.filter(p => p.type === 'text').forEach(p => {
                     ctx.globalAlpha = p.life;
                     ctx.fillText(p.text, p.x, p.y);
                 });
                 ctx.globalAlpha = 1;
            }

            // --- 6. Chromatic Aberration ---
            if (settings.graphics.chromaticAberration) {
                // Simplified effect: Draw simple offset circles to represent channel split
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.beginPath(); ctx.arc(cx + (2*resFactor), cy, tankSize, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.beginPath(); ctx.arc(cx - (2*resFactor), cy, tankSize, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }

            frameId = requestAnimationFrame(loop);
        };
        loop();

        return () => cancelAnimationFrame(frameId);
    }, [settings]);

    return (
        <div 
            ref={containerRef}
            className="w-full h-48 md:h-full bg-black rounded-lg border border-white/10 relative overflow-hidden group shadow-inner"
        >
            <canvas 
                ref={canvasRef} 
                className="w-full h-full object-contain" 
                style={{ imageRendering: 'pixelated' }} // Critical for resolution preview
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                <div className="text-[10px] font-mono text-cyan-400 bg-black/60 px-2 rounded border border-cyan-500/30">
                    RES: {settings.graphics.resolution}%
                </div>
                <div className="text-[10px] font-mono text-yellow-400 bg-black/60 px-2 rounded border border-yellow-500/30">
                    PARTICLES: {settings.graphics.particles}
                </div>
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] font-mono text-white/30 bg-black/50 px-2 rounded">
                RENDER_PREVIEW_V2
            </div>
        </div>
    );
};

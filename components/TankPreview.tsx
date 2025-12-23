
import React, { useRef, useEffect } from 'react';
import { WeaponSchema, EntityType, TrailId, FlagId } from '../types';
import { COLORS } from '../constants';
import { resolveColor } from '../engine/utils';
import { ImageCache } from '../engine/ImageCache';

export type PreviewMode = 'TANK' | 'PROJECTILE' | 'SKILL' | 'STATUS';

interface TankPreviewProps {
  weapon: WeaponSchema;
  size?: number;
  color?: string;
  className?: string;
  mode?: PreviewMode;
  trailId?: TrailId; 
  flagId?: FlagId; 
}

export const TankPreview: React.FC<TankPreviewProps> = ({ 
  weapon, 
  size = 60, 
  color = COLORS.player,
  className = "",
  mode = 'TANK',
  trailId = 'NONE',
  flagId = 'NONE'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationId = 0;
    let tick = 0;

    const render = () => {
        tick++;
        ctx.clearRect(0, 0, size, size);
        const cx = size / 2;
        const cy = size / 2;

        const baseRadius = 24;
        let maxExtent = baseRadius;

        if (mode === 'TANK' || mode === 'SKILL') {
            if (weapon.barrels && weapon.barrels.length > 0) {
                weapon.barrels.forEach(b => {
                    const extent = b.offset + b.length + 5; 
                    if (extent > maxExtent) maxExtent = extent;
                });
            }
            if (weapon.id === 'bulldozer' || weapon.id === 'behemoth') maxExtent = baseRadius * 2.5; 
            if (weapon.bodyType === 'Spike' || weapon.bodyType === 'Saw' || weapon.bodyType === 'Star') maxExtent = Math.max(maxExtent, baseRadius * 1.5);
        } else { maxExtent = 20; }

        const availableRadius = (size / 2) * 0.85;
        let scale = availableRadius / maxExtent;
        if (mode === 'PROJECTILE' || mode === 'STATUS') scale = (size / 100) * 2.5;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // --- HELPER: GRADIENTS & UTILS ---
        const createMetalGradient = (w: number, dark: boolean = false) => {
            const grad = ctx.createLinearGradient(0, -w/2, 0, w/2);
            if (dark) {
                grad.addColorStop(0, '#0f0f12'); grad.addColorStop(0.5, '#3f3f46'); grad.addColorStop(1, '#09090b');
            } else {
                grad.addColorStop(0, '#27272a'); grad.addColorStop(0.5, '#e4e4e7'); grad.addColorStop(1, '#27272a');
            }
            return grad;
        };

        const drawFlagOverlay = (ctx: CanvasRenderingContext2D, flagId: string | undefined, size: number) => {
            if (!flagId || flagId === 'NONE') return;
            const img = ImageCache.getFlag(flagId);
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.save(); ctx.clip(); 
                ctx.fillStyle = '#1a1a20'; ctx.fill();
                const drawSize = size * 2.5; 
                const s = Math.max(drawSize / img.naturalWidth, drawSize / img.naturalHeight);
                ctx.globalAlpha = 0.85; ctx.drawImage(img, -(img.naturalWidth*s)/2, -(img.naturalHeight*s)/2, img.naturalWidth*s, img.naturalHeight*s);
                ctx.globalAlpha = 0.15; ctx.fillStyle = '#000'; for(let i = -drawSize/2; i < drawSize/2; i+=4) { ctx.fillRect(-drawSize/2, i, drawSize, 1); }
                ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
                const grad = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 1.2);
                grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.7, 'rgba(0,0,0,0.3)'); grad.addColorStop(1, 'rgba(0,0,0,0.8)'); ctx.fillStyle = grad; ctx.fill();
                ctx.restore();
            }
        };

        const drawHazardStripes = (x: number, y: number, w: number, h: number) => {
            ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(x,y,w,h); ctx.strokeStyle = '#000'; ctx.lineWidth = w/4;
            const diag = w + h;
            for(let i = -diag; i < diag; i+= w/1.5) { ctx.beginPath(); ctx.moveTo(x + i, y - 10); ctx.lineTo(x + i - h - 10, y + h + 10); ctx.stroke(); }
            ctx.restore();
        };

        // --- RENDER LOGIC ---
        if (mode === 'TANK' || mode === 'SKILL') {
            const radius = 24;

            if (weapon.barrels && weapon.id !== 'bulldozer' && weapon.id !== 'behemoth') {
                weapon.barrels.forEach(b => {
                    ctx.save(); ctx.rotate(b.angle); ctx.translate(0, b.offset);
                    const barrelL = b.length; const barrelW = b.width;
                    let kick = (tick % 60 < 10) ? (10 - (tick % 60)) * 0.5 : 0;
                    const startX = -kick;

                    const metalGrad = createMetalGradient(barrelW, false);
                    const darkMetalGrad = createMetalGradient(barrelW, true);
                    
                    if (weapon.id.includes('railgun')) {
                        const rt = barrelW*0.25;
                        ctx.fillStyle = darkMetalGrad; ctx.fillRect(startX, -barrelW/2, barrelL, rt); ctx.fillRect(startX, barrelW/2-rt, barrelL, rt);
                        ctx.fillStyle = color; ctx.globalAlpha = 0.4; ctx.fillRect(startX, -barrelW/2+rt, barrelL, barrelW-rt*2); ctx.globalAlpha = 1;
                        const coilCount = 4; const segmentL = barrelL/coilCount; ctx.fillStyle = '#18181b'; for(let i=1; i<coilCount; i++) ctx.fillRect(startX + (i*segmentL) - 2, -barrelW/2, 4, barrelW);
                    } 
                    else if (weapon.type === 'Launcher' || weapon.id.includes('missile') || weapon.id.includes('rocket') || weapon.id.includes('skimmer') || weapon.id.includes('grenade')) {
                        // NEW ROCKET PREVIEW
                        ctx.fillStyle = darkMetalGrad; ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                        ctx.fillStyle = '#27272a'; for(let i=1; i<=2; i++) ctx.fillRect(startX + (barrelL * 0.35 * i), -barrelW/2 - 1, 6, barrelW + 2); // Rings
                        ctx.fillStyle = '#3f3f46'; ctx.fillRect(startX + barrelL - 6, -barrelW/2 - 2, 6, barrelW + 4); // Collar
                        ctx.fillStyle = '#09090b'; ctx.beginPath(); ctx.ellipse(startX + barrelL, 0, 4, barrelW * 0.45, 0, 0, Math.PI*2); ctx.fill(); // Void
                        
                        // Visible Warhead
                        const isLoaded = (tick % 120) < 100;
                        if (isLoaded) {
                            const isNuke = weapon.id.includes('apocalypse');
                            ctx.fillStyle = isNuke ? '#4ade80' : '#ef4444';
                            ctx.beginPath(); ctx.ellipse(startX + barrelL - 2, 0, 6, barrelW * 0.3, 0, 0, Math.PI*2); ctx.fill();
                        }
                    }
                    else if (b.type === 'Construct' || weapon.type === 'Builder' || weapon.type === 'Trap') {
                        ctx.fillStyle = darkMetalGrad; ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                        drawHazardStripes(startX + barrelL * 0.2, -barrelW/2 + 2, barrelL * 0.6, barrelW - 4);
                        ctx.fillStyle = '#fbbf24'; ctx.fillRect(startX + barrelL - 6, -barrelW/2 - 2, 6, 4); ctx.fillRect(startX + barrelL - 6, barrelW/2 - 2, 6, 4);
                    } 
                    else if (weapon.type === 'Drone' || weapon.type === 'Necro') {
                        ctx.fillStyle = darkMetalGrad; ctx.beginPath(); ctx.moveTo(startX, -barrelW/2); ctx.lineTo(startX + barrelL, -barrelW * 0.85); ctx.lineTo(startX + barrelL, barrelW * 0.85); ctx.lineTo(startX, barrelW/2); ctx.fill(); ctx.stroke();
                        const floorW = barrelW * 0.7; ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.moveTo(startX + 5, -floorW/2); ctx.lineTo(startX + barrelL, -floorW * 0.8); ctx.lineTo(startX + barrelL, floorW * 0.8); ctx.lineTo(startX + 5, floorW/2); ctx.fill();
                    }
                    else if (weapon.type === 'Laser' || weapon.type === 'Tesla') {
                        const coreColor = weapon.type === 'Tesla' ? '#eab308' : '#06b6d4';
                        ctx.fillStyle = coreColor; ctx.globalAlpha = 0.4; ctx.fillRect(startX + 5, -barrelW*0.35, barrelL - 10, barrelW*0.7); ctx.globalAlpha = 1;
                        ctx.fillStyle = '#27272a'; for(let i=1; i<=3; i++) ctx.fillRect(startX + (barrelL * 0.25 * i), -barrelW/2 - 2, 6, barrelW + 4);
                    }
                    else if (weapon.id.includes('destroyer') || weapon.id.includes('annihilator')) {
                        ctx.fillStyle = '#27272a'; ctx.fillRect(startX, -barrelW/2 - 6, barrelL * 0.6, 6); ctx.fillRect(startX, barrelW/2, barrelL * 0.6, 6); // Pistons
                        ctx.fillStyle = darkMetalGrad; ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                    }
                    else if (weapon.id.includes('sniper') || weapon.id.includes('ranger')) {
                        ctx.fillStyle = metalGrad; ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                        ctx.fillStyle = '#1c1917'; ctx.fillRect(startX+15, -barrelW/2-1, barrelL*0.65, barrelW+2); // Shroud
                        ctx.fillStyle = '#27272a'; ctx.beginPath(); ctx.moveTo(startX+barrelL, -barrelW/2); ctx.lineTo(startX+barrelL+10, -barrelW/2-4); ctx.lineTo(startX+barrelL+10, barrelW/2+4); ctx.lineTo(startX+barrelL, barrelW/2); ctx.fill();
                    }
                    else {
                        // Standard
                        ctx.fillStyle = metalGrad; ctx.fillRect(startX, -barrelW/2, barrelL, barrelW); ctx.strokeRect(startX, -barrelW/2, barrelL, barrelW);
                        ctx.fillStyle = '#27272a'; ctx.fillRect(startX + barrelL - 5, -barrelW/2 - 1, 5, barrelW + 2);
                    }
                    ctx.restore();
                });
            }

            // Body
            const bodyGrad = ctx.createRadialGradient(-radius*0.3, -radius*0.3, radius*0.1, 0, 0, radius);
            bodyGrad.addColorStop(0, '#ffffff'); 
            const isStealth = weapon.id.includes('stalker') || weapon.id.includes('manager');
            const baseColor = isStealth ? '#27272a' : color;
            bodyGrad.addColorStop(0.3, baseColor); bodyGrad.addColorStop(0.9, baseColor); bodyGrad.addColorStop(1, '#09090b');

            // --- POLYGON DRAWING ---
            const drawBody = (sides: number, r: number) => {
                ctx.beginPath();
                if(sides===0) ctx.arc(0,0,r,0,Math.PI*2);
                else { for(let i=0; i<sides; i++) { const a=(i*2*Math.PI/sides)-Math.PI/2; if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r); else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } ctx.closePath(); }
            };

            let sides = 0;
            if(weapon.bodyType === 'Square' || weapon.type === 'Necro' || weapon.type === 'Builder') sides = 4;
            else if(weapon.bodyType === 'Hexagon') sides = 6;
            else if(weapon.bodyType === 'Octagon') sides = 8;
            else if(weapon.bodyType === 'Star') sides = 0; // Special handling
            else if(weapon.bodyType === 'Tri' || weapon.bodyType === 'Trapezoid') sides = 3;

            // Custom Rammers
            if (weapon.id === 'bulldozer' || weapon.id === 'behemoth') {
                const s = radius * 0.8; ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.roundRect(-s,-s,s*2,s*2,6); ctx.fill(); drawFlagOverlay(ctx, flagId, radius); ctx.stroke();
                ctx.save(); ctx.clip(); ctx.globalAlpha = 0.3; drawHazardStripes(-s, -s, s*2, s*2); ctx.restore();
                const plowH = radius*2; const plowX = radius*0.6; ctx.fillStyle = createMetalGradient(plowH, false);
                ctx.beginPath(); ctx.moveTo(plowX + radius*1.5, -plowH*0.45); ctx.lineTo(plowX, -plowH/2); ctx.quadraticCurveTo(plowX+radius, 0, plowX, plowH/2); ctx.lineTo(plowX + radius*1.5, plowH*0.45); ctx.fill(); ctx.stroke();
            } else if (weapon.bodyType === 'Star') {
                 // Star Geometry
                 const spikes = 5; const outer = radius; const inner = radius * 0.5;
                 ctx.fillStyle = bodyGrad; ctx.beginPath();
                 for(let i=0; i<spikes*2; i++) {
                     const r = i%2===0 ? outer : inner; const a = Math.PI*i/spikes - Math.PI/2;
                     if(i===0) ctx.moveTo(r*Math.cos(a), r*Math.sin(a)); else ctx.lineTo(r*Math.cos(a), r*Math.sin(a));
                 }
                 ctx.closePath(); ctx.fill(); drawFlagOverlay(ctx, flagId, radius); ctx.stroke();
            } else {
                ctx.fillStyle = bodyGrad; drawBody(sides, radius); ctx.fill(); drawFlagOverlay(ctx, flagId, radius);
                
                // Panel Lines
                ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(radius * 0.6, 0); ctx.lineTo(radius, 0); ctx.moveTo(-radius * 0.6, 0); ctx.lineTo(-radius, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(0,0, radius*0.3, 0, Math.PI*2); ctx.stroke();

                ctx.strokeStyle = '#18181b'; ctx.lineWidth = 2.5; ctx.stroke(); // Outline
            }
        }
        else if (mode === 'PROJECTILE') {
            ctx.scale(1.5, 1.5);
            ctx.rotate(Math.PI / 4);
            const r = 10;
            const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, r);
            grad.addColorStop(0, '#fff'); grad.addColorStop(1, color);
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0,0, r, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
        }

        ctx.restore();
        animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [weapon, size, color, mode, trailId, flagId]);

  return (
    <canvas ref={canvasRef} width={size} height={size} className={`block ${className}`} />
  );
};

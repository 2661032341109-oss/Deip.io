
import { ImageCache } from '../ImageCache';

export const drawPoly = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number) => { 
    const safeR = Math.max(0, r);
    ctx.beginPath(); 
    if (sides === 0) ctx.arc(x, y, safeR, 0, Math.PI*2); 
    else { 
        for(let i=0; i<sides; i++) { 
            const th = (i * 2 * Math.PI / sides) - Math.PI/2; 
            if(i===0) ctx.moveTo(x + Math.cos(th)*safeR, y + Math.sin(th)*safeR); 
            else ctx.lineTo(x + Math.cos(th)*safeR, y + Math.sin(th)*safeR); 
        } 
        ctx.closePath(); 
    } 
}; 

// --- HIGH FIDELITY FLAG RENDERER ---
export const drawFlagOverlay = (ctx: CanvasRenderingContext2D, flagId: string | undefined, size: number) => {
    if (!flagId || flagId === 'NONE') return;
    const img = ImageCache.getFlag(flagId);
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.clip(); 

        ctx.fillStyle = '#1a1a20'; ctx.fill();

        const drawSize = size * 2.5; 
        const scale = Math.max(drawSize / img.naturalWidth, drawSize / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;

        ctx.globalAlpha = 0.85; 
        ctx.drawImage(img, -w/2, -h/2, w, h);
        
        ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
        for(let i = -drawSize/2; i < drawSize/2; i+=4) { ctx.fillRect(-drawSize/2, i, drawSize, 1); }

        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
        const grad = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 1.2);
        grad.addColorStop(0, 'rgba(0,0,0,0)'); 
        grad.addColorStop(0.7, 'rgba(0,0,0,0.3)'); 
        grad.addColorStop(1, 'rgba(0,0,0,0.8)'); 
        ctx.fillStyle = grad; ctx.fill();

        const shine = ctx.createLinearGradient(-size, -size, size, size);
        shine.addColorStop(0, 'rgba(255,255,255,0.15)');
        shine.addColorStop(0.5, 'rgba(255,255,255,0)');
        ctx.fillStyle = shine; ctx.fill();

        ctx.restore();
    }
};

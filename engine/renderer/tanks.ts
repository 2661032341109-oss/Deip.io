
import { Entity, WeaponSchema } from '../../types';
import { resolveColor } from '../utils';
import { drawPoly, drawFlagOverlay } from './utils';

// --- AAA MATERIAL SHADERS ---

// 1. Advanced Metal Shader (Brushed Titanium / Gunmetal)
const createMetalGradient = (ctx: CanvasRenderingContext2D, w: number, dark: boolean = false) => {
    const grad = ctx.createLinearGradient(0, -w/2, 0, w/2);
    if (dark) {
        // Military Grade Carbonized Steel
        grad.addColorStop(0, '#0f0f12'); 
        grad.addColorStop(0.2, '#27272a'); 
        grad.addColorStop(0.45, '#3f3f46'); // Hard Specular
        grad.addColorStop(0.55, '#27272a');
        grad.addColorStop(0.8, '#18181b'); 
        grad.addColorStop(1, '#09090b');
    } else {
        // Brushed Aluminum / Silver
        grad.addColorStop(0, '#27272a'); 
        grad.addColorStop(0.1, '#52525b');
        grad.addColorStop(0.4, '#a1a1aa'); // Highlight
        grad.addColorStop(0.5, '#e4e4e7'); // Shine
        grad.addColorStop(0.6, '#a1a1aa');
        grad.addColorStop(0.9, '#52525b');
        grad.addColorStop(1, '#27272a');
    }
    return grad;
};

// 2. High-Tech Glass / Plasma Container
const createGlassGradient = (ctx: CanvasRenderingContext2D, w: number, color: string) => {
    const grad = ctx.createLinearGradient(0, -w/2, 0, w/2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, '#ffffff'); // Glare
    grad.addColorStop(0.5, color); // Deep liquid
    grad.addColorStop(0.8, color);
    grad.addColorStop(1, '#000000'); // Shadow
    return grad;
};

// 3. Industrial Hazard Stripes Pattern
const drawHazardStripes = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#fbbf24'; // Warning Yellow
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = '#000'; ctx.lineWidth = w/4;
    const diag = w + h;
    for(let i = -diag; i < diag; i+= w/1.5) {
        ctx.beginPath(); ctx.moveTo(x + i, y - 10); ctx.lineTo(x + i - h - 10, y + h + 10); ctx.stroke();
    }
    // Inner bevel
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x,y,w,2); ctx.fillRect(x,y+h-2,w,2);
    ctx.restore();
};

// 4. Rivet / Bolt Detailer
const drawRivets = (ctx: CanvasRenderingContext2D, x: number, startY: number, stepY: number, count: number, radius: number) => {
    ctx.fillStyle = '#111';
    for(let i=0; i<count; i++) {
        ctx.beginPath();
        const y = startY + (i * stepY);
        ctx.arc(x, y, radius, 0, Math.PI*2);
        ctx.fill();
        // Specular dot on rivet
        ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.arc(x-0.5, y-0.5, radius/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111';
    }
};

export const drawTank = (
    ctx: CanvasRenderingContext2D, 
    entity: Entity, 
    weapon: WeaponSchema, 
    barrelScale: number, 
    resolvedColor: string, 
    tick: number, 
    cbMode: string
) => {
    // --- LAYER 1: WEAPON SYSTEMS (Engineering Pass) ---
    if (weapon.barrels) {
        weapon.barrels.forEach((b, bIdx) => {
           const recoilFactor = entity.barrelRecoils ? entity.barrelRecoils[bIdx] : 0;
           // Mechanical Recoil: Sharp kickback, slow hydraulic recovery
           const kickDistance = recoilFactor * Math.max(4, b.length * 0.15); 
           
           const barrelL = b.length * barrelScale;
           const barrelW = b.width * barrelScale;
           const scaledOffset = b.offset * barrelScale;

           ctx.save(); 
           ctx.rotate(b.angle); 
           ctx.translate(0, scaledOffset); 
           
           const startX = -kickDistance;
           
           // Materials
           const metalGrad = createMetalGradient(ctx, barrelW, false);
           const darkMetalGrad = createMetalGradient(ctx, barrelW, true);

           // --- MOUNTING SYSTEM (The Joint) ---
           ctx.fillStyle = '#111';
           ctx.beginPath(); ctx.arc(0, 0, barrelW * 0.55, -Math.PI/2, Math.PI/2); ctx.fill();

           // ===============================================
           //  ENGINEERING ARCHETYPES
           // ===============================================

           // 1. CLUSTER LAUNCHER (Heavy Pods) - MANUAL DECORATIONS
           if (weapon.id === 'cluster_launcher') {
                if (b.offset === 0) { // Main Center Tube
                    ctx.fillStyle = darkMetalGrad;
                    ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                    // Glowing Status Light
                    const isReloading = (entity.reloadTimer || 0) > 0;
                    ctx.fillStyle = isReloading ? '#ef4444' : '#22c55e';
                    ctx.fillRect(startX + 10, -2, 5, 4);
                    // Reinforced Muzzle
                    ctx.fillStyle = '#3f3f46';
                    ctx.fillRect(startX + barrelL - 5, -barrelW/2 - 2, 5, barrelW + 4);
                    
                    // --- SIDE MAGS (DECORATIVE) ---
                    // Manually drawing side pods that were removed from physics
                    const podW = 15 * barrelScale;
                    const podL = 40 * barrelScale;
                    const podOffset = 25 * barrelScale;
                    
                    // Left Pod
                    ctx.fillStyle = metalGrad;
                    ctx.fillRect(startX, -podOffset - podW/2, podL, podW);
                    drawHazardStripes(ctx, startX + 5, -podOffset - podW/2 + 2, podL - 10, podW - 4);
                    
                    // Right Pod
                    ctx.fillStyle = metalGrad;
                    ctx.fillRect(startX, podOffset - podW/2, podL, podW);
                    drawHazardStripes(ctx, startX + 5, podOffset - podW/2 + 2, podL - 10, podW - 4);
                    
                    // Connecting Struts
                    ctx.fillStyle = '#111';
                    ctx.fillRect(startX + 10, -podOffset, 5, podOffset); // Top Strut
                    ctx.fillRect(startX + 10, 0, 5, podOffset); // Bottom Strut
                }
           }

           // 2. SUPERNOVA (Stellar Accelerator) - MANUAL DECORATIONS
           else if (weapon.id === 'supernova') {
                // Main Rail (The only physics barrel)
                ctx.fillStyle = darkMetalGrad;
                ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                
                // Pulsing Vents on Rail
                ctx.fillStyle = resolvedColor;
                for(let i=0; i<3; i++) {
                    const alpha = Math.abs(Math.sin(tick * 0.1 + i));
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(startX + 20 + (i*15), -barrelW/2 + 2, 4, barrelW - 4);
                }
                ctx.globalAlpha = 1.0;

                // --- MAGNETIC RING (DECORATIVE) ---
                const ringDist = 120 * barrelScale;
                const ringW = 120 * barrelScale;
                ctx.fillStyle = '#18181b';
                ctx.beginPath();
                ctx.ellipse(startX + ringDist * 0.8, 0, 8, ringW/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();
                
                // Energy Arc on Ring
                ctx.strokeStyle = resolvedColor;
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.6 + Math.sin(tick * 0.2) * 0.4;
                ctx.beginPath();
                ctx.ellipse(startX + ringDist * 0.8, 0, 6, ringW/2 - 4, 0, 0, Math.PI*2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;

                // --- STABILIZERS (DECORATIVE) ---
                const stabL = 100 * barrelScale;
                const stabW = 20 * barrelScale;
                ctx.fillStyle = metalGrad;
                
                for(let i=0; i<4; i++) {
                    const ang = (i * Math.PI / 2) + Math.PI/4;
                    ctx.save();
                    ctx.rotate(ang);
                    ctx.beginPath();
                    ctx.moveTo(startX, -stabW/2);
                    ctx.lineTo(startX + stabL, 0); // Taper to point
                    ctx.lineTo(startX, stabW/2);
                    ctx.fill();
                    ctx.restore();
                }
           }

           // 3. RAILGUN (Electromagnetic Propulsion)
           else if (weapon.id.includes('railgun')) {
               const railThick = barrelW * 0.25;
               
               // Top & Bottom Rails (Conductive Rails)
               ctx.fillStyle = darkMetalGrad;
               ctx.fillRect(startX, -barrelW/2, barrelL, railThick); // Top
               ctx.fillRect(startX, barrelW/2 - railThick, barrelL, railThick); // Bottom
               
               // Magnetic Field Generators (Coils)
               const coilCount = 4;
               const segmentL = barrelL / coilCount;
               ctx.fillStyle = '#18181b';
               for(let i=1; i<coilCount; i++) {
                   const cx = startX + (i * segmentL);
                   // Vertical Brace
                   ctx.fillRect(cx - 2, -barrelW/2, 4, barrelW);
                   // Glowing Emitter
                   ctx.fillStyle = resolvedColor;
                   ctx.globalAlpha = 0.5 + Math.sin(tick * 0.2 + i)*0.5;
                   ctx.fillRect(cx - 1, -barrelW/2 + railThick, 2, barrelW - railThick*2);
                   ctx.globalAlpha = 1.0;
                   ctx.fillStyle = '#18181b';
               }

               // Energy Core (Between Rails) - Pulsing Plasma
               const pulse = (Math.sin(tick * 0.5) + 1) * 0.5;
               ctx.fillStyle = resolvedColor;
               ctx.globalAlpha = 0.1 + (pulse * 0.2);
               ctx.fillRect(startX, -barrelW/2 + railThick, barrelL, barrelW - railThick*2);
               ctx.globalAlpha = 1.0;

               // Muzzle Capacitors
               ctx.fillStyle = '#d4d4d8';
               ctx.fillRect(startX + barrelL - 6, -barrelW/2 - 2, 6, railThick + 4);
               ctx.fillRect(startX + barrelL - 6, barrelW/2 - railThick - 2, 6, railThick + 4);
           }

           // 4. ROCKET / MISSILE LAUNCHER (Heavy Ordnance Tube)
           else if (weapon.type === 'Launcher' || weapon.id.includes('missile') || weapon.id.includes('rocket') || weapon.id.includes('skimmer') || weapon.id.includes('grenade') || weapon.id.includes('apocalypse')) {
                // The Main Launch Tube (Thick Cylinder)
                ctx.fillStyle = darkMetalGrad;
                ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
                
                // Reinforcement Rings (To hold pressure)
                ctx.fillStyle = '#27272a'; // Slightly lighter ring
                const ringCount = 2;
                for(let i=1; i<=ringCount; i++) {
                    const rx = startX + (barrelL * 0.35 * i);
                    ctx.fillRect(rx, -barrelW/2 - 1, 6, barrelW + 2);
                    // Bolt detail on ring
                    ctx.fillStyle = '#000'; ctx.fillRect(rx + 2, -barrelW/2 - 1, 2, 2); ctx.fillRect(rx + 2, barrelW/2 - 1, 2, 2);
                    ctx.fillStyle = '#27272a';
                }

                // Heavy Muzzle Collar
                ctx.fillStyle = '#3f3f46';
                ctx.fillRect(startX + barrelL - 8, -barrelW/2 - 2, 8, barrelW + 4);
                
                // Muzzle Interior (The Void)
                ctx.fillStyle = '#09090b'; 
                ctx.beginPath();
                ctx.ellipse(startX + barrelL, 0, 4, barrelW * 0.45, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.stroke();

                // --- VISIBLE WARHEAD (If loaded) ---
                // Shows the tip of the rocket inside the barrel!
                const isLoaded = (entity.reloadTimer || 0) < 15; // If almost ready, show rocket
                if (isLoaded) {
                    const isNuke = weapon.id.includes('apocalypse') || weapon.id.includes('nuclear');
                    const headColor = isNuke ? '#4ade80' : '#ef4444'; // Neon Green for Nuke, Red for Standard
                    
                    ctx.fillStyle = headColor;
                    ctx.beginPath();
                    // Draw warhead tip protruding slightly
                    ctx.ellipse(startX + barrelL - 2, 0, 6, barrelW * 0.3, 0, 0, Math.PI*2);
                    ctx.fill();
                    
                    // Specular highlight on nose cone
                    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5;
                    ctx.beginPath(); ctx.ellipse(startX + barrelL - 2, -barrelW*0.1, 3, 1.5, 0, 0, Math.PI*2); ctx.fill();
                    ctx.globalAlpha = 1.0;
                }

                // Tactical Optics / Targeting Pod (Top Mount)
                if (barrelW > 12) {
                    ctx.fillStyle = '#18181b';
                    // Box on top
                    ctx.fillRect(startX + 15, -barrelW/2 - 6, barrelL * 0.4, 6);
                    // Lens
                    ctx.fillStyle = '#0ea5e9'; // Cyber blue lens
                    ctx.fillRect(startX + 15 + barrelL * 0.4 - 2, -barrelW/2 - 5, 2, 4);
                    // Reflection
                    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6; ctx.fillRect(startX + 15 + barrelL * 0.4 - 2, -barrelW/2 - 5, 1, 1); ctx.globalAlpha = 1.0;
                }
                
                // Exhaust Vents (Rear)
                ctx.fillStyle = '#000';
                for(let i=0; i<3; i++) {
                    ctx.fillRect(startX + 6 + (i*5), -barrelW/2 + 3, 2, barrelW - 6);
                }
                
                // Hazard Stripe
                drawHazardStripes(ctx, startX + barrelL * 0.7, -barrelW/2 + 2, 10, barrelW - 4);
           }
           
           // 5. INDUSTRIAL / BUILDER (Heavy Machinery)
           else if (b.type === 'Construct' || weapon.type === 'Builder' || weapon.type === 'Trap') {
               // Main Box Frame
               ctx.fillStyle = darkMetalGrad;
               ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
               
               // External Reinforcement Cage (Exoskeleton)
               ctx.fillStyle = '#3f3f46';
               ctx.fillRect(startX, -barrelW/2 - 2, barrelL, 3); // Top Bar
               ctx.fillRect(startX, barrelW/2 - 1, barrelL, 3);  // Bottom Bar
               
               // Hazard Stripes (Safety Areas)
               drawHazardStripes(ctx, startX + barrelL * 0.2, -barrelW/2 + 2, barrelL * 0.6, barrelW - 4);
               
               // Hydraulic Claws (For placement)
               ctx.fillStyle = '#fbbf24'; // Amber
               ctx.beginPath();
               ctx.moveTo(startX + barrelL, -barrelW/2 - 4);
               ctx.lineTo(startX + barrelL + 8, -barrelW/2); // Claw Top
               ctx.lineTo(startX + barrelL, -barrelW/2 + 4);
               ctx.moveTo(startX + barrelL, barrelW/2 + 4);
               ctx.lineTo(startX + barrelL + 8, barrelW/2);   // Claw Bottom
               ctx.lineTo(startX + barrelL, barrelW/2 - 4);
               ctx.fill();
           }
           
           // 6. DRONE HANGAR / CARRIER (Aircraft Carrier Deck)
           else if (weapon.type === 'Drone' || weapon.type === 'Necro' || weapon.type === 'Swarm' || weapon.type === 'Minion') {
               // Trapezoidal Hangar Hull
               ctx.fillStyle = darkMetalGrad;
               ctx.beginPath();
               ctx.moveTo(startX, -barrelW/2);
               ctx.lineTo(startX + barrelL, -barrelW * 0.85); // Flared Opening
               ctx.lineTo(startX + barrelL, barrelW * 0.85);
               ctx.lineTo(startX, barrelW/2);
               ctx.closePath();
               ctx.fill();
               ctx.stroke();
               
               // The Runway (Dark interior)
               const floorW = barrelW * 0.7;
               ctx.fillStyle = '#0a0a0a';
               ctx.beginPath();
               ctx.moveTo(startX + 5, -floorW/2);
               ctx.lineTo(startX + barrelL, -floorW * 0.8);
               ctx.lineTo(startX + barrelL, floorW * 0.8);
               ctx.lineTo(startX + 5, floorW/2);
               ctx.fill();
               
               // Animated Runway Lights (Sequential Landing Strip)
               const lightColor = resolvedColor;
               const lightCount = 4;
               for(let i=0; i<lightCount; i++) {
                   const lx = startX + 15 + (i * (barrelL/lightCount));
                   const isActive = Math.floor(tick / 5) % lightCount === i;
                   ctx.fillStyle = isActive ? lightColor : '#333';
                   if (isActive) { ctx.shadowColor = lightColor; ctx.shadowBlur = 5; }
                   ctx.fillRect(lx, -2, 4, 4); // Center guide lights
                   ctx.shadowBlur = 0;
               }
           }
           
           // 7. ENERGY / LASER / TESLA (High Tech Core)
           else if (weapon.type === 'Laser' || weapon.type === 'Tesla') {
               // Exposed Power Core (Glass)
               const coreColor = weapon.type === 'Tesla' ? '#eab308' : '#06b6d4';
               const coreGrad = createGlassGradient(ctx, barrelW, coreColor);
               
               ctx.fillStyle = coreGrad;
               ctx.fillRect(startX + 5, -barrelW*0.35, barrelL - 10, barrelW*0.7);
               
               // Floating Containment Rings
               ctx.fillStyle = '#27272a';
               for(let i=1; i<=3; i++) {
                   const rx = startX + (barrelL * 0.25 * i);
                   // Ring geometry
                   ctx.fillRect(rx, -barrelW/2 - 2, 6, barrelW + 4);
                   // Emissive diode on ring
                   ctx.fillStyle = coreColor;
                   ctx.fillRect(rx + 1, -barrelW/2 - 2, 4, 2);
                   ctx.fillStyle = '#27272a';
               }
               
               // Focusing Lens at Tip
               ctx.fillStyle = '#fff';
               ctx.globalAlpha = 0.8;
               ctx.fillRect(startX + barrelL - 2, -barrelW * 0.4, 2, barrelW * 0.8);
               ctx.globalAlpha = 1.0;
           }
           
           // 8. HEAVY ARTILLERY (Destroyer/Annihilator)
           else if (weapon.id.includes('destroyer') || weapon.id.includes('annihilator') || weapon.id.includes('hybrid')) {
               // 1. Recoil Absorption Pistons (External)
               ctx.fillStyle = '#27272a';
               const pistonH = 8;
               ctx.fillRect(startX, -barrelW/2 - pistonH, barrelL * 0.6, pistonH); // Top Cylinder
               ctx.fillRect(startX, barrelW/2, barrelL * 0.6, pistonH);      // Bottom Cylinder
               
               // Piston Rods (Silver) - Move with recoil
               ctx.fillStyle = '#d4d4d8';
               const rodX = startX + barrelL * 0.6;
               ctx.fillRect(rodX, -barrelW/2 - 5, barrelL * 0.2, 4);
               ctx.fillRect(rodX, barrelW/2 + 1, barrelL * 0.2, 4);

               // 2. Main Bore (Massive Barrel)
               ctx.fillStyle = darkMetalGrad;
               ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
               
               // 3. Reinforcement Bands (To hold pressure)
               ctx.fillStyle = '#18181b';
               ctx.fillRect(startX + barrelL * 0.4, -barrelW/2 - 1, 12, barrelW + 2);
               ctx.fillRect(startX + barrelL * 0.8, -barrelW/2 - 1, 12, barrelW + 2);
               
               // 4. Muzzle Void
               ctx.fillStyle = '#000';
               ctx.beginPath(); ctx.ellipse(startX + barrelL, 0, 6, barrelW * 0.45, 0, 0, Math.PI*2); ctx.fill();
           }
           
           // 9. SNIPER / RANGER (Precision Ballistics)
           else if (weapon.id.includes('sniper') || weapon.id.includes('ranger') || weapon.id.includes('assassin') || weapon.id.includes('predator')) {
               // 1. Long Rifled Barrel
               ctx.fillStyle = metalGrad;
               ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
               
               // 2. Thermal Shroud (Vented Cover)
               ctx.fillStyle = '#1c1917'; // Carbon matte
               const shroudStart = startX + 15;
               const shroudLen = barrelL * 0.65;
               ctx.fillRect(shroudStart, -barrelW/2 - 1, shroudLen, barrelW + 2);
               
               // Vents (Heat dissipation slots)
               ctx.fillStyle = '#333';
               const ventCount = 8;
               const ventW = 4;
               const ventGap = shroudLen / ventCount;
               for(let v=0; v<ventCount; v++) {
                   const vx = shroudStart + 10 + (v * ventGap);
                   ctx.fillRect(vx, -barrelW * 0.3, ventW, barrelW * 0.6);
               }
               
               // 3. Muzzle Brake (Recoil Compensator)
               ctx.fillStyle = '#27272a';
               ctx.beginPath();
               ctx.moveTo(startX + barrelL, -barrelW/2);
               ctx.lineTo(startX + barrelL + 10, -barrelW/2 - 4); // Flared tip
               ctx.lineTo(startX + barrelL + 10, barrelW/2 + 4);
               ctx.lineTo(startX + barrelL, barrelW/2);
               ctx.fill();
               // Side Ports
               ctx.fillStyle = '#000';
               ctx.fillRect(startX + barrelL + 2, -2, 6, 4);

               // 4. Optical Scope (On main barrel only)
               if (b.length > 40) {
                   ctx.fillStyle = '#3f3f46'; // Mount
                   ctx.fillRect(startX + 15, -barrelW/2 - 8, 30, 4);
                   ctx.fillStyle = '#18181b'; // Scope Body
                   ctx.fillRect(startX + 10, -barrelW/2 - 14, 40, 8);
                   // Lens Glint
                   ctx.fillStyle = '#00f3ff';
                   ctx.beginPath(); ctx.ellipse(startX + 50, -barrelW/2 - 10, 1, 4, 0, 0, Math.PI*2); ctx.fill();
               }
           }
           
           // 10. STANDARD (The Classic, Refined)
           else {
               // High Quality Rifled Barrel
               ctx.fillStyle = metalGrad;
               ctx.fillRect(startX, -barrelW/2, barrelL, barrelW);
               ctx.strokeRect(startX, -barrelW/2, barrelL, barrelW);
               
               // Shine Highlight (Curvature)
               ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.1;
               ctx.fillRect(startX, -barrelW * 0.2, barrelL, barrelW * 0.15);
               ctx.globalAlpha = 1.0;
               
               // Muzzle Reinforcement Ring
               ctx.fillStyle = '#27272a';
               ctx.fillRect(startX + barrelL - 5, -barrelW/2 - 1, 5, barrelW + 2);
               
               // Rivets on base
               drawRivets(ctx, startX + 4, -barrelW/3, barrelW/3, 2, 1.2);
           }

           ctx.restore();
        });
    }
    
    // --- LAYER 2: CHASSIS (Advanced Hull) ---
    
    const bodyRadius = Math.max(0, entity.radius);
    
    // Advanced 3D Sphere/Poly Shader
    const bodyGrad = ctx.createRadialGradient(-bodyRadius*0.3, -bodyRadius*0.3, bodyRadius*0.1, 0, 0, bodyRadius);
    bodyGrad.addColorStop(0, '#ffffff'); // Specular highlight
    
    const isStealth = weapon.id.includes('stalker') || weapon.id.includes('manager') || weapon.id === 'assassin';
    const baseColor = isStealth ? '#27272a' : resolvedColor;
    
    bodyGrad.addColorStop(0.3, baseColor); 
    bodyGrad.addColorStop(0.9, baseColor); 
    bodyGrad.addColorStop(1, '#09090b'); // Ambient occlusion / Rim shadow
    
    ctx.lineWidth = 2.5; 
    ctx.strokeStyle = '#18181b'; // Dark Gunmetal Outline
    
    // --- CUSTOM HULL GEOMETRY ---
    
    // Helper: Draw Tech Panel Lines
    const drawTechLines = () => {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Cutout details
        ctx.moveTo(bodyRadius * 0.6, 0); ctx.lineTo(bodyRadius, 0);
        ctx.moveTo(-bodyRadius * 0.6, 0); ctx.lineTo(-bodyRadius, 0);
        ctx.moveTo(0, bodyRadius * 0.6); ctx.lineTo(0, bodyRadius);
        ctx.stroke();
        
        // Center Access Hatch
        ctx.beginPath(); ctx.arc(0,0, bodyRadius * 0.3, 0, Math.PI*2); ctx.stroke();
        // Rivets around hatch
        for(let i=0; i<4; i++) {
            const a = i * Math.PI/2 + Math.PI/4;
            const r = bodyRadius * 0.2;
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(Math.cos(a)*r, Math.sin(a)*r, 1.5, 0, Math.PI*2); ctx.fill();
        }
    };

    if (weapon.id === 'bulldozer' || weapon.id === 'behemoth') {
        // ... (Keep the high-detail bulldozer logic, it fits the new style)
        ctx.save();
        const s = bodyRadius * 0.8;
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.roundRect(-s, -s, s*2, s*2, 6); ctx.fill(); 
        drawFlagOverlay(ctx, entity.flagId, bodyRadius);
        ctx.stroke();
        // Hazard Stripes
        ctx.save(); ctx.clip(); ctx.globalAlpha = 0.3; drawHazardStripes(ctx, -s, -s, s*2, s*2); ctx.restore();
        // Plow
        ctx.save();
        const plowW = bodyRadius * 2.2; const plowH = bodyRadius * 2.0; const plowX = bodyRadius * 0.6; 
        ctx.beginPath();
        ctx.moveTo(plowX + plowW * 0.5, -plowH * 0.45); ctx.lineTo(plowX, -plowH/2); ctx.quadraticCurveTo(plowX + bodyRadius * 0.8, 0, plowX, plowH/2); ctx.lineTo(plowX + plowW * 0.5, plowH * 0.45); ctx.quadraticCurveTo(plowX + plowW * 0.7, 0, plowX + plowW * 0.5, -plowH * 0.45); ctx.closePath();
        ctx.fillStyle = createMetalGradient(ctx, plowH, false); ctx.fill(); ctx.stroke();
        ctx.restore(); ctx.restore();
        return;
    }

    if (weapon.bodyType === 'Spike' || entity.isSpike) {
        // Obsidian Spikes
        const spikes = 12; const outerR = bodyRadius * 1.3; const innerR = bodyRadius * 0.75;
        ctx.save(); ctx.rotate(tick * 0.05);
        for(let i=0; i<spikes; i++) {
            const a1 = (Math.PI*2*i)/spikes; const a2 = (Math.PI*2*(i+1))/spikes; const mid = (a1+a2)/2;
            ctx.beginPath(); ctx.moveTo(Math.cos(a1)*innerR, Math.sin(a1)*innerR); ctx.lineTo(Math.cos(mid)*outerR, Math.sin(mid)*outerR); ctx.lineTo(Math.cos(a2)*innerR, Math.sin(a2)*innerR); ctx.closePath();
            const g = ctx.createLinearGradient(Math.cos(a1)*innerR, Math.sin(a1)*innerR, Math.cos(mid)*outerR, Math.sin(mid)*outerR);
            g.addColorStop(0, '#1f2937'); g.addColorStop(0.5, '#4b5563'); g.addColorStop(1, '#111827');
            ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#374151'; ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = bodyGrad; ctx.beginPath(); ctx.arc(0,0,bodyRadius*0.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } 
    else {
        // Standard Polygons with Tech Detail
        ctx.fillStyle = bodyGrad;
        if (weapon.bodyType === 'Square' || weapon.type === 'Necro') {
            const s = bodyRadius * 0.85; ctx.beginPath(); ctx.rect(-s,-s,s*2,s*2); 
        } else if (weapon.bodyType === 'Tri' || weapon.bodyType === 'Trapezoid') {
            drawPoly(ctx, 0, 0, bodyRadius, 3);
        } else if (weapon.bodyType === 'Hexagon') {
            drawPoly(ctx, 0, 0, bodyRadius, 6);
        } else if (weapon.bodyType === 'Octagon') {
            drawPoly(ctx, 0, 0, bodyRadius, 8);
        } else if (weapon.bodyType === 'Star') {
             // Star Geometry
             const spikes = 5; const outer = bodyRadius; const inner = bodyRadius * 0.5;
             ctx.beginPath();
             for(let i=0; i<spikes*2; i++) {
                 const r = i%2===0 ? outer : inner; const a = Math.PI*i/spikes;
                 if(i===0) ctx.moveTo(r*Math.cos(a), r*Math.sin(a)); else ctx.lineTo(r*Math.cos(a), r*Math.sin(a));
             }
             ctx.closePath();
        } else {
            ctx.beginPath(); ctx.arc(0, 0, bodyRadius, 0, Math.PI*2);
        }
        
        ctx.fill();
        drawFlagOverlay(ctx, entity.flagId, bodyRadius);
        
        // Inner Bevel (Rim Light)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3; ctx.stroke();
        // Outline
        ctx.strokeStyle = '#18181b'; ctx.lineWidth = 3; ctx.stroke();
        
        // Tech Details
        drawTechLines();
    }
};

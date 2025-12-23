
import { useEffect } from 'react';
import { GameContext } from '../engine/GameContext';
import { lerp } from '../engine/utils';

export const useGameInput = (context: GameContext) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            if (context.soundManager.current) context.soundManager.current.resume();
            context.keys.current.add(e.code);
            // Stat upgrades are handled via imperative handle in parent, 
            // but we could also emit an event here if needed.
        };
        const handleKeyUp = (e: KeyboardEvent) => context.keys.current.delete(e.code);
        const handleMouseDown = (e: MouseEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            if (context.soundManager.current) context.soundManager.current.resume();
            if (e.target !== context.canvasRef.current) return;
            if (e.button === 0) context.mouse.current.down = true;
            if (e.button === 2) context.mouse.current.rightDown = true;
        };
        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) context.mouse.current.down = false;
            if (e.button === 2) context.mouse.current.rightDown = false;
        };
        const handleMouseMove = (e: MouseEvent) => {
            context.mouse.current.x = e.clientX;
            context.mouse.current.y = e.clientY;
        };
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        
        // Touch Handlers
        const handleTouchStart = (e: TouchEvent) => { 
            if (e.cancelable) e.preventDefault(); 
            if (context.soundManager.current) context.soundManager.current.resume();
            if (e.target !== context.canvasRef.current) return;
            
            const settings = context.settings.current;

            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const isLeft = t.clientX < window.innerWidth / 2;
                const isMoveZone = settings.controls.leftHanded ? !isLeft : isLeft;

                if (isMoveZone && !context.joystick.current.active) {
                    context.joystick.current.active = true;
                    context.joystick.current.id = t.identifier;
                    context.joystick.current.origin = { x: t.clientX, y: t.clientY };
                    context.joystick.current.curr = { x: t.clientX, y: t.clientY };
                    context.joystick.current.vector = { x: 0, y: 0 };
                } else {
                    context.fireButton.current.active = true;
                    context.fireButton.current.id = t.identifier;
                    context.mouse.current.x = t.clientX;
                    context.mouse.current.y = t.clientY;
                    context.mouse.current.down = true;
                }
            }
        };
        const handleTouchMove = (e: TouchEvent) => { 
            if (e.cancelable) e.preventDefault();
            if (e.target !== context.canvasRef.current) return;
            
            const settings = context.settings.current;

            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (context.joystick.current.active && t.identifier === context.joystick.current.id) {
                    const maxDist = 50 * (settings.controls.joystickSize / 100); 
                    const dx = t.clientX - context.joystick.current.origin.x;
                    const dy = t.clientY - context.joystick.current.origin.y;
                    const angle = Math.atan2(dy, dx);
                    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), maxDist);
                    
                    const deadzone = maxDist * (settings.controls.joystickDeadzone / 100);
                    if (dist < deadzone) {
                        context.joystick.current.vector = { x: 0, y: 0 };
                    } else {
                        context.joystick.current.curr = { x: context.joystick.current.origin.x + Math.cos(angle) * dist, y: context.joystick.current.origin.y + Math.sin(angle) * dist };
                        context.joystick.current.vector = { x: Math.cos(angle) * (dist/maxDist), y: Math.sin(angle) * (dist/maxDist) };
                    }
                } else if (context.fireButton.current.active && t.identifier === context.fireButton.current.id) {
                    // TOUCH SMOOTHING (Mobile Buff)
                    const smoothFactor = (settings.controls.touchSmoothing || 0) / 100;
                    if (smoothFactor > 0) {
                        context.mouse.current.x = lerp(context.mouse.current.x, t.clientX, 1 - smoothFactor * 0.5);
                        context.mouse.current.y = lerp(context.mouse.current.y, t.clientY, 1 - smoothFactor * 0.5);
                    } else {
                        context.mouse.current.x = t.clientX;
                        context.mouse.current.y = t.clientY;
                    }
                }
            }
        };
        const handleTouchEnd = (e: TouchEvent) => { 
            if (e.cancelable) e.preventDefault();
            if (e.target !== context.canvasRef.current) return;
            for(let i=0; i<e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (context.joystick.current.active && t.identifier === context.joystick.current.id) {
                    context.joystick.current.active = false; context.joystick.current.vector = { x: 0, y: 0 }; context.joystick.current.id = null;
                } else if (context.fireButton.current.active && t.identifier === context.fireButton.current.id) {
                    context.fireButton.current.active = false; context.fireButton.current.id = null; context.mouse.current.down = false;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []); // Hook only depends on stable context ref
};

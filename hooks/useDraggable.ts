
import React, { useRef, useState, useCallback, useEffect } from 'react';

export const useDraggable = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Physics State
    const state = useRef({
        isDown: false,
        startX: 0,
        scrollLeft: 0,
        velX: 0,
        lastX: 0,
        lastTime: 0,
        rafId: 0,
        momentumActive: false
    });

    const stopMomentum = () => {
        state.current.momentumActive = false;
        if (state.current.rafId) cancelAnimationFrame(state.current.rafId);
    };

    const momentumLoop = () => {
        if (!ref.current || !state.current.momentumActive) return;
        
        // Apply velocity
        ref.current.scrollLeft -= state.current.velX;
        
        // Friction
        state.current.velX *= 0.95;

        // Stop if slow enough
        if (Math.abs(state.current.velX) < 0.5) {
            state.current.momentumActive = false;
        } else {
            state.current.rafId = requestAnimationFrame(momentumLoop);
        }
    };

    const onMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!ref.current) return;
        stopMomentum();
        state.current.isDown = true;
        setIsDragging(true);
        
        const pageX = 'touches' in e ? e.touches[0].pageX : (e as React.MouseEvent).pageX;
        state.current.startX = pageX - ref.current.offsetLeft;
        state.current.scrollLeft = ref.current.scrollLeft;
        state.current.lastX = pageX;
        state.current.lastTime = performance.now();
        state.current.velX = 0;
    }, []);

    const onMouseLeave = useCallback(() => {
        if (state.current.isDown) {
            state.current.isDown = false;
            setIsDragging(false);
            state.current.momentumActive = true;
            requestAnimationFrame(momentumLoop);
        }
    }, []);

    const onMouseUp = useCallback(() => {
        if (state.current.isDown) {
            state.current.isDown = false;
            setIsDragging(false);
            // Trigger momentum
            state.current.momentumActive = true;
            requestAnimationFrame(momentumLoop);
        }
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!state.current.isDown || !ref.current) return;
        e.preventDefault();
        
        const pageX = 'touches' in e ? e.touches[0].pageX : (e as React.MouseEvent).pageX;
        const x = pageX - ref.current.offsetLeft;
        const walk = (x - state.current.startX) * 1.0; // 1:1 movement
        
        ref.current.scrollLeft = state.current.scrollLeft - walk;

        // Calculate Velocity for Momentum
        const now = performance.now();
        const dt = now - state.current.lastTime;
        const dx = pageX - state.current.lastX;
        
        if (dt > 0) {
            // Simple moving average for smoother velocity
            const newVel = dx * 16 / dt; // Normalize to approx frames
            state.current.velX = state.current.velX * 0.5 + newVel * 0.5;
        }

        state.current.lastX = pageX;
        state.current.lastTime = now;
    }, []);

    // Clean up
    useEffect(() => {
        return () => stopMomentum();
    }, []);

    return {
        ref,
        isDragging,
        events: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
            onTouchStart: onMouseDown,
            onTouchEnd: onMouseUp,
            onTouchMove: onMouseMove
        }
    };
};


import React, { useState, useRef, useEffect } from 'react';
import { GameSettings } from '../../types';
import { Smartphone, MousePointer2, Crosshair, Move } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TabProps {
    settings: GameSettings;
    update: (section: any, key: string, value: any) => void;
}

export const TabControls: React.FC<TabProps> = ({ settings, update }) => {
    const { t } = useTranslation();
    
    // Joystick Tester State
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const testerRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        updateStick(e);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        updateStick(e);
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
    };

    const updateStick = (e: React.PointerEvent) => {
        if (!testerRef.current) return;
        const rect = testerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Base size logic: settings.controls.joystickSize (100 is default radius approx 50px)
        const maxDist = 50 * (settings.controls.joystickSize / 100); 
        
        let dx = e.clientX - rect.left - centerX;
        let dy = e.clientY - rect.top - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) {
            const ratio = maxDist / dist;
            dx *= ratio;
            dy *= ratio;
        }
        setStickPos({ x: dx, y: dy });
    };

    // Calculate deadzone visual
    const maxRadius = 50 * (settings.controls.joystickSize / 100);
    const deadzoneRadius = maxRadius * (settings.controls.joystickDeadzone / 100);
    const currentDist = Math.sqrt(stickPos.x**2 + stickPos.y**2);
    const isInDeadzone = currentDist < deadzoneRadius;

    const Range = ({ section, prop, min, max, label }: any) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-xs font-mono text-gray-400">{label}</span>
                {/* @ts-ignore */}
                <span className="text-xs font-bold text-cyan-400">{settings[section][prop]}%</span>
            </div>
            <input 
                type="range" min={min} max={max} 
                /* @ts-ignore */
                value={settings[section][prop]} 
                onChange={(e) => update(section, prop, parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );

    const Toggle = ({ section, prop, label }: any) => (
        <div 
            /* @ts-ignore */
            onClick={() => update(section, prop, !settings[section][prop])}
            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded cursor-pointer transition-all"
        >
            <span className="text-xs font-bold text-gray-300">{label}</span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${
                /* @ts-ignore */
                settings[section][prop] ? 'bg-cyan-500' : 'bg-gray-600'
            }`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                    /* @ts-ignore */
                    settings[section][prop] ? 'left-4.5' : 'left-0.5'
                }`} style={{ left: settings[section][prop] ? 'calc(100% - 3.5px - 12px)' : '3.5px' }}></div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-full gap-6">
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                
                {/* MOUSE */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                        <MousePointer2 className="w-4 h-4" /> MOUSE / KEYBOARD
                    </h3>
                    <Range section="controls" prop="sensitivity" min="10" max="200" label={t('settings_sensitivity')} />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-3 rounded border border-white/10">
                            <div className="text-[10px] text-gray-500 mb-1">WASD</div>
                            <div className="text-white font-bold text-xs">MOVEMENT</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded border border-white/10">
                            <div className="text-[10px] text-gray-500 mb-1">L-CLICK</div>
                            <div className="text-white font-bold text-xs">FIRE WEAPON</div>
                        </div>
                    </div>
                </div>

                {/* MOBILE */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-yellow-400 font-bold font-mono text-sm border-b border-white/10 pb-2">
                        <Smartphone className="w-4 h-4" /> MOBILE TOUCH
                    </h3>
                    <Range section="controls" prop="joystickSize" min="50" max="150" label={t('settings_joystick_size')} />
                    <Range section="controls" prop="joystickOpacity" min="10" max="100" label={t('settings_joystick_opacity')} />
                    <Range section="controls" prop="joystickDeadzone" min="0" max="50" label={t('settings_joystick_deadzone')} />
                    
                    <div className="grid grid-cols-1 gap-3">
                        <Toggle section="controls" prop="haptic" label={t('settings_haptic')} />
                        <Toggle section="controls" prop="leftHanded" label={t('settings_lefthanded')} />
                    </div>
                </div>
            </div>

            {/* INTERACTIVE VISUALIZER */}
            <div className="w-full md:w-1/2 flex flex-col gap-4">
                <div 
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center cursor-crosshair touch-none select-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    ref={testerRef}
                >
                    <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
                    
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-500">
                        INTERACTIVE TESTER: DRAG TO TEST
                    </div>

                    {/* DEADZONE VISUAL */}
                    <div 
                        className="absolute rounded-full border border-red-500/30 bg-red-500/5 pointer-events-none"
                        style={{
                            width: deadzoneRadius * 2,
                            height: deadzoneRadius * 2,
                        }}
                    ></div>

                    {/* JOYSTICK BASE */}
                    <div 
                        className="rounded-full border-2 flex items-center justify-center transition-all pointer-events-none relative"
                        style={{ 
                            width: maxRadius * 2, 
                            height: maxRadius * 2,
                            opacity: settings.controls.joystickOpacity / 100,
                            borderColor: isDragging ? (isInDeadzone ? '#ef4444' : '#22c55e') : 'rgba(255,255,255,0.2)'
                        }}
                    >
                        {/* JOYSTICK KNOB */}
                        <div 
                            className="absolute w-1/2 h-1/2 rounded-full shadow-lg transition-transform duration-75"
                            style={{
                                transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                                backgroundColor: isDragging ? (isInDeadzone ? '#ef4444' : '#22c55e') : 'rgba(0, 243, 255, 0.5)'
                            }}
                        ></div>
                    </div>

                    <div className="absolute bottom-4 flex gap-4 text-[10px] font-mono font-bold">
                        <div className={`px-2 py-1 rounded ${isDragging && isInDeadzone ? 'bg-red-500 text-black' : 'bg-black/60 text-gray-500'}`}>
                            DEADZONE
                        </div>
                        <div className={`px-2 py-1 rounded ${isDragging && !isInDeadzone ? 'bg-green-500 text-black' : 'bg-black/60 text-gray-500'}`}>
                            ACTIVE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

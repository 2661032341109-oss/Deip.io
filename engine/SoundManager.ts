
export class SoundManager {
    ctx: AudioContext;
    masterGain: GainNode;
    limiter: DynamicsCompressorNode;
    
    // Effects
    reverbNode: ConvolverNode;
    reverbGain: GainNode;

    // Resources
    noiseBuffer: AudioBuffer;
    pinkNoiseBuffer: AudioBuffer; // For Flamethrower
    softClipCurve: Float32Array;
    isMuted: boolean = false;
    isInitialized: boolean = false;

    constructor() {
        // @ts-ignore
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // 1. Master Chain: Master Gain -> Limiter -> Destination
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4; // Lower master slightly to handle reverb addition

        // Limiter (Safety & Glue)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -12; 
        this.limiter.knee.value = 30;       
        this.limiter.ratio.value = 15;      
        this.limiter.attack.value = 0.003;  
        this.limiter.release.value = 0.25;  

        // 2. Reverb System (The "AAA" Space)
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = this.generateImpulseResponse(1.5, 2.0); // 1.5s duration, decay factor
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.35; // Wet level (35%)

        // Routing: 
        // Signal -> Master -> Limiter -> Dest
        // Signal -> Reverb -> ReverbGain -> Master
        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
        
        // Pre-generate assets
        this.noiseBuffer = this.createNoiseBuffer(false); // White Noise
        this.pinkNoiseBuffer = this.createNoiseBuffer(true); // Pink Noise
        this.softClipCurve = this.createSoftClipCurve(4.0); // Amount of "warmth"
    }

    // Call this on first user interaction to unlock audio context
    initialize() {
        if (!this.isInitialized || this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                this.isInitialized = true;
            }).catch(e => console.warn("Audio resume failed", e));
        }
    }

    generateImpulseResponse(duration: number, decay: number) {
        const length = this.ctx.sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = i / length;
            // Exponential decay noise
            const vol = Math.pow(1 - n, decay);
            left[i] = (Math.random() * 2 - 1) * vol;
            right[i] = (Math.random() * 2 - 1) * vol;
        }
        return impulse;
    }

    createNoiseBuffer(isPink: boolean = false) {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        if (isPink) {
             let b0, b1, b2, b3, b4, b5, b6;
             b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
             for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11;
                b6 = white * 0.115926;
             }
        } else {
             for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
             }
        }
        return buffer;
    }

    createSoftClipCurve(amount: number) {
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; i++) {
            const x = (i * 2) / n_samples - 1;
            // Tanh gives a very tube-like, analog saturation
            curve[i] = Math.tanh(x * amount);
        }
        return curve;
    }

    createSaturator() {
        const shaper = this.ctx.createWaveShaper();
        shaper.curve = this.softClipCurve;
        shaper.oversample = '4x'; 
        return shaper;
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- HELPER: Connects source to Master + Reverb ---
    connectToMix(node: AudioNode, gainNode: GainNode) {
        gainNode.connect(this.masterGain);
        
        // Reverb Send (Slightly less than direct signal)
        const sendGain = this.ctx.createGain();
        sendGain.gain.value = 0.4; 
        gainNode.connect(sendGain);
        sendGain.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
    }

    // --- UI SOUNDS (Synthesized) ---
    playUiHover() {
        if (this.isMuted || this.ctx.state !== 'running') return; // Prevent playing if context is locked
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.05);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.masterGain); // Direct to master, no reverb needed for simple UI
        
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playUiClick() {
        this.initialize(); // Click is an interaction, try to init
        if (this.isMuted) return;
        
        // Short delay to ensure context is ready if it was just resumed
        if (this.ctx.state !== 'running') return;

        const now = this.ctx.currentTime;
        
        // Click transient
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // --- KILL CONFIRMATION (Dopamine Hit) ---
    playKillConfirm() {
        if (this.isMuted || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        const busGain = this.ctx.createGain();
        
        // 1. High "Ding" (Glassy Sine)
        const ding = this.ctx.createOscillator();
        ding.type = 'sine';
        ding.frequency.setValueAtTime(2000, now);
        ding.frequency.exponentialRampToValueAtTime(3000, now + 0.05); // Pitch up slide
        
        const dingGain = this.ctx.createGain();
        dingGain.gain.setValueAtTime(0.3, now);
        dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        ding.connect(dingGain); dingGain.connect(busGain);
        
        // 2. "Crunch" (Highpass Noise)
        const crunch = this.ctx.createBufferSource();
        crunch.buffer = this.noiseBuffer;
        const crunchFilter = this.ctx.createBiquadFilter();
        crunchFilter.type = 'highpass';
        crunchFilter.frequency.value = 1500;
        
        const crunchGain = this.ctx.createGain();
        crunchGain.gain.setValueAtTime(0.4, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        crunch.connect(crunchFilter); crunchFilter.connect(crunchGain); crunchGain.connect(busGain);

        busGain.connect(this.masterGain); // Kills don't need reverb, they are UI sounds
        
        ding.start(now); ding.stop(now + 0.3);
        crunch.start(now); crunch.stop(now + 0.15);
        
        setTimeout(() => busGain.disconnect(), 400);
    }

    // --- HEAVY EXPLOSION (For Bosses/Deaths) ---
    playExplosion() {
        if (this.isMuted || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        const busGain = this.ctx.createGain();
        
        // 1. Sub-Bass Drop (The "Thump")
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(150, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(1.0, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        // 2. Explosion Roar (Filtered Pink Noise)
        const roar = this.ctx.createBufferSource();
        roar.buffer = this.pinkNoiseBuffer;
        const roarFilter = this.ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(800, now);
        roarFilter.frequency.exponentialRampToValueAtTime(100, now + 0.6);

        const roarGain = this.ctx.createGain();
        roarGain.gain.setValueAtTime(0.8, now);
        roarGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        sub.connect(subGain); subGain.connect(busGain);
        roar.connect(roarFilter); roarFilter.connect(roarGain); roarGain.connect(busGain);

        this.connectToMix(busGain, busGain); // Explosions get reverb!

        sub.start(now); sub.stop(now + 0.5);
        roar.start(now); roar.stop(now + 0.8);
        
        setTimeout(() => busGain.disconnect(), 1000);
    }

    // --- SHOOTING SOUNDS ---
    playShoot(type: string = 'BULLET', weaponId?: string) {
        if (this.isMuted || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;

        // --- COMMON SETUP ---
        const busGain = this.ctx.createGain();
        const saturator = this.createSaturator();
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = (Math.random() * 0.4) - 0.2; 

        busGain.connect(saturator);
        saturator.connect(panner);
        
        // Use the new Mix helper to add Reverb
        this.connectToMix(panner, busGain);

        // --- SPECIFIC WEAPON PROFILES ---

        if (type === 'Flamethrower') {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.pinkNoiseBuffer;
            noise.loop = true;
            noise.loopStart = Math.random() * 1.0;
            noise.loopEnd = noise.loopStart + 0.5;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

            noise.connect(filter);
            filter.connect(busGain);

            busGain.gain.setValueAtTime(0, now);
            busGain.gain.linearRampToValueAtTime(0.4, now + 0.05); 
            busGain.gain.linearRampToValueAtTime(0, now + 0.3);

            noise.start(now);
            noise.stop(now + 0.35);

        } else if (type === 'Tesla') {
            const snap = this.ctx.createBufferSource();
            snap.buffer = this.noiseBuffer;
            
            const snapFilter = this.ctx.createBiquadFilter();
            snapFilter.type = 'highpass';
            snapFilter.frequency.value = 2000 + Math.random() * 3000; 
            
            const snapGain = this.ctx.createGain();
            
            snap.connect(snapFilter); 
            snapFilter.connect(snapGain); 
            snapGain.connect(busGain);
            
            snapGain.gain.setValueAtTime(0.6, now);
            snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); 
            
            snap.start(now); 
            snap.stop(now + 0.15);

        } else if (['Sniper', 'Assassin', 'Ranger', 'Hunter', 'Predator'].includes(weaponId || '') || (weaponId && weaponId.includes('sniper'))) {
            const crack = this.ctx.createBufferSource();
            crack.buffer = this.noiseBuffer;
            const crackFilter = this.ctx.createBiquadFilter();
            crackFilter.type = 'highpass';
            crackFilter.frequency.value = 1000;
            crack.connect(crackFilter);
            crackFilter.connect(busGain);

            const thud = this.ctx.createOscillator();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(150, now);
            thud.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);
            thud.connect(busGain);

            busGain.gain.setValueAtTime(0.8, now);
            busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6); 

            crack.start(now); thud.start(now);
            crack.stop(now + 0.2); thud.stop(now + 0.3);

        } else if (['Destroyer', 'Annihilator', 'Hybrid', 'Skimmer', 'Rocketeer', 'Shotgun'].includes(weaponId || '') || type === 'Shotgun') {
            const kick = this.ctx.createOscillator();
            kick.type = 'sine';
            kick.frequency.setValueAtTime(80, now); // Lower frequency
            kick.frequency.exponentialRampToValueAtTime(20, now + 0.5);

            const noise = this.ctx.createBufferSource();
            noise.buffer = this.pinkNoiseBuffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 600;

            kick.connect(busGain);
            noise.connect(noiseFilter);
            noiseFilter.connect(busGain);

            busGain.gain.setValueAtTime(1.0, now);
            busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

            kick.start(now); noise.start(now);
            kick.stop(now + 0.6); noise.stop(now + 0.5);

        } else if (['Machine Gun', 'Twin', 'Sprayer', 'Gunner', 'Auto-5', 'Streamliner', 'Octo Tank'].includes(weaponId || '') || weaponId?.includes('auto')) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

            busGain.gain.setValueAtTime(0.25, now);
            busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.connect(busGain);
            osc.start(now);
            osc.stop(now + 0.1);

        } else if (type === 'Laser' || weaponId === 'Pulsar') {
            const carrier = this.ctx.createOscillator();
            const modulator = this.ctx.createOscillator();
            const modGain = this.ctx.createGain();

            carrier.type = 'sine';
            carrier.frequency.setValueAtTime(1200, now);
            carrier.frequency.exponentialRampToValueAtTime(200, now + 0.2);

            modulator.type = 'square';
            modulator.frequency.value = 50; 

            modGain.gain.setValueAtTime(500, now);
            modGain.gain.exponentialRampToValueAtTime(10, now + 0.15);

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            carrier.connect(busGain);

            busGain.gain.setValueAtTime(0.3, now);
            busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            carrier.start(now); modulator.start(now);
            carrier.stop(now + 0.2); modulator.stop(now + 0.2);

        } else if (type === 'Launcher' || type === 'MISSILE') {
             const noise = this.ctx.createBufferSource();
             noise.buffer = this.noiseBuffer;
             
             const filter = this.ctx.createBiquadFilter();
             filter.type = 'lowpass';
             filter.frequency.setValueAtTime(200, now);
             filter.frequency.exponentialRampToValueAtTime(1500, now + 0.3);

             noise.connect(filter);
             filter.connect(busGain);
             
             busGain.gain.setValueAtTime(0.4, now);
             busGain.gain.linearRampToValueAtTime(0, now + 0.4);

             noise.start(now); noise.stop(now + 0.4);

        } else if (type === 'Drone' || type === 'Necro' || type === 'Swarm' || type === 'Minion') {
             const osc = this.ctx.createOscillator();
             osc.type = 'sine';
             osc.frequency.setValueAtTime(800, now);
             osc.frequency.linearRampToValueAtTime(1200, now + 0.05); 

             const lfo = this.ctx.createOscillator();
             lfo.frequency.value = 50;
             const lfoGain = this.ctx.createGain();
             lfoGain.gain.value = 200;
             lfo.connect(lfoGain);
             lfoGain.connect(osc.frequency);

             busGain.gain.setValueAtTime(0.2, now);
             busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

             osc.connect(busGain); lfo.start(now); osc.start(now);
             lfo.stop(now + 0.2); osc.stop(now + 0.2);

        } else if (type === 'Trap') {
             const osc = this.ctx.createOscillator();
             osc.type = 'square';
             osc.frequency.setValueAtTime(150, now);
             
             const noise = this.ctx.createBufferSource();
             noise.buffer = this.noiseBuffer;
             
             const bp = this.ctx.createBiquadFilter();
             bp.type = 'bandpass';
             bp.frequency.value = 800;

             noise.connect(bp); bp.connect(busGain);
             osc.connect(busGain);

             busGain.gain.setValueAtTime(0.3, now);
             busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

             osc.start(now); noise.start(now);
             osc.stop(now + 0.1); noise.stop(now + 0.1);

        } else if (type === 'Sonic') {
             const osc = this.ctx.createOscillator();
             osc.type = 'sine';
             osc.frequency.setValueAtTime(80, now);
             osc.frequency.linearRampToValueAtTime(40, now + 0.3);

             busGain.gain.setValueAtTime(0.6, now);
             busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

             osc.connect(busGain);
             osc.start(now); osc.stop(now + 0.4);
        } else {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

            busGain.gain.setValueAtTime(0.2, now);
            busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(busGain);
            osc.start(now);
            osc.stop(now + 0.15);
        }

        setTimeout(() => { 
            busGain.disconnect(); 
            panner.disconnect();
        }, 1000);
    }

    playHit(isMetal: boolean = false) {
        if (this.isMuted || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        
        const busGain = this.ctx.createGain();
        const saturator = this.createSaturator();
        busGain.connect(saturator);
        
        // Hits use less reverb to stay punchy
        busGain.connect(this.masterGain);

        if (isMetal) {
             // Wall Hit: Shorter, lower volume, less partials
             const partials = [1, 2.5];
             partials.forEach((p, i) => {
                 const osc = this.ctx.createOscillator();
                 osc.type = 'sine';
                 osc.frequency.setValueAtTime(150 * p, now); // Lower pitch for solid thud
                 
                 const g = this.ctx.createGain();
                 g.gain.setValueAtTime(0.05 / (i+1), now); // Much quieter
                 g.gain.exponentialRampToValueAtTime(0.001, now + (0.05 / p)); // Faster decay
                 
                 osc.connect(g);
                 g.connect(busGain);
                 osc.start(now);
                 osc.stop(now + 0.1);
             });
        } else {
             const osc = this.ctx.createOscillator();
             osc.type = 'triangle';
             osc.frequency.setValueAtTime(120, now);
             osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
             
             busGain.gain.setValueAtTime(0.3, now);
             busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
             
             osc.connect(busGain);
             osc.start(now);
             osc.stop(now + 0.1);
        }
        
        setTimeout(() => busGain.disconnect(), 250);
    }

    playDamage() {
        if (this.isMuted || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        
        const busGain = this.ctx.createGain();
        const saturator = this.createSaturator();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -20;
        comp.ratio.value = 10;
        
        busGain.connect(saturator);
        saturator.connect(comp);
        comp.connect(this.masterGain);

        busGain.gain.setValueAtTime(1.0, now);
        busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        const kick = this.ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.linearRampToValueAtTime(200, now + 0.2);

        kick.connect(busGain);
        noise.connect(filter);
        filter.connect(busGain);

        kick.start(now);
        noise.start(now);
        kick.stop(now + 0.3);
        noise.stop(now + 0.3);

        setTimeout(() => {
            busGain.disconnect();
            comp.disconnect();
        }, 500);
    }
}

// Export singleton
export const soundManager = new SoundManager();

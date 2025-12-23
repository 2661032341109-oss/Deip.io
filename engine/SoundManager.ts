
export class SoundManager {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;
    limiter: DynamicsCompressorNode | null = null;
    
    // Effects
    reverbNode: ConvolverNode | null = null;
    reverbGain: GainNode | null = null;

    // Resources
    noiseBuffer: AudioBuffer | null = null;
    pinkNoiseBuffer: AudioBuffer | null = null;
    softClipCurve: Float32Array | null = null;
    
    isMuted: boolean = false;
    isInitialized: boolean = false;

    constructor() {
        // Do nothing in constructor to prevent auto-play policy errors on import
    }

    // Call this on first user interaction to unlock audio context
    initialize() {
        if (this.isInitialized) {
            this.resume();
            return;
        }

        try {
            // @ts-ignore
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // 1. Master Chain: Master Gain -> Limiter -> Destination
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.4; 

            // Limiter (Safety & Glue)
            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -12; 
            this.limiter.knee.value = 30;       
            this.limiter.ratio.value = 15;      
            this.limiter.attack.value = 0.003;  
            this.limiter.release.value = 0.25;  

            // 2. Reverb System (The "AAA" Space)
            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = this.generateImpulseResponse(1.5, 2.0); 
            this.reverbGain = this.ctx.createGain();
            this.reverbGain.gain.value = 0.35; 

            // Routing
            this.masterGain.connect(this.limiter);
            this.limiter.connect(this.ctx.destination);
            
            // Pre-generate assets
            this.noiseBuffer = this.createNoiseBuffer(false); 
            this.pinkNoiseBuffer = this.createNoiseBuffer(true); 
            this.softClipCurve = this.createSoftClipCurve(4.0); 

            this.isInitialized = true;
            console.log("[AUDIO] System Initialized");
        } catch (e) {
            console.warn("[AUDIO] Initialization failed (likely no hardware):", e);
        }
    }

    generateImpulseResponse(duration: number, decay: number) {
        if (!this.ctx) return null;
        const length = this.ctx.sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = i / length;
            const vol = Math.pow(1 - n, decay);
            left[i] = (Math.random() * 2 - 1) * vol;
            right[i] = (Math.random() * 2 - 1) * vol;
        }
        return impulse;
    }

    createNoiseBuffer(isPink: boolean = false) {
        if (!this.ctx) return null;
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
            curve[i] = Math.tanh(x * amount);
        }
        return curve;
    }

    createSaturator() {
        if (!this.ctx || !this.softClipCurve) return null;
        const shaper = this.ctx.createWaveShaper();
        shaper.curve = this.softClipCurve;
        shaper.oversample = '4x'; 
        return shaper;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    connectToMix(node: AudioNode, gainNode: GainNode) {
        if (!this.masterGain || !this.ctx || !this.reverbNode || !this.reverbGain) return;
        gainNode.connect(this.masterGain);
        
        const sendGain = this.ctx.createGain();
        sendGain.gain.value = 0.4; 
        gainNode.connect(sendGain);
        sendGain.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
    }

    playUiHover() {
        if (this.isMuted || !this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.05);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playUiClick() {
        // Ensure initialized on click
        if (!this.isInitialized) this.initialize();
        if (this.isMuted || !this.ctx || !this.masterGain) return;
        
        const now = this.ctx.currentTime;
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

    playKillConfirm() {
        if (this.isMuted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;
        const busGain = this.ctx.createGain();
        
        const ding = this.ctx.createOscillator();
        ding.type = 'sine';
        ding.frequency.setValueAtTime(2000, now);
        ding.frequency.exponentialRampToValueAtTime(3000, now + 0.05); 
        
        const dingGain = this.ctx.createGain();
        dingGain.gain.setValueAtTime(0.3, now);
        dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        ding.connect(dingGain); dingGain.connect(busGain);
        
        const crunch = this.ctx.createBufferSource();
        crunch.buffer = this.noiseBuffer;
        const crunchFilter = this.ctx.createBiquadFilter();
        crunchFilter.type = 'highpass';
        crunchFilter.frequency.value = 1500;
        
        const crunchGain = this.ctx.createGain();
        crunchGain.gain.setValueAtTime(0.4, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        crunch.connect(crunchFilter); crunchFilter.connect(crunchGain); crunchGain.connect(busGain);

        busGain.connect(this.masterGain);
        
        ding.start(now); ding.stop(now + 0.3);
        crunch.start(now); crunch.stop(now + 0.15);
        
        setTimeout(() => busGain.disconnect(), 400);
    }

    playExplosion() {
        if (this.isMuted || !this.ctx || !this.pinkNoiseBuffer || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const busGain = this.ctx.createGain();
        
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(150, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(1.0, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

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

        this.connectToMix(busGain, busGain); 

        sub.start(now); sub.stop(now + 0.5);
        roar.start(now); roar.stop(now + 0.8);
        
        setTimeout(() => busGain.disconnect(), 1000);
    }

    playShoot(type: string = 'BULLET', weaponId?: string) {
        if (this.isMuted || !this.ctx || !this.noiseBuffer || !this.pinkNoiseBuffer || !this.masterGain) return;
        const now = this.ctx.currentTime;

        const busGain = this.ctx.createGain();
        const saturator = this.createSaturator();
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = (Math.random() * 0.4) - 0.2; 

        if (saturator) {
            busGain.connect(saturator);
            saturator.connect(panner);
        } else {
            busGain.connect(panner);
        }
        
        this.connectToMix(panner, busGain);

        if (type === 'Flamethrower') {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.pinkNoiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
            noise.connect(filter); filter.connect(busGain);
            busGain.gain.setValueAtTime(0, now);
            busGain.gain.linearRampToValueAtTime(0.4, now + 0.05); 
            busGain.gain.linearRampToValueAtTime(0, now + 0.3);
            noise.start(now); noise.stop(now + 0.35);
        } 
        else {
            // Generic fallback for safety if detailed profiles fail or complex logic
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

        setTimeout(() => { busGain.disconnect(); panner.disconnect(); }, 1000);
    }

    playHit(isMetal: boolean = false) {
        if (this.isMuted || !this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        
        const busGain = this.ctx.createGain();
        const saturator = this.createSaturator();
        if(saturator) busGain.connect(saturator);
        busGain.connect(this.masterGain);

        if (isMetal) {
             const osc = this.ctx.createOscillator();
             osc.type = 'sine';
             osc.frequency.setValueAtTime(150, now); 
             const g = this.ctx.createGain();
             g.gain.setValueAtTime(0.05, now); 
             g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); 
             osc.connect(g); g.connect(busGain);
             osc.start(now); osc.stop(now + 0.1);
        } else {
             const osc = this.ctx.createOscillator();
             osc.type = 'triangle';
             osc.frequency.setValueAtTime(120, now);
             osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
             busGain.gain.setValueAtTime(0.3, now);
             busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
             osc.connect(busGain);
             osc.start(now); osc.stop(now + 0.1);
        }
        setTimeout(() => busGain.disconnect(), 250);
    }

    playDamage() {
        if (this.isMuted || !this.ctx || !this.noiseBuffer || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const busGain = this.ctx.createGain();
        
        const kick = this.ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        
        busGain.gain.setValueAtTime(1.0, now);
        busGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        kick.connect(busGain);
        busGain.connect(this.masterGain);

        kick.start(now);
        kick.stop(now + 0.3);

        setTimeout(() => busGain.disconnect(), 500);
    }
}

export const soundManager = new SoundManager();

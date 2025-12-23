
import { AccountData, SkinId, Mission, LifetimeStats, GameSettings, Language, SavedRun, TrailId, FlagId, LeaderboardEntry } from '../types';
import i18n from '../i18n';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthManager } from './persistence/AuthManager';
import { ProgressionManager } from './persistence/ProgressionManager';

const ACCOUNT_KEY = 'COREBOUND_ACCOUNT_V4'; 
const SETTINGS_KEY = 'COREBOUND_SETTINGS_V7'; 
const NAME_CHANGE_COOLDOWN = 3 * 24 * 60 * 60 * 1000;

const INITIAL_STATS: LifetimeStats = {
    gamesPlayed: 0, totalKills: 0, totalScore: 0, totalPlayTime: 0, highestLevel: 1, bossesKilled: 0
};

const INITIAL_ACCOUNT: AccountData = {
    role: 'USER', nickname: '', lastNameChange: 0, totalExp: 0, rank: 1, currency: 0,
    unlockedSkins: ['DEFAULT'], unlockedTrails: ['NONE'], unlockedFlags: ['NONE', 'TH'], 
    equippedSkin: 'DEFAULT', equippedTrail: 'NONE', equippedFlag: 'NONE',
    highScore: 0, lastLogin: Date.now(), dailyStreak: 0, missions: [],
    stats: INITIAL_STATS, lastMissionReset: 0, savedRun: null, badges: [] 
};

// Default Settings Object (Minimizing file size, same content as before)
const DEFAULT_SETTINGS: GameSettings = {
    language: (i18n.language && ['EN','TH','JP'].includes(i18n.language.toUpperCase())) ? i18n.language.toUpperCase() as Language : 'EN',
    fontTheme: 'CORE', qualityPreset: 'MEDIUM',
    graphics: { resolution: 100, particles: 100, bloom: true, motionBlur: true, shake: true, shadows: true, damageNumbers: true, chromaticAberration: true, gridVisibility: 40 },
    controls: { sensitivity: 50, mobileOrientation: 'AUTO', haptic: true, leftHanded: false, joystickSize: 100, joystickOpacity: 60, joystickDeadzone: 10, aimAssistStrength: 50, touchSmoothing: 20 },
    interface: { crosshairType: 'DEFAULT', crosshairColor: '#00f3ff', showNetGraph: true, minimapScale: 100, minimapOpacity: 80, streamerMode: false, aimLine: false },
    gameplay: { autoLevelPriority: false },
    network: { interpDelay: 100, buffering: 'BALANCED', prediction: true, packetRate: '60' },
    advanced: { lowLatencyMode: false, fpsCap: 0, rawInput: false, batterySaver: false },
    audio: { master: 50, sfx: 100, music: 40 },
    accessibility: { colorblindMode: 'NONE', screenFlash: true, uiScale: 100 }
};

export type RankTier = 'CADET' | 'SCOUT' | 'VANGUARD' | 'ELITE' | 'COMMANDER' | 'WARLORD' | 'OVERLORD' | 'TITAN' | 'CELESTIAL' | 'ETERNAL';

export const RANK_DEFINITIONS: { tier: RankTier, minRank: number, color: string, icon: string, reward?: { type: 'SKIN' | 'BUFF', value: string, label: string } }[] = [
    { tier: 'CADET', minRank: 1, color: '#94a3b8', icon: '🛡️' },      
    { tier: 'SCOUT', minRank: 10, color: '#4ade80', icon: '⚔️', reward: { type: 'SKIN', value: 'NEON_RED', label: 'Unlock: Crimson Fury' } },      
    { tier: 'VANGUARD', minRank: 20, color: '#22d3ee', icon: '💠', reward: { type: 'BUFF', value: 'START_LVL_2', label: 'Buff: Start at Level 2' } },  
    { tier: 'ELITE', minRank: 30, color: '#a855f7', icon: '🔮', reward: { type: 'SKIN', value: 'TOXIC_HAZARD', label: 'Unlock: Bio-Hazard' } },     
    { tier: 'COMMANDER', minRank: 40, color: '#f43f5e', icon: '🎖️', reward: { type: 'BUFF', value: 'START_LVL_5', label: 'Buff: Start at Level 5' } }, 
    { tier: 'WARLORD', minRank: 50, color: '#fbbf24', icon: '👑', reward: { type: 'SKIN', value: 'CYBER_PUNK', label: 'Unlock: Night City' } },   
    { tier: 'OVERLORD', minRank: 60, color: '#f97316', icon: '👁️', reward: { type: 'BUFF', value: 'START_LVL_10', label: 'Buff: Start at Level 10' } },
    { tier: 'TITAN', minRank: 70, color: '#60a5fa', icon: '🗿', reward: { type: 'SKIN', value: 'GOLDEN_GLORY', label: 'Unlock: Midas Touch' } },
    { tier: 'CELESTIAL', minRank: 80, color: '#e879f9', icon: '🌌', reward: { type: 'BUFF', value: 'START_LVL_15', label: 'Buff: Start at Level 15' } },
    { tier: 'ETERNAL', minRank: 100, color: '#ffffff', icon: '♾️', reward: { type: 'SKIN', value: 'VOID_WALKER', label: 'Unlock: Void Walker' } } 
];

// Helper Functions
export const getRankInfo = (rank: number) => {
    let current = RANK_DEFINITIONS[0];
    let next = RANK_DEFINITIONS[1];
    for (let i = 0; i < RANK_DEFINITIONS.length; i++) {
        if (rank >= RANK_DEFINITIONS[i].minRank) {
            current = RANK_DEFINITIONS[i];
            next = RANK_DEFINITIONS[i + 1] || null;
        } else break;
    }
    return { current, next };
};

export const calculateRank = (exp: number): number => {
    let rank = 1; let required = 100;
    while (exp >= required && rank < 100) { exp -= required; rank++; required = rank * 100; }
    return rank;
};

export const getLevelProgress = (totalExp: number, currentRank: number) => {
    let xpConsumed = 0; for(let i=1; i<currentRank; i++) xpConsumed += i * 100;
    const currentLevelExp = totalExp - xpConsumed; const requiredForNext = currentRank * 100;
    return { current: currentLevelExp, required: requiredForNext, percent: (currentLevelExp / requiredForNext) * 100 };
};

// --- SINGLETON PERSISTENCE FACADE ---
let currentUserId: string | null = null;
let presenceChannel: RealtimeChannel | null = null;

export const Persistence = {
    // Auth Delegates
    loginDiscord: AuthManager.loginDiscord,
    loginEmail: AuthManager.loginEmail,
    registerEmail: AuthManager.registerEmail,
    logout: AuthManager.logout,

    initAuth: (onUserChange: (user: any) => void) => {
        // Popup Handling for Discord OAuth
        if (window.opener && window.opener !== window) {
            const hash = window.location.hash;
            if (hash && (hash.includes('access_token') || hash.includes('error'))) {
                supabase.auth.getSession().then(({ data }) => { if (data.session) setTimeout(() => window.close(), 500); });
                return;
            }
        }
        supabase.auth.getSession().then(({ data: { session } }) => {
            currentUserId = session?.user?.id || null;
            if (currentUserId) Persistence.syncCloudToLocal();
            onUserChange(session?.user || null);
        });
        supabase.auth.onAuthStateChange(async (event, session) => {
            const newUser = session?.user?.id || null;
            if (newUser !== currentUserId) {
                currentUserId = newUser;
                if (newUser) await Persistence.syncCloudToLocal();
                onUserChange(session?.user || null);
            }
        });
    },

    initPresence: (onCountUpdate: (count: number) => void) => {
        if (presenceChannel) presenceChannel.unsubscribe();
        presenceChannel = supabase.channel('global_presence_v1');
        presenceChannel.on('presence', { event: 'sync' }, () => {
            const state = presenceChannel!.presenceState();
            let count = 0; for (const key in state) count += state[key].length;
            onCountUpdate(Math.max(1, count));
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel!.track({ user_id: currentUserId || `guest-${Math.random()}`, online_at: new Date().toISOString() });
            }
        });
        return () => { if (presenceChannel) presenceChannel.unsubscribe(); };
    },

    // Data Management
    load: (): AccountData => {
        try {
            const raw = localStorage.getItem(ACCOUNT_KEY);
            if (raw) return { ...INITIAL_ACCOUNT, ...JSON.parse(raw) };
        } catch (e) {}
        return { ...INITIAL_ACCOUNT };
    },
    save: (data: AccountData) => {
        try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data)); if (currentUserId) Persistence.saveToCloud(data); } catch (e) {}
    },
    saveToCloud: async (data: AccountData) => {
        if (!currentUserId) return;
        await supabase.from('profiles').upsert({ id: currentUserId, nickname: data.nickname, game_data: data, updated_at: new Date().toISOString() });
    },
    syncCloudToLocal: async () => {
        if (!currentUserId) return;
        const { data } = await supabase.from('profiles').select('game_data, nickname').eq('id', currentUserId).single();
        if (data && data.game_data) {
            const local = Persistence.load(); const cloud = data.game_data as AccountData;
            if (cloud.totalExp >= local.totalExp) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(cloud));
            else await Persistence.saveToCloud(local);
        }
    },

    // Identity
    canChangeNickname: () => {
        const data = Persistence.load();
        const diff = Date.now() - (data.lastNameChange || 0);
        return diff >= NAME_CHANGE_COOLDOWN ? { allowed: true, timeLeft: 0 } : { allowed: false, timeLeft: NAME_CHANGE_COOLDOWN - diff };
    },
    updateNickname: async (newName: string) => {
        if (!newName.trim() || newName.length > 15) return { success: false, message: 'Invalid Length' };
        const check = Persistence.canChangeNickname();
        if (!check.allowed) return { success: false, message: 'Cooldown Active' };
        const data = Persistence.load();
        data.nickname = newName; data.lastNameChange = Date.now();
        Persistence.save(data);
        return { success: true, message: 'Success' };
    },

    // Features
    fetchGlobalLeaderboard: () => ProgressionManager.fetchGlobalLeaderboard(currentUserId),
    checkDailyLogic: () => {
        const data = Persistence.load(); const now = Date.now(); const oneDay = 86400000;
        let bonus = 0;
        if (now - data.lastLogin > oneDay) {
            bonus = 100 + (now - data.lastLogin < oneDay*2 ? Math.min(++data.dailyStreak * 50, 500) : (data.dailyStreak=1, 0));
            data.lastLogin = now; data.currency += bonus;
        }
        if (now - data.lastMissionReset > oneDay || data.missions.length === 0) {
            data.missions = ProgressionManager.generateMissions(); data.lastMissionReset = now;
        }
        Persistence.save(data);
        return { bonus, newMissions: false };
    },
    claimMission: (id: string) => {
        const data = Persistence.load(); const m = data.missions.find(x => x.id === id);
        if (m && !m.isClaimed && m.currentValue >= m.targetValue) { m.isClaimed = true; data.currency += m.reward; Persistence.save(data); return data; }
        return null;
    },
    processMatchResult: (result: { score: number, kills: number, timeAlive: number, level: number, bossKills: number }) => {
        const data = Persistence.load();
        const currencyEarned = Math.floor(result.score/500 + result.kills/2 + result.timeAlive/30);
        data.currency += currencyEarned; data.totalExp += result.score + (result.kills*100);
        const oldRank = data.rank; data.rank = calculateRank(data.totalExp);
        if (data.rank > oldRank) {
            const tier = getRankInfo(data.rank).current;
            if (tier.reward?.type === 'SKIN' && !data.unlockedSkins.includes(tier.reward.value)) data.unlockedSkins.push(tier.reward.value);
        }
        if (result.score > data.highScore) data.highScore = result.score;
        // Stats update
        data.stats.gamesPlayed++; data.stats.totalKills += result.kills; data.stats.totalScore += result.score;
        data.stats.totalPlayTime += result.timeAlive; data.stats.bossesKilled += result.bossKills;
        data.stats.highestLevel = Math.max(data.stats.highestLevel, result.level);
        
        let completedMissions = 0;
        data.missions.forEach(m => {
            if (m.isClaimed) return;
            if (m.type === 'KILL') m.currentValue += result.kills;
            else if (m.type === 'BOSS_KILL') m.currentValue += result.bossKills;
            else if (m.type === 'SCORE') m.currentValue = Math.max(m.currentValue, result.score);
            else if (m.type === 'LEVEL') m.currentValue = Math.max(m.currentValue, result.level);
            else if (m.type === 'PLAYTIME') m.currentValue = Math.max(m.currentValue, result.timeAlive);
            if (m.currentValue >= m.targetValue) completedMissions++;
        });
        Persistence.save(data);
        return { currencyEarned, expEarned: 0, completedMissions };
    },
    unlockItem: (type: 'SKIN' | 'TRAIL' | 'FLAG', id: string, cost: number) => {
        const data = Persistence.load();
        if (data.currency >= cost) {
            const list = type === 'SKIN' ? 'unlockedSkins' : (type === 'TRAIL' ? 'unlockedTrails' : 'unlockedFlags');
            // @ts-ignore
            if (!data[list].includes(id)) { data.currency -= cost; data[list].push(id); Persistence.save(data); return true; }
        }
        return false;
    },
    equipItem: (type: 'SKIN' | 'TRAIL' | 'FLAG', id: string) => {
        const data = Persistence.load();
        const list = type === 'SKIN' ? 'unlockedSkins' : (type === 'TRAIL' ? 'unlockedTrails' : 'unlockedFlags');
        const field = type === 'SKIN' ? 'equippedSkin' : (type === 'TRAIL' ? 'equippedTrail' : 'equippedFlag');
        // @ts-ignore
        if (data[list].includes(id)) { data[field] = id; Persistence.save(data); }
    },
    saveRun: (runData: SavedRun) => { const d = Persistence.load(); d.savedRun = runData; Persistence.save(d); },
    clearSavedRun: () => { const d = Persistence.load(); d.savedRun = null; Persistence.save(d); },
    loadSettings: () => { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return DEFAULT_SETTINGS; } },
    saveSettings: (s: GameSettings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)),
    exportSaveString: () => btoa(JSON.stringify(Persistence.load())),
    importSaveString: (str: string) => { try { const d = JSON.parse(atob(str)); if(typeof d.rank === 'number') { Persistence.save({...INITIAL_ACCOUNT, ...d}); return true; } } catch {} return false; }
};

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
const COUNTRIES_LIST: {id: string, name: string}[] = [
    {id:'TH',name:'Thailand'}, {id:'US',name:'USA'}, {id:'JP',name:'Japan'}, {id:'CN',name:'China'}, {id:'RU',name:'Russia'}, {id:'DE',name:'Germany'}, 
    {id:'GB',name:'United Kingdom'}, {id:'FR',name:'France'}, {id:'KR',name:'South Korea'}, {id:'BR',name:'Brazil'}, {id:'IN',name:'India'}, 
    {id:'CA',name:'Canada'}, {id:'AU',name:'Australia'}, {id:'IT',name:'Italy'}, {id:'ES',name:'Spain'}, {id:'MX',name:'Mexico'}, {id:'ID',name:'Indonesia'},
    {id:'TR',name:'Turkey'}, {id:'NL',name:'Netherlands'}, {id:'SA',name:'Saudi Arabia'}, {id:'CH',name:'Switzerland'}, {id:'SE',name:'Sweden'}, 
    {id:'PL',name:'Poland'}, {id:'BE',name:'Belgium'}, {id:'AR',name:'Argentina'}, {id:'NO',name:'Norway'}, {id:'VN',name:'Vietnam'}, {id:'SG',name:'Singapore'},
    {id:'MY',name:'Malaysia'}, {id:'PH',name:'Philippines'}, {id:'HK',name:'Hong Kong'}, {id:'TW',name:'Taiwan'}, {id:'UA',name:'Ukraine'}, {id:'FI',name:'Finland'},
    {id:'DK',name:'Denmark'}, {id:'PT',name:'Portugal'}, {id:'GR',name:'Greece'}, {id:'IE',name:'Ireland'}, {id:'NZ',name:'New Zealand'}, {id:'AT',name:'Austria'},
    {id:'CZ',name:'Czech Republic'}, {id:'HU',name:'Hungary'}, {id:'RO',name:'Romania'}, {id:'IL',name:'Israel'}, {id:'ZA',name:'South Africa'}, {id:'EG',name:'Egypt'},
    {id:'CL',name:'Chile'}, {id:'CO',name:'Colombia'}, {id:'PE',name:'Peru'}, {id:'PK',name:'Pakistan'}, {id:'BD',name:'Bangladesh'}, {id:'NG',name:'Nigeria'}
];
const FLAG_ITEMS: any[] = COUNTRIES_LIST.map(c => ({ id: c.id, type: 'FLAG', name: c.name, cost: 100, rarity: 'COMMON', desc: `Flag of ${c.name}` }));

export const SHOP_ITEMS: { id: string, type: 'SKIN' | 'TRAIL' | 'FLAG', name: string, cost: number, rarity: Rarity, color?: string, desc: string }[] = [
    { id: 'DEFAULT', type: 'SKIN', name: 'Standard Issue', cost: 0, rarity: 'COMMON', color: '#00f3ff', desc: 'Factory default chassis.' },
    { id: 'NEON_RED', type: 'SKIN', name: 'Crimson Fury', cost: 1000, rarity: 'RARE', color: '#ff0033', desc: 'Aggressive red styling.' },
    { id: 'TOXIC_HAZARD', type: 'SKIN', name: 'Bio-Hazard', cost: 1500, rarity: 'RARE', color: '#00ff44', desc: 'Warning: Radioactive.' },
    { id: 'CYBER_PUNK', type: 'SKIN', name: 'Night City', cost: 2500, rarity: 'EPIC', color: '#d946ef', desc: 'High contrast neon purple.' },
    { id: 'GOLDEN_GLORY', type: 'SKIN', name: 'Midas Touch', cost: 5000, rarity: 'LEGENDARY', color: '#ffd700', desc: 'Solid gold plating.' },
    { id: 'VOID_WALKER', type: 'SKIN', name: 'Void Walker', cost: 10000, rarity: 'MYTHIC', color: '#ffffff', desc: 'Absorbs all light.' },
    { id: 'VAPORWAVE', type: 'SKIN', name: 'Vaporwave', cost: 3000, rarity: 'EPIC', color: '#ff77aa', desc: 'A E S T H E T I C.' },
    { id: 'ARCTIC_OPS', type: 'SKIN', name: 'Arctic Ops', cost: 2000, rarity: 'RARE', color: '#a5f3fc', desc: 'Camouflage for frozen wastes.' },
    { id: 'MAGMA_LORD', type: 'SKIN', name: 'Magma Lord', cost: 8000, rarity: 'LEGENDARY', color: '#f97316', desc: 'Forged in the core.' },
    { id: 'MATRIX_CODE', type: 'SKIN', name: 'The Source', cost: 15000, rarity: 'MYTHIC', color: '#00ff00', desc: 'You see the code.' },
    { id: 'GLASS_CANNON', type: 'SKIN', name: 'Glass Cannon', cost: 5000, rarity: 'LEGENDARY', color: 'rgba(255,255,255,0.2)', desc: 'Transparent hull.' },
    { id: 'MIDNIGHT', type: 'SKIN', name: 'Midnight', cost: 500, rarity: 'COMMON', color: '#312e81', desc: 'Deep blue stealth.' },
    { id: 'NONE', type: 'TRAIL', name: 'No Trail', cost: 0, rarity: 'COMMON', desc: 'Standard engine exhaust.' },
    { id: 'EMBER', type: 'TRAIL', name: 'Ember', cost: 1000, rarity: 'RARE', desc: 'Leave burning sparks behind.' },
    { id: 'FROST', type: 'TRAIL', name: 'Frostbite', cost: 2000, rarity: 'RARE', desc: 'Icy particles.' },
    { id: 'ELECTRIC', type: 'TRAIL', name: 'Voltage', cost: 3500, rarity: 'EPIC', desc: 'Sparks of electricity.' },
    { id: 'MATRIX', type: 'TRAIL', name: 'Digital Rain', cost: 5000, rarity: 'LEGENDARY', desc: 'Falling green code.' },
    { id: 'RAINBOW', type: 'TRAIL', name: 'Nyan', cost: 7500, rarity: 'LEGENDARY', desc: 'RGB gaming setup.' },
    { id: 'SHADOW', type: 'TRAIL', name: 'Shadow Step', cost: 4000, rarity: 'EPIC', desc: 'Dark smoke.' },
    { id: 'HEARTS', type: 'TRAIL', name: 'Love Struck', cost: 6000, rarity: 'LEGENDARY', desc: 'Emit love hearts.' },
    { id: 'PIXEL', type: 'TRAIL', name: '8-Bit', cost: 2500, rarity: 'RARE', desc: 'Retro pixel blocks.' },
    { id: 'NONE', type: 'FLAG', name: 'No Emblem', cost: 0, rarity: 'COMMON', desc: 'Clean hull.' },
    ...FLAG_ITEMS,
    { id: 'UN', type: 'FLAG', name: 'United Nations', cost: 500, rarity: 'RARE', desc: 'Global Peacekeeper' },
    { id: 'EU', type: 'FLAG', name: 'European Union', cost: 500, rarity: 'RARE', desc: 'European Union' },
];

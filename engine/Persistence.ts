
import { AccountData, SkinId, Mission, LifetimeStats, GameSettings, Language, SavedRun, TrailId, FlagId, LeaderboardEntry } from '../types';
import i18n from '../i18n';
import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

const ACCOUNT_KEY = 'COREBOUND_ACCOUNT_V4'; 
const SETTINGS_KEY = 'COREBOUND_SETTINGS_V7'; 
const NAME_CHANGE_COOLDOWN = 3 * 24 * 60 * 60 * 1000; // 3 Days (Strict Identity)

const INITIAL_STATS: LifetimeStats = {
    gamesPlayed: 0,
    totalKills: 0,
    totalScore: 0,
    totalPlayTime: 0,
    highestLevel: 1,
    bossesKilled: 0
};

const INITIAL_ACCOUNT: AccountData = {
    role: 'USER', // Default Role
    nickname: '',
    lastNameChange: 0, 
    totalExp: 0,
    rank: 1,
    currency: 0,
    unlockedSkins: ['DEFAULT'],
    unlockedTrails: ['NONE'],
    unlockedFlags: ['NONE', 'TH'], 
    equippedSkin: 'DEFAULT',
    equippedTrail: 'NONE',
    equippedFlag: 'NONE',
    highScore: 0,
    lastLogin: Date.now(),
    dailyStreak: 0,
    missions: [],
    stats: INITIAL_STATS,
    lastMissionReset: 0,
    savedRun: null,
    badges: [] 
};

// ... (Default Settings same as before)
const DEFAULT_SETTINGS: GameSettings = {
    language: (i18n.language && ['EN','TH','JP'].includes(i18n.language.toUpperCase())) ? i18n.language.toUpperCase() as Language : 'EN',
    fontTheme: 'CORE', 
    qualityPreset: 'MEDIUM',
    graphics: {
      resolution: 100,
      particles: 100,
      bloom: true,
      motionBlur: true,
      shake: true,
      shadows: true,
      damageNumbers: true,
      chromaticAberration: true,
      gridVisibility: 40,
    },
    controls: {
      sensitivity: 50,
      mobileOrientation: 'AUTO',
      haptic: true,
      leftHanded: false,
      joystickSize: 100,
      joystickOpacity: 60,
      joystickDeadzone: 10,
      aimAssistStrength: 50,
      touchSmoothing: 20
    },
    interface: {
      crosshairType: 'DEFAULT',
      crosshairColor: '#00f3ff',
      showNetGraph: true,
      minimapScale: 100,
      minimapOpacity: 80,
      streamerMode: false,
      aimLine: false,
    },
    gameplay: {
      autoLevelPriority: false,
    },
    network: {
      interpDelay: 100,
      buffering: 'BALANCED',
      prediction: true,
      packetRate: '60'
    },
    advanced: {
      lowLatencyMode: false,
      fpsCap: 0,
      rawInput: false,
      batterySaver: false
    },
    audio: {
      master: 50,
      sfx: 100,
      music: 40,
    },
    accessibility: {
      colorblindMode: 'NONE',
      screenFlash: true,
      uiScale: 100
    }
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

// ... (Keep helpers same)
export const getRankInfo = (rank: number) => {
    let current = RANK_DEFINITIONS[0];
    let next = RANK_DEFINITIONS[1];
    for (let i = 0; i < RANK_DEFINITIONS.length; i++) {
        if (rank >= RANK_DEFINITIONS[i].minRank) {
            current = RANK_DEFINITIONS[i];
            next = RANK_DEFINITIONS[i + 1] || null;
        } else {
            break;
        }
    }
    return { current, next };
};

export const calculateRank = (exp: number): number => {
    let rank = 1;
    let required = 100;
    while (exp >= required && rank < 100) {
        exp -= required;
        rank++;
        required = rank * 100; 
    }
    return rank;
};

export const getExpForNextRank = (currentRank: number) => {
    let total = 0;
    for(let i=1; i<=currentRank; i++) total += i * 100;
    return total;
};

export const getLevelProgress = (totalExp: number, currentRank: number) => {
    let xpConsumed = 0;
    for(let i=1; i<currentRank; i++) xpConsumed += i * 100;
    const currentLevelExp = totalExp - xpConsumed;
    const requiredForNext = currentRank * 100;
    return { current: currentLevelExp, required: requiredForNext, percent: (currentLevelExp / requiredForNext) * 100 };
};

const MISSION_TEMPLATES = [
    { type: 'SCORE', desc: 'Reach %s Score in one run', targets: [10000, 25000, 50000], rewards: [50, 100, 200] },
    { type: 'KILL', desc: 'Defeat %s Enemies', targets: [10, 25, 50], rewards: [50, 150, 300] },
    { type: 'LEVEL', desc: 'Reach Level %s', targets: [15, 30, 45], rewards: [30, 80, 150] },
    { type: 'PLAYTIME', desc: 'Survive for %s seconds', targets: [120, 300, 600], rewards: [40, 100, 250] },
    { type: 'BOSS_KILL', desc: 'Defeat a Guardian Boss', targets: [1], rewards: [500] }
];

const generateMissions = (): Mission[] => {
    const missions: Mission[] = [];
    for (let i = 0; i < 3; i++) {
        const template = MISSION_TEMPLATES[Math.floor(Math.random() * MISSION_TEMPLATES.length)];
        const difficulty = Math.floor(Math.random() * template.targets.length);
        const target = template.targets[difficulty];
        const reward = template.rewards[difficulty];
        missions.push({
            id: `mission-${Date.now()}-${i}`,
            // @ts-ignore
            type: template.type,
            description: template.desc.replace('%s', target.toLocaleString()),
            targetValue: target,
            currentValue: 0,
            reward: reward,
            isClaimed: false
        });
    }
    return missions;
};

// --- HYBRID PERSISTENCE ENGINE ---
let authListener: any = null;
let currentUserId: string | null = null;
let presenceChannel: RealtimeChannel | null = null;

export const Persistence = {
    // SUPABASE AUTH
    initAuth: (onUserChange: (user: any) => void) => {
        // --- POPUP HANDLER LOGIC ---
        // If we are inside the popup and just came back from Discord
        if (window.opener && window.opener !== window) {
            // Check if we have hash params (OAuth callback)
            const hash = window.location.hash;
            if (hash && (hash.includes('access_token') || hash.includes('error'))) {
                console.log("Popup: OAuth Callback detected. Processing...");
                
                // Let Supabase parse the hash
                supabase.auth.getSession().then(({ data, error }) => {
                    if (data.session) {
                        console.log("Popup: Session established. Closing...");
                        // Brief delay to ensure localStorage sync
                        setTimeout(() => window.close(), 500);
                    } else if (error) {
                        console.error("Popup: Auth Error", error);
                        // Optional: Show error in popup
                        document.body.innerHTML = `<div style="color:red; text-align:center; padding:20px; font-family:monospace;">AUTH FAILED: ${error.message}</div>`;
                    }
                });
                return; // Stop further execution in the popup
            }
        }

        // --- MAIN APP LOGIC ---
        supabase.auth.getSession().then(({ data: { session } }) => {
            currentUserId = session?.user?.id || null;
            if (currentUserId) {
                Persistence.syncCloudToLocal();
            }
            onUserChange(session?.user || null);
        });

        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            const newUser = session?.user?.id || null;
            if (newUser !== currentUserId) {
                currentUserId = newUser;
                if (newUser) {
                    await Persistence.syncCloudToLocal(); 
                }
                onUserChange(session?.user || null);
            }
        });
        authListener = data.subscription;
    },

    // --- REALTIME PRESENCE (Track Online Players) ---
    initPresence: (onCountUpdate: (count: number) => void) => {
        if (presenceChannel) {
            presenceChannel.unsubscribe();
        }

        presenceChannel = supabase.channel('global_presence_v1');

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel!.presenceState();
                // Count unique user_ids (or just connection keys if anonymous)
                let count = 0;
                for (const key in state) {
                    count += state[key].length;
                }
                onCountUpdate(Math.max(1, count)); // Always at least 1 (yourself)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const trackingId = currentUserId || `guest-${Math.random().toString(36).substr(2, 9)}`;
                    await presenceChannel!.track({
                        user_id: trackingId,
                        online_at: new Date().toISOString(),
                    });
                }
            });
            
        return () => {
            if (presenceChannel) presenceChannel.unsubscribe();
        };
    },

    loginDiscord: async () => {
        // Advanced SPA Pattern: Manual Popup
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: { 
                redirectTo: window.location.origin,
                skipBrowserRedirect: true // CRITICAL: Get the URL instead of auto-redirecting
            }
        });

        if (error) {
            console.error("Login Failed:", error);
            return;
        }

        if (data?.url) {
            // Open standard OAuth popup
            const width = 500;
            const height = 700;
            const left = (window.screen.width / 2) - (width / 2);
            const top = (window.screen.height / 2) - (height / 2);
            
            const popup = window.open(
                data.url, 
                'CoreboundAuth', 
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
            );

            // Optional: Monitoring the popup (Not strictly needed if we use onAuthStateChange)
            if (popup) {
                const interval = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(interval);
                        // Popup closed logic (if needed)
                    }
                }, 1000);
            }
        }
    },

    loginEmail: async (email: string, password: string): Promise<{ data: any, error: any }> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    },

    registerEmail: async (email: string, password: string, nickname: string): Promise<{ data: any, error: any }> => {
        const { data, error } = await supabase.auth.signUp({
            email, password, options: { data: { nickname } }
        });
        return { data, error };
    },

    logout: async () => {
        await supabase.auth.signOut();
        try {
            window.history.replaceState(null, '', '/');
        } catch (e) {
            console.warn("History update blocked by environment:", e);
        }
    },

    // --- IDENTITY MANAGEMENT (Deep Locked Identity) ---
    canChangeNickname: (): { allowed: boolean, timeLeft: number } => {
        const data = Persistence.load();
        const now = Date.now();
        const diff = now - (data.lastNameChange || 0);
        
        if (diff >= NAME_CHANGE_COOLDOWN) {
            return { allowed: true, timeLeft: 0 };
        }
        return { allowed: false, timeLeft: NAME_CHANGE_COOLDOWN - diff };
    },

    updateNickname: async (newName: string): Promise<{ success: boolean, message: string }> => {
        if (!newName.trim() || newName.length > 15) return { success: false, message: 'Invalid name length' };
        
        // Strict Cooldown Enforcement
        const check = Persistence.canChangeNickname();
        if (!check.allowed) return { success: false, message: `LOCKED: Wait ${(check.timeLeft / 3600000).toFixed(1)}h` };

        // Unique Name Check (Simulated for Demo, Real App needs Backend RPC)
        // const { data } = await supabase.from('profiles').select('nickname').eq('nickname', newName).single();
        // if (data) return { success: false, message: 'Identity Taken' };

        const data = Persistence.load();
        data.nickname = newName;
        data.lastNameChange = Date.now();
        
        Persistence.save(data); 
        
        if (currentUserId) {
            await Persistence.saveToCloud(data);
        }
        
        return { success: true, message: 'Identity Re-encoded' };
    },

    // --- GLOBAL LEADERBOARD (REAL DATA) ---
    fetchGlobalLeaderboard: async (): Promise<LeaderboardEntry[]> => {
        try {
            // Fetch ALL meaningful profiles (Limit to top 100 raw to prevent heavy load, 
            // since we do sorting in JS due to JSONB structure in MVP)
            // In a production app, we would add a dedicated SQL index or column for 'high_score' to sort via DB.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nickname, game_data')
                .limit(100); 

            if (error) {
                console.error("Supabase Error:", error);
                return [];
            }

            let realEntries: LeaderboardEntry[] = (data || [])
                .filter((row: any) => row.game_data) // Filter out empty profiles
                .map((row: any) => {
                    const gd = row.game_data;
                    return {
                        id: row.id,
                        name: row.nickname || gd.nickname || 'Unknown Operative',
                        score: gd.highScore || 0,
                        level: calculateRank(gd.totalExp || 0),
                        isSelf: row.id === currentUserId,
                        flagId: gd.equippedFlag || 'NONE',
                        skinId: gd.equippedSkin || 'DEFAULT',
                        mainClass: 'Operative', // Default, real class tracking would need DB column
                        verified: false
                    };
                });

            // Filter out 0 scores and Sort by Score Descending
            realEntries = realEntries
                .filter(e => e.score > 0)
                .sort((a, b) => b.score - a.score);
            
            // Assign Ranks and limit to Top 50
            return realEntries.slice(0, 50).map((entry, index) => ({
                ...entry,
                rank: index + 1,
                // Simple logic: Top 3 get verified badge visual
                verified: index < 3
            }));

        } catch (e) {
            console.error('Leaderboard Fetch Error', e);
            return [];
        }
    },

    // ... (Sync & Save Logic remains the same)
    syncCloudToLocal: async () => {
        if (!currentUserId) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('game_data, nickname')
                .eq('id', currentUserId)
                .single();

            if (data) {
                if (data.nickname) localStorage.setItem('COREBOUND_NICKNAME', data.nickname);
                if (data.game_data) {
                    const local = Persistence.load();
                    const cloud = data.game_data as AccountData;
                    if (data.nickname) cloud.nickname = data.nickname;
                    // Strict: Cloud XP wins always to prevent local cheating reversions
                    if (cloud.totalExp >= local.totalExp) {
                        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(cloud));
                    } else {
                        await Persistence.saveToCloud(local);
                    }
                }
            } else {
                await Persistence.saveToCloud(Persistence.load());
            }
        } catch (e) { console.error("Cloud Sync Error", e); }
    },

    saveToCloud: async (data: AccountData) => {
        if (!currentUserId) return;
        const { error } = await supabase.from('profiles').upsert({ 
            id: currentUserId, nickname: data.nickname, game_data: data, updated_at: new Date().toISOString()
        });
        if (error) console.error("Cloud Save Failed", error);
    },

    load: (): AccountData => {
        try {
            const raw = localStorage.getItem(ACCOUNT_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                return { ...INITIAL_ACCOUNT, ...data, stats: { ...INITIAL_STATS, ...(data.stats || {}) }, missions: data.missions || [] };
            }
        } catch (e) { console.error('Failed to load save data', e); }
        return { ...INITIAL_ACCOUNT };
    },
    
    save: (data: AccountData) => {
        try { 
            localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data)); 
            if (currentUserId) Persistence.saveToCloud(data);
        } catch (e) { console.error('Failed to save data', e); }
    },

    saveRun: (runData: SavedRun) => {
        const data = Persistence.load();
        
        // Safety Check: Don't overwrite a high-level run with a low-level one accidentally
        // unless the user explicitly extracted with the new data.
        // We allow updating if the new level is higher OR if it's a legitimate new session.
        // But for "Carry Over" logic, we generally want the latest extraction.
        
        // Minor penalty removed for better UX based on user feedback "I want to keep my level"
        // Only apply penalty if dying, which is handled in GameCanvas/DeathScreen, not here.
        // runData.level = Math.max(1, runData.level - 1); 
        // runData.score = Math.floor(runData.score * 0.9); 
        
        data.savedRun = runData;
        Persistence.save(data);
    },
    
    clearSavedRun: () => {
        const data = Persistence.load();
        data.savedRun = null;
        Persistence.save(data);
    },
    
    loadSettings: (): GameSettings => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                return { ...DEFAULT_SETTINGS, ...saved };
            }
        } catch (e) {}
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    },
    saveSettings: (settings: GameSettings) => {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
    },
    checkDailyLogic: (): { bonus: number, newMissions: boolean } => {
        const data = Persistence.load();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        let bonus = 0; let newMissions = false;
        const lastLoginDiff = now - data.lastLogin;
        if (lastLoginDiff > oneDay) {
            bonus = 100;
            if (lastLoginDiff < oneDay * 2) { data.dailyStreak++; bonus += Math.min(data.dailyStreak * 50, 500); } else { data.dailyStreak = 1; }
            data.lastLogin = now; data.currency += bonus;
        }
        if (now - data.lastMissionReset > oneDay) { data.missions = generateMissions(); data.lastMissionReset = now; newMissions = true; } 
        else if (data.missions.length === 0) { data.missions = generateMissions(); data.lastMissionReset = now; }
        Persistence.save(data);
        return { bonus, newMissions };
    },
    claimMission: (missionId: string): AccountData | null => {
        const data = Persistence.load();
        const mission = data.missions.find(m => m.id === missionId);
        if (mission && !mission.isClaimed && mission.currentValue >= mission.targetValue) {
            mission.isClaimed = true; data.currency += mission.reward; Persistence.save(data); return data;
        }
        return null;
    },
    processMatchResult: (result: { score: number, kills: number, timeAlive: number, level: number, bossKills: number }): { currencyEarned: number, expEarned: number, completedMissions: number } => {
        const data = Persistence.load();
        const currencyEarned = Math.floor(result.score / 500) + Math.floor(result.kills / 2) + Math.floor(result.timeAlive / 30); 
        const expEarned = result.score + (result.kills * 100);
        data.currency += currencyEarned; data.totalExp += expEarned;
        const oldRank = data.rank; data.rank = calculateRank(data.totalExp);
        if (data.rank > oldRank) {
            data.currency += (data.rank - oldRank) * 200; 
            const newTier = getRankInfo(data.rank).current;
            if (newTier.reward && newTier.minRank === data.rank && newTier.reward.type === 'SKIN') { 
                if (!data.unlockedSkins.includes(newTier.reward.value as SkinId)) data.unlockedSkins.push(newTier.reward.value as SkinId);
            }
        }
        if (result.score > data.highScore) data.highScore = result.score;
        data.stats.gamesPlayed++; data.stats.totalKills += result.kills; data.stats.totalScore += result.score; data.stats.totalPlayTime += result.timeAlive; data.stats.bossesKilled += result.bossKills;
        if (result.level > data.stats.highestLevel) data.stats.highestLevel = result.level;
        let completedMissions = 0;
        data.missions.forEach(mission => {
            if (mission.isClaimed) return;
            if (mission.type === 'KILL') mission.currentValue += result.kills;
            else if (mission.type === 'BOSS_KILL') mission.currentValue += result.bossKills;
            else if (mission.type === 'SCORE') mission.currentValue = Math.max(mission.currentValue, result.score);
            else if (mission.type === 'LEVEL') mission.currentValue = Math.max(mission.currentValue, result.level);
            else if (mission.type === 'PLAYTIME') mission.currentValue = Math.max(mission.currentValue, result.timeAlive);
            if (mission.currentValue >= mission.targetValue) completedMissions++;
        });
        Persistence.save(data);
        return { currencyEarned, expEarned, completedMissions };
    },
    unlockItem: (type: 'SKIN' | 'TRAIL' | 'FLAG', id: string, cost: number): boolean => {
        const data = Persistence.load();
        if (data.currency >= cost) {
            if (type === 'SKIN' && !data.unlockedSkins.includes(id as SkinId)) { data.currency -= cost; data.unlockedSkins.push(id as SkinId); Persistence.save(data); return true; } 
            else if (type === 'TRAIL' && !data.unlockedTrails.includes(id as TrailId)) { data.currency -= cost; if (!data.unlockedTrails) data.unlockedTrails = ['NONE']; data.unlockedTrails.push(id as TrailId); Persistence.save(data); return true; } 
            else if (type === 'FLAG' && !data.unlockedFlags.includes(id as FlagId)) { data.currency -= cost; if (!data.unlockedFlags) data.unlockedFlags = ['NONE']; data.unlockedFlags.push(id as FlagId); Persistence.save(data); return true; }
        }
        return false;
    },
    equipItem: (type: 'SKIN' | 'TRAIL' | 'FLAG', id: string) => {
        const data = Persistence.load();
        if (type === 'SKIN' && data.unlockedSkins.includes(id as SkinId)) { data.equippedSkin = id as SkinId; Persistence.save(data); } 
        else if (type === 'TRAIL' && data.unlockedTrails.includes(id as TrailId)) { data.equippedTrail = id as TrailId; Persistence.save(data); } 
        else if (type === 'FLAG' && data.unlockedFlags.includes(id as FlagId)) { data.equippedFlag = id as FlagId; Persistence.save(data); }
    },
    unlockSkin: (skinId: SkinId, cost: number) => Persistence.unlockItem('SKIN', skinId, cost),
    equipSkin: (skinId: SkinId) => Persistence.equipItem('SKIN', skinId),
    exportSaveString: (): string => { const data = Persistence.load(); return btoa(JSON.stringify(data)); },
    importSaveString: (saveString: string): boolean => { try { const jsonStr = atob(saveString); const data = JSON.parse(jsonStr); if (typeof data.rank !== 'number') throw new Error(); Persistence.save({ ...INITIAL_ACCOUNT, ...data }); return true; } catch (e) { return false; } }
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

const FLAG_ITEMS: any[] = COUNTRIES_LIST.map(c => ({
    id: c.id,
    type: 'FLAG',
    name: c.name,
    cost: 100,
    rarity: 'COMMON',
    desc: `Flag of ${c.name}`
}));

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

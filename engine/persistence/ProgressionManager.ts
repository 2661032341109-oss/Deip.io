
import { AccountData, Mission, LifetimeStats, LeaderboardEntry } from '../../types';
import { getRankInfo, calculateRank, SHOP_ITEMS } from '../Persistence'; // Keep circular dependency minimal
import { supabase } from '../../supabaseClient';

const MISSION_TEMPLATES = [
    { type: 'SCORE', desc: 'Reach %s Score in one run', targets: [10000, 25000, 50000], rewards: [50, 100, 200] },
    { type: 'KILL', desc: 'Defeat %s Enemies', targets: [10, 25, 50], rewards: [50, 150, 300] },
    { type: 'LEVEL', desc: 'Reach Level %s', targets: [15, 30, 45], rewards: [30, 80, 150] },
    { type: 'PLAYTIME', desc: 'Survive for %s seconds', targets: [120, 300, 600], rewards: [40, 100, 250] },
    { type: 'BOSS_KILL', desc: 'Defeat a Guardian Boss', targets: [1], rewards: [500] }
];

export class ProgressionManager {
    static generateMissions(): Mission[] {
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
    }

    static async fetchGlobalLeaderboard(currentUserId: string | null): Promise<LeaderboardEntry[]> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nickname, game_data')
                .limit(100); 

            if (error) return [];

            let realEntries: LeaderboardEntry[] = (data || [])
                .filter((row: any) => row.game_data)
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
                        mainClass: 'Operative',
                        verified: false
                    };
                });

            return realEntries
                .filter(e => e.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 50)
                .map((entry, index) => ({
                    ...entry,
                    rank: index + 1,
                    verified: index < 3
                }));

        } catch (e) {
            return [];
        }
    }
}

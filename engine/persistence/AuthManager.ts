
import { supabase } from '../../supabaseClient';

export class AuthManager {
    static async loginDiscord() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: { 
                redirectTo: window.location.origin,
                skipBrowserRedirect: true 
            }
        });

        if (error) {
            console.error("Login Failed:", error);
            return;
        }

        if (data?.url) {
            const width = 500;
            const height = 700;
            const left = (window.screen.width / 2) - (width / 2);
            const top = (window.screen.height / 2) - (height / 2);
            window.open(
                data.url, 
                'CoreboundAuth', 
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
            );
        }
    }

    static async loginEmail(email: string, password: string) {
        return await supabase.auth.signInWithPassword({ email, password });
    }

    static async registerEmail(email: string, password: string, nickname: string) {
        return await supabase.auth.signUp({
            email, password, options: { data: { nickname } }
        });
    }

    static async logout() {
        await supabase.auth.signOut();
        try {
            window.history.replaceState(null, '', '/');
        } catch (e) {
            console.warn("History update blocked:", e);
        }
    }
}

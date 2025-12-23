
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// --- DICTIONARY ---
const resources = {
  EN: {
    translation: {
        // ... (Existing keys from previous i18n.ts - ensuring complete list for safety)
        lobby_enter_name: 'ENTER NICKNAME',
        lobby_select_zone: 'DEPLOYMENT ZONES',
        lobby_deploy: 'DEPLOY',
        lobby_daily_reward: 'DAILY REWARD',
        lobby_missions: 'DAILY_OPERATIONS',
        lobby_no_missions: 'NO ACTIVE MISSIONS',
        lobby_reset_timer: 'RESETS IN 24H • COMPLETE FOR DUST',
        
        settings_title: 'SYSTEM CONFIG',
        settings_graphics: 'VISUALS',
        settings_controls: 'INPUT',
        settings_audio: 'AUDIO',
        settings_interface: 'INTERFACE',
        settings_gameplay: 'GAMEPLAY',
        settings_general: 'GENERAL',
        settings_lang: 'LANGUAGE',
        settings_network: 'NETCODE',
        settings_advanced: 'ADVANCED',
        settings_mobile: 'MOBILE',
        settings_access: 'ACCESSIBILITY',
        settings_preset: 'QUALITY PRESET',
        settings_reset: 'RESET DEFAULTS',
        
        // Graphics
        settings_resolution: 'RENDER RESOLUTION',
        settings_particles: 'PARTICLE DENSITY',
        settings_bloom: 'BLOOM',
        settings_motion_blur: 'MOTION BLUR',
        settings_shake: 'SCREEN SHAKE',
        settings_shadows: 'SHADOWS',
        settings_dmg_nums: 'DAMAGE NUMBERS',
        settings_chromatic: 'CHROMATIC ABERRATION',
        settings_grid_vis: 'GRID VISIBILITY',

        // Controls
        settings_sensitivity: 'MOUSE SENSITIVITY',
        settings_joystick_size: 'JOYSTICK SIZE',
        settings_joystick_opacity: 'JOYSTICK OPACITY',
        settings_joystick_deadzone: 'JOYSTICK DEADZONE',
        settings_haptic: 'HAPTIC FEEDBACK',
        settings_lefthanded: 'LEFT-HANDED MODE',
        settings_orientation: 'DISPLAY ORIENTATION',
        settings_aim_assist: 'AIM ASSIST (MAGNETISM)',
        settings_touch_smooth: 'TOUCH SMOOTHING',

        // Interface
        settings_crosshair_type: 'CROSSHAIR STYLE',
        settings_crosshair_color: 'CROSSHAIR COLOR',
        settings_net_graph: 'NET GRAPH (FPS/PING)',
        settings_minimap_scale: 'MINIMAP SIZE',
        settings_minimap_opacity: 'MINIMAP OPACITY',
        settings_streamer_mode: 'STREAMER MODE',
        settings_aim_line: 'AIM ASSIST LINE',

        // Network (Pro)
        settings_buffering: 'NETWORK BUFFERING',
        settings_interp: 'INTERPOLATION DELAY (MS)',
        settings_packet_rate: 'TICK RATE (SIM)',
        settings_prediction: 'CLIENT PREDICTION',
        
        // Advanced (Pro)
        settings_reflex: 'LOW LATENCY (REFLEX)',
        settings_fps_cap: 'FPS LIMIT',
        settings_raw_input: 'RAW INPUT (NO SMOOTHING)',
        settings_battery: 'BATTERY SAVER (30FPS)',

        // Audio
        settings_master: 'MASTER VOLUME',
        settings_sfx: 'SFX VOLUME',
        settings_music: 'AMBIENT MUSIC',

        // Accessibility
        settings_colorblind: 'COLORBLIND MODE',
        settings_screen_flash: 'REDUCE FLASHING',
        settings_ui_scale: 'UI SCALE',

        shop_title: 'ARMORY',
        shop_buy: 'PURCHASE',
        shop_equip: 'EQUIP',
        shop_equipped: 'EQUIPPED',
        shop_cost: 'COST',
        shop_preview: 'PREVIEW',
        
        stats_kills: 'Total Kills',
        stats_score: 'High Score',
        stats_playtime: 'Play Time',
        stats_games: 'Games',
        stats_bosses: 'Bosses',

        hud_score: 'Score',
        hud_lvl: 'LVL',
        hud_stats: 'STATS',
        hud_points_available: 'POINTS AVAILABLE',
        hud_leaderboard: 'LEADERBOARD',
        hud_sandbox_ctrl: 'SANDBOX_CTRL',
        hud_evolution: 'EVOLUTION DATA',
        hud_exit: 'ABORT',
        hud_respawn: 'RESPAWN',
        hud_spectate: 'SPECTATE',
        hud_lobby: 'LOBBY',
        hud_play_again: 'PLAY AGAIN',
        
        stat_1: 'Hull Regen',
        stat_2: 'Max Integrity',
        stat_3: 'Body Impact',
        stat_4: 'Bullet Velocity',
        stat_5: 'Penetration',
        stat_6: 'Damage Output',
        stat_7: 'Reload Rate',
        stat_8: 'Engine Power',

        death_title: 'YOU DIED',
        death_killer: 'ELIMINATED BY',
        death_final_score: 'FINAL SCORE',
        death_level_reached: 'LEVEL REACHED',
        death_spectating: 'SPECTATING',

        help_title: 'BASIC TRAINING',
        help_controls: 'CONTROLS',
        help_progression: 'EVOLUTION',
        help_dismiss: 'DISMISS',
        help_controls_desc: 'WASD to Move, Click to Shoot.\n[F] for Skill (Lvl 1+)\n[E] Auto-Fire\n[ENTER] Chat',
        help_progression_desc: 'Destroy shapes for XP.\nUpgrade stats [1-8].\nEvolve at Lvl 10, 20, 30, 45, 60.',

        rank_title: 'THE ETERNAL PATH',
        rank_current: 'CURRENT RANK',
        rank_next: 'NEXT TIER',
        rank_reward: 'RANK REWARD',
        rank_acquired: 'ACQUIRED',
        rank_reach_lvl: 'REACH LVL',

        sb_operator: 'OPERATOR',
        sb_world: 'WORLD STATE',
        sb_armory: 'ARMORY',
        sb_godmode: 'GOD MODE',
        sb_infinite_ammo: 'INFINITE AMMO',
        sb_heal: 'HEAL HULL',
        sb_max_stats: 'MAX STATS',
        sb_max_lvl: 'MAX LEVEL',
        sb_reset_lvl: 'RESET LVL',
        sb_suicide: 'TERMINATE UNIT',
        sb_spawn_boss: 'SPAWN BOSS',
        sb_spawn_food: 'SPAWN RESOURCE',
        sb_nuke: 'NUKE ENTITIES',
        
        unit_basic_name: "Vanguard", unit_basic_desc: "The starting point of all evolution.",
    }
  },
  TH: {
    translation: {
        lobby_enter_name: 'ใส่ชื่อเล่น',
        lobby_select_zone: 'เลือกโซน',
        lobby_deploy: 'เริ่มเกม',
        lobby_daily_reward: 'รางวัลประจำวัน',
        lobby_missions: 'ภารกิจรายวัน',
        lobby_no_missions: 'ไม่มีภารกิจ',
        lobby_reset_timer: 'รีเซ็ตใน 24 ชม. • ทำภารกิจเพื่อรับ DUST',
        
        settings_title: 'ตั้งค่าระบบ',
        settings_graphics: 'กราฟิก',
        settings_controls: 'การควบคุม',
        settings_audio: 'เสียง',
        settings_interface: 'หน้าจอ',
        settings_gameplay: 'เกมเพลย์',
        settings_general: 'ทั่วไป',
        settings_lang: 'ภาษา',
        settings_network: 'เน็ตเวิร์ค',
        settings_advanced: 'ขั้นสูง',
        settings_mobile: 'มือถือ',
        settings_access: 'การเข้าถึง',
        settings_preset: 'คุณภาพกราฟิก',
        settings_reset: 'คืนค่าเดิม',
        
        settings_resolution: 'ความละเอียดภาพ',
        settings_particles: 'ความหนาแน่นเอฟเฟกต์',
        settings_bloom: 'แสงฟุ้ง (Bloom)',
        settings_motion_blur: 'เบลอขณะเคลื่อนที่',
        settings_shake: 'จอสั่น',
        settings_shadows: 'เงา',
        settings_dmg_nums: 'ตัวเลขดาเมจ',
        settings_chromatic: 'เอฟเฟกต์สีเหลือบ',
        settings_grid_vis: 'ความชัดตาราง',

        settings_sensitivity: 'ความไวเมาส์',
        settings_joystick_size: 'ขนาดปุ่มเดิน',
        settings_joystick_opacity: 'ความโปร่งใสปุ่ม',
        settings_joystick_deadzone: 'ระยะบอดปุ่ม',
        settings_haptic: 'สั่นตอบสนอง',
        settings_lefthanded: 'โหมดมือซ้าย',
        settings_orientation: 'หมุนหน้าจอ',
        settings_aim_assist: 'ช่วยเล็ง (Aim Assist)',
        settings_touch_smooth: 'ปรับสัมผัสลื่นไหล',

        settings_crosshair_type: 'เป้าเล็ง',
        settings_crosshair_color: 'สีเป้าเล็ง',
        settings_net_graph: 'แสดงกราฟเน็ต (FPS/Ping)',
        settings_minimap_scale: 'ขนาดมินิแมพ',
        settings_minimap_opacity: 'ความโปร่งใสแมพ',
        settings_streamer_mode: 'โหมดสตรีมเมอร์',
        settings_aim_line: 'เส้นช่วยเล็ง',

        settings_buffering: 'การบัฟเฟอร์ข้อมูล',
        settings_interp: 'ดีเลย์ภาพ (ms)',
        settings_packet_rate: 'อัตราส่งข้อมูล (Tickrate)',
        settings_prediction: 'คาดการณ์ล่วงหน้า (Prediction)',
        
        settings_reflex: 'โหมดลดหน่วง (Reflex)',
        settings_fps_cap: 'จำกัด FPS',
        settings_raw_input: 'รับค่าเมาส์ดิบ (Raw Input)',
        settings_battery: 'ประหยัดแบต (30 FPS)',

        settings_master: 'เสียงหลัก',
        settings_sfx: 'เสียงเอฟเฟกต์',
        settings_music: 'ดนตรีประกอบ',

        settings_colorblind: 'โหมดตาบอดสี',
        settings_screen_flash: 'ลดแสงวาบ',
        settings_ui_scale: 'ขนาด UI',

        shop_title: 'คลังแสง',
        shop_buy: 'ซื้อ',
        shop_equip: 'ติดตั้ง',
        shop_equipped: 'ใช้อยู่',
        shop_cost: 'ราคา',
        shop_preview: 'ตัวอย่าง',
        
        stats_kills: 'ฆ่าทั้งหมด',
        stats_score: 'คะแนนสูงสุด',
        stats_playtime: 'เวลาเล่น',
        stats_games: 'จำนวนเกม',
        stats_bosses: 'บอสที่ฆ่า',

        hud_score: 'คะแนน',
        hud_lvl: 'ระดับ',
        hud_stats: 'อัปเกรด',
        hud_points_available: 'แต้มเหลือ',
        hud_leaderboard: 'อันดับ',
        hud_sandbox_ctrl: 'แผงควบคุม',
        hud_evolution: 'ข้อมูลวิวัฒนาการ',
        hud_exit: 'ออกเกม',
        hud_respawn: 'เกิดใหม่',
        hud_spectate: 'ดูผู้เล่นอื่น',
        hud_lobby: 'กลับล็อบบี้',
        hud_play_again: 'เล่นอีกครั้ง',
        
        stat_1: 'ฟื้นฟูเลือด',
        stat_2: 'เลือดสูงสุด',
        stat_3: 'แรงชน',
        stat_4: 'ความเร็วกระสุน',
        stat_5: 'พลังเจาะ',
        stat_6: 'ความแรง',
        stat_7: 'รีโหลดเร็ว',
        stat_8: 'ความเร็ว',

        death_title: 'คุณตายแล้ว',
        death_killer: 'ถูกกำจัดโดย',
        death_final_score: 'คะแนนรวม',
        death_level_reached: 'ระดับที่ทำได้',
        death_spectating: 'กำลังดู',

        help_title: 'ฝึกฝนเบื้องต้น',
        help_controls: 'การบังคับ',
        help_progression: 'วิวัฒนาการ',
        help_dismiss: 'ปิด',
        help_controls_desc: 'WASD เดิน, คลิกยิง\n[F] ใช้สกิล (เวล 1+)\n[E] ยิงออโต้\n[ENTER] แชท',
        help_progression_desc: 'ยิงรูปทรงเพื่อเก็บเวล\nอัปเกรดค่าพลัง [1-8]\nเปลี่ยนร่างที่เวล 10, 20, 30, 45, 60',

        rank_title: 'เส้นทางสู่ตำนาน',
        rank_current: 'ยศปัจจุบัน',
        rank_next: 'ยศถัดไป',
        rank_reward: 'รางวัลยศ',
        rank_acquired: 'ได้รับแล้ว',
        rank_reach_lvl: 'ต้องเวล',

        sb_operator: 'ผู้คุม',
        sb_world: 'โลก',
        sb_armory: 'คลังอาวุธ',
        sb_godmode: 'อมตะ',
        sb_infinite_ammo: 'กระสุนไม่จำกัด',
        sb_heal: 'ฮีลเลือด',
        sb_max_stats: 'สเตตัสตัน',
        sb_max_lvl: 'เวลตัน',
        sb_reset_lvl: 'รีเซ็ตเวล',
        sb_suicide: 'ทำลายตัวเอง',
        sb_spawn_boss: 'เสกบอส',
        sb_spawn_food: 'เสกอาหาร',
        sb_nuke: 'ล้างแมพ',
        
        unit_basic_name: "Vanguard", unit_basic_desc: "จุดเริ่มต้นของวิวัฒนาการ",
    }
  },
  // Add other languages here (JP, etc) if needed, structure follows above
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'EN', // Default if detection fails
    supportedLngs: ['EN', 'TH', 'JP'],
    debug: false, // Turn off in production
    detection: {
      order: ['localStorage', 'navigator'], // Check saved pref first, then browser
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    interpolation: { escapeValue: false }
  });

export default i18n;

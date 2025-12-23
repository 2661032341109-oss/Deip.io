
import { WeaponSchema } from '../types';
import { TIER_1_UNITS, TIER_2_UNITS } from './units/tier1_2';
import { TIER_3_UNITS } from './units/tier3';
import { TIER_4_UNITS } from './units/tier4';
import { TIER_5_UNITS } from './units/tier5';
import { TIER_6_UNITS, TIER_7_UNITS, TIER_8_UNITS } from './units/tier6_7_8';
import { TIER_9_UNITS, TIER_10_UNITS } from './units/tier9_10';

export const EVOLUTION_TREE: WeaponSchema[] = [
    ...TIER_1_UNITS,
    ...TIER_2_UNITS,
    ...TIER_3_UNITS,
    ...TIER_4_UNITS,
    ...TIER_5_UNITS,
    ...TIER_6_UNITS,
    ...TIER_7_UNITS,
    ...TIER_8_UNITS,
    ...TIER_9_UNITS,
    ...TIER_10_UNITS
];

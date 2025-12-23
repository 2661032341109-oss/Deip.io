
// [DEPRECATED]
// This file is kept for backward compatibility if any non-React parts still reference it directly.
// The main logic has moved to i18n.ts and uses react-i18next hooks.

import i18n from '../i18n';
import { Language } from '../types';

export const t = (key: string, lang?: Language): string => {
    // Fallback to i18next global instance
    return i18n.t(key, { lng: lang });
};

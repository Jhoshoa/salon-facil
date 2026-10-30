export const MAX_CUSTOM_FEATURES = 20;
export const MIN_CUSTOM_FEATURE_LENGTH = 2;
export const MAX_CUSTOM_FEATURE_LENGTH = 60;

/** So "Wi-Fi", "wifi" and "WI FI" count as the same feature. */
export const normalizeFeatureName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function deviceTier(env?: {
  cores?: number;
  memoryGb?: number;
  saveData?: boolean;
  reducedMotion?: boolean;
  narrow?: boolean;
}): 'low' | 'standard';
export function tierSettings(tier: 'low' | 'standard'): { maxPixelRatio: number; fadeMs: number; tileCache: number; idleDrift: boolean };

/**
 * Operator identity for legal/compliance pages.
 * Fill LEGAL_NAME / REGISTERED_ADDRESS / JURISDICTION / optional GSTIN+PHONE
 * from Devansh — do not invent a company name.
 */
export const LEGAL_NAME = '{{LEGAL_NAME}}';
export const BRAND_NAME = 'AnalyzeIt';
export const REGISTERED_ADDRESS = '{{REGISTERED_ADDRESS}}';
export const JURISDICTION = '{{JURISDICTION}}';
export const GSTIN: string | null = null;
export const PHONE: string | null = null;

export const EMAIL = {
  support: 'hello@analyzeit.ai',
  privacy: 'privacy@analyzeit.ai',
  security: 'security@analyzeit.ai',
  legal: 'legal@analyzeit.ai',
} as const;

export const LEGAL_UPDATED = 'September 11, 2026';

export function operatorLine(): string {
  return `Operated by ${LEGAL_NAME}, ${REGISTERED_ADDRESS}.`;
}

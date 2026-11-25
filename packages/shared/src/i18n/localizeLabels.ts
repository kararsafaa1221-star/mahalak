import { tKey } from './tKey';
import { DEFAULT_MERCHANT_RENEWAL_PLANS } from '../constants/merchantRenewalPlans';
import { DEFAULT_VERIFICATION_PLANS } from '../constants/verificationPricing';

/** Localized renewal plan label (falls back to admin labelAr / Arabic default). */
export function localizeRenewalPlanLabel(plan: { id: string; labelAr?: string }): string {
  const fallback = plan.labelAr || plan.id;
  const def = DEFAULT_MERCHANT_RENEWAL_PLANS.find((p) => p.id === plan.id);
  if (def && plan.labelAr && plan.labelAr !== def.labelAr) return plan.labelAr;
  return tKey(`plans.renewal.${plan.id}`, fallback);
}

export function localizeRenewalPlanBadge(plan: { id: string; badge?: string }): string {
  if (!plan.badge) return '';
  const def = DEFAULT_MERCHANT_RENEWAL_PLANS.find((p) => p.id === plan.id);
  if (def?.badge && plan.badge !== def.badge) return plan.badge;
  return tKey(`plans.renewal.badge_${plan.id}`, plan.badge);
}

export function localizeVerificationPlanLabel(plan: { id: string; labelAr?: string }): string {
  const fallback = plan.labelAr || plan.id;
  const def = DEFAULT_VERIFICATION_PLANS.find((p) => p.id === plan.id);
  if (def && plan.labelAr && plan.labelAr !== def.labelAr) return plan.labelAr;
  return tKey(`plans.verification.${plan.id}`, fallback);
}

export function localizeVerificationPlanBadge(plan: { id: string; badge?: string }): string {
  if (!plan.badge) return '';
  const def = DEFAULT_VERIFICATION_PLANS.find((p) => p.id === plan.id);
  if (def?.badge && plan.badge !== def.badge) return plan.badge;
  return tKey(`plans.verification.badge_${plan.id}`, plan.badge);
}

export function localizeLoyaltyTierLabel(key: string, fallbackAr?: string): string {
  return tKey(`loyalty.tiers.${key}`, fallbackAr || key);
}

export function localizeLoyaltyEarnRuleTitle(type: string, fallbackAr?: string): string {
  return tKey(`loyalty.earnRules.${type}`, fallbackAr || type);
}

export function localizeLegacySubscriptionLabel(id: string, fallback?: string): string {
  return tKey(`plans.renewal.legacy_${id}`, fallback || id);
}

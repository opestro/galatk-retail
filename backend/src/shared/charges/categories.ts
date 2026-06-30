export const CHARGE_CATEGORIES = [
  { id: 'team_food', label: 'Team food' },
  { id: 'petty_cash', label: 'Petty cash' },
  { id: 'transport', label: 'Transport' },
  { id: 'other', label: 'Other' },
] as const

export type ChargeCategoryId = (typeof CHARGE_CATEGORIES)[number]['id']

export function isValidChargeCategory(category: string): category is ChargeCategoryId {
  return CHARGE_CATEGORIES.some((c) => c.id === category)
}

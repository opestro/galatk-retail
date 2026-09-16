/**
 * Official 58 Algerian wilayas (2026 list). Used for storefront checkout
 * and admin order filters — do not hard-code this inside a Vue view.
 */
export const ALGERIA_WILAYAS: readonly string[] = [
  'Adrar',
  'Chlef',
  'Laghouat',
  'Oum El Bouaghi',
  'Batna',
  'Béjaïa',
  'Biskra',
  'Béchar',
  'Blida',
  'Bouira',
  'Tamanrasset',
  'Tébessa',
  'Tlemcen',
  'Tiaret',
  'Tizi Ouzou',
  'Alger',
  'Djelfa',
  'Jijel',
  'Sétif',
  'Saïda',
  'Skikda',
  'Sidi Bel Abbès',
  'Annaba',
  'Guelma',
  'Constantine',
  'Médéa',
  'Mostaganem',
  "M'Sila",
  'Mascara',
  'Ouargla',
  'Oran',
  'El Bayadh',
  'Illizi',
  'Bordj Bou Arreridj',
  'Boumerdès',
  'El Tarf',
  'Tindouf',
  'Tissemsilt',
  'El Oued',
  'Khenchela',
  'Souk Ahras',
  'Tipaza',
  'Mila',
  'Aïn Defla',
  'Naâma',
  'Aïn Témouchent',
  'Ghardaïa',
  'Relizane',
  'Timimoun',
  'Bordj Badji Mokhtar',
  'Ouled Djellal',
  'Béni Abbès',
  'In Salah',
  'In Guezzam',
  'Touggourt',
  'Djanet',
  "El M'Ghair",
  'El Meniaa',
] as const

const WILAYA_SET = new Set(ALGERIA_WILAYAS.map((name) => name.toLowerCase()))

export function isValidWilaya(value: string | null | undefined): value is string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return false
  return WILAYA_SET.has(trimmed.toLowerCase())
}

export function canonicalWilaya(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  return ALGERIA_WILAYAS.find((name) => name.toLowerCase() === trimmed.toLowerCase()) ?? null
}

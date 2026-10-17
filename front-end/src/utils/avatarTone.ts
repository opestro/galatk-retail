const TONES = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-purple-100 text-purple-700',
]

/** Stable pastel colour for a person's initials avatar, derived from their name. */
export function avatarTone(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return TONES[hash % TONES.length] ?? TONES[0]!
}

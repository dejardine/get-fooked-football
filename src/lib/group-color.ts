/**
 * Pure helper: map a World Cup group letter (A–L) to one of the two CGA
 * accent colours we sprinkle through the UI. Even-indexed groups get cyan,
 * odd-indexed get magenta — gives a balanced alternating pattern across
 * a typical fixtures list without anything looking lopsided.
 */
export type GroupAccent = 'cyan' | 'magenta';

export function accentForGroup(groupName: string | null | undefined): GroupAccent {
  if (!groupName) return 'cyan';
  const code = groupName.toUpperCase().charCodeAt(0);
  // A=65 -> 0 -> cyan, B=66 -> 1 -> magenta, alternating onwards.
  return (code - 65) % 2 === 0 ? 'cyan' : 'magenta';
}

export function tagClassForGroup(groupName: string | null | undefined): string {
  return accentForGroup(groupName) === 'cyan' ? 'brutal-tag-cyan' : 'brutal-tag-magenta';
}

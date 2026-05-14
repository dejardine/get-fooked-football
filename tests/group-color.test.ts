import { describe, it, expect } from 'vitest';
import { accentForGroup, tagClassForGroup } from '@/lib/group-color';

describe('accentForGroup', () => {
  it('alternates cyan/magenta starting at A', () => {
    expect(accentForGroup('A')).toBe('cyan');
    expect(accentForGroup('B')).toBe('magenta');
    expect(accentForGroup('C')).toBe('cyan');
    expect(accentForGroup('L')).toBe('magenta');
  });
  it('defaults to cyan when no group', () => {
    expect(accentForGroup(null)).toBe('cyan');
    expect(accentForGroup(undefined)).toBe('cyan');
    expect(accentForGroup('')).toBe('cyan');
  });
});

describe('tagClassForGroup', () => {
  it('returns the right Tailwind class', () => {
    expect(tagClassForGroup('A')).toBe('brutal-tag-cyan');
    expect(tagClassForGroup('B')).toBe('brutal-tag-magenta');
  });
});

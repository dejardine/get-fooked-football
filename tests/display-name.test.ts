import { describe, it, expect } from 'vitest';
import { displayName, nicknameOnly } from '@/lib/display-name';

describe('displayName', () => {
  it('returns just the name when no nickname', () => {
    expect(displayName({ name: 'Robin' })).toBe('Robin');
    expect(displayName({ name: 'Robin', nickname: null })).toBe('Robin');
    expect(displayName({ name: 'Robin', nickname: undefined })).toBe('Robin');
  });
  it('returns just the name when nickname is whitespace', () => {
    expect(displayName({ name: 'Robin', nickname: '   ' })).toBe('Robin');
  });
  it('renders nickname alongside the name in quotes', () => {
    expect(displayName({ name: 'Robin', nickname: 'Sheep Lord' })).toBe('Robin "Sheep Lord"');
  });
  it('trims whitespace from both fields', () => {
    expect(displayName({ name: '  Robin  ', nickname: '  Sheep Lord  ' })).toBe('Robin "Sheep Lord"');
  });
  it('strips embedded quotes so the rendered form stays balanced', () => {
    expect(displayName({ name: 'Robin', nickname: 'the "great"' })).toBe('Robin "the great"');
    expect(displayName({ name: 'Robin', nickname: '“fancy”' })).toBe('Robin "fancy"');
  });
});

describe('nicknameOnly', () => {
  it('returns the nickname when set', () => {
    expect(nicknameOnly({ name: 'Robin', nickname: 'Sheep Lord' })).toBe('Sheep Lord');
  });
  it('returns null when missing or blank', () => {
    expect(nicknameOnly({ name: 'Robin' })).toBeNull();
    expect(nicknameOnly({ name: 'Robin', nickname: null })).toBeNull();
    expect(nicknameOnly({ name: 'Robin', nickname: '   ' })).toBeNull();
  });
});

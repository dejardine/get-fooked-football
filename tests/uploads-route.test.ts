import { describe, it, expect } from 'vitest';
import { resolveSafeUploadPath, contentTypeFor } from '@/lib/uploads';

describe('resolveSafeUploadPath', () => {
  const ROOT = '/data/uploads';

  it('resolves a simple filename inside the root', () => {
    expect(resolveSafeUploadPath(ROOT, ['foo.jpg'])).toBe('/data/uploads/foo.jpg');
  });

  it('resolves nested subdirectories', () => {
    expect(resolveSafeUploadPath(ROOT, ['sub', 'image.png'])).toBe('/data/uploads/sub/image.png');
  });

  it('rejects path traversal via ..', () => {
    expect(() => resolveSafeUploadPath(ROOT, ['..', 'etc', 'passwd'])).toThrow(/outside/i);
  });

  it('rejects path traversal embedded in a single segment', () => {
    expect(() => resolveSafeUploadPath(ROOT, ['../secret.env'])).toThrow(/outside/i);
  });

  it('rejects absolute path segments', () => {
    expect(() => resolveSafeUploadPath(ROOT, ['/etc/passwd'])).toThrow();
  });

  it('rejects empty path', () => {
    expect(() => resolveSafeUploadPath(ROOT, [])).toThrow(/empty/i);
  });
});

describe('contentTypeFor', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.JPG', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
    ['photo.gif', 'image/gif'],
  ])('detects %s as %s', (file, expected) => {
    expect(contentTypeFor(file)).toBe(expected);
  });

  it('falls back to octet-stream for unknown extensions', () => {
    expect(contentTypeFor('weird.xyz')).toBe('application/octet-stream');
  });
});

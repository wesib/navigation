import { describe, expect, it } from '@jest/globals';
import { getHashURL, setHashURL } from './hash-url';

describe('getHashURL', () => {
  it('extracts absolute URL', () => {
    expect(getHashURL(new URL('http://localhost#http://test')).href).toBe('http://test/');
  });
  it('extracts relative URL', () => {
    expect(getHashURL(new URL('http://localhost#test?a=b#hash')).href).toBe('http://localhost/test?a=b#hash');
  });
});

describe('setHashURL', () => {
  it('substitutes absolute URL when origin differs', () => {
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('https://localhost/hash-path'),
    ).href).toBe('http://localhost/path#https://localhost/hash-path');
  });
  it('substitutes absolute URL when username is present', () => {
    expect(setHashURL(
        new URL('http://test@localhost/path#hash'),
        new URL('http://test@localhost/hash-path'),
    ).href).toBe('http://test@localhost/path#http://test@localhost/hash-path');
    expect(setHashURL(
        new URL('http://test@localhost/path#hash'),
        new URL('http://hash@localhost'),
    ).href).toBe('http://test@localhost/path#http://hash@localhost/');
  });
  it('does not substitute empty path', () => {
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost/'),
    ).href).toBe('http://localhost/path');
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost'),
    ).href).toBe('http://localhost/path');
  });
  it('substitutes non-empty path', () => {
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost/hash-path'),
    ).href).toBe('http://localhost/path#/hash-path');
  });
  it('substitutes search parameters', () => {
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost/hash-path?param'),
    ).href).toBe('http://localhost/path#/hash-path?param');
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost/?param'),
    ).href).toBe('http://localhost/path#/?param');
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost?param'),
    ).href).toBe('http://localhost/path#/?param');
  });
  it('substitutes nested hash', () => {
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost/hash-path?param#nested-hash'),
    ).href).toBe('http://localhost/path#/hash-path?param#nested-hash');
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost/#nested-hash'),
    ).href).toBe('http://localhost/path#/#nested-hash');
    expect(setHashURL(
        new URL('http://localhost/path#hash'),
        new URL('http://localhost#nested-hash'),
    ).href).toBe('http://localhost/path#/#nested-hash');
  });
});

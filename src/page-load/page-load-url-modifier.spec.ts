import { beforeEach, describe, expect, it } from '@jest/globals';
import { ContextRegistry, ContextValues } from '@proc7ts/context-values';
import { PageLoadURLModifier } from './page-load-url-modifier';

describe('PageLoadURLModifier', () => {

  let registry: ContextRegistry;
  let context: ContextValues;

  beforeEach(() => {
    registry = new ContextRegistry();
    context = registry.newValues();
  });

  let url: URL;
  let href: string;

  beforeEach(() => {
    url = new URL('http://localhost/path?q=v');
    href = url.href;
  });

  it('does not modify URL by default', () => {
    context.get(PageLoadURLModifier)(url);
    expect(url.href).toBe(href);
  });
  it('applies page load URL modifications', () => {
    registry.provide({
      a: PageLoadURLModifier,
      is: (u: URL) => u.pathname = '/other',
    });
    context.get(PageLoadURLModifier)(url);
    expect(url.href).toBe('http://localhost/other?q=v');
  });
});

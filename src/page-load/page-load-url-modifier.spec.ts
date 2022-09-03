import { beforeEach, describe, expect, it } from '@jest/globals';
import { CxBuilder, cxConstAsset } from '@proc7ts/context-builder';
import { CxValues } from '@proc7ts/context-values';
import { BootstrapContext } from '@wesib/wesib';
import { PageLoadURLModifier } from './page-load-url-modifier';

describe('PageLoadURLModifier', () => {
  let cxBuilder: CxBuilder;
  let context: CxValues;

  beforeEach(() => {
    cxBuilder = new CxBuilder(get => ({ get }));
    cxBuilder.provide(cxConstAsset(BootstrapContext, cxBuilder.context as BootstrapContext));
    context = cxBuilder.context;
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
    cxBuilder.provide(cxConstAsset(PageLoadURLModifier, (u: URL) => (u.pathname = '/other')));
    context.get(PageLoadURLModifier)(url);
    expect(url.href).toBe('http://localhost/other?q=v');
  });

  describe('toString', () => {
    it('provides string representation', () => {
      expect(String(PageLoadURLModifier)).toBe('[PageLoadURLModifier]');
    });
  });
});

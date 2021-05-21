import { bootstrapComponents, BootstrapContext, BootstrapWindow, Feature } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { LocationMock } from '../spec/location-mock';
import { PageHashURLParam } from './page-hash-url-param';
import { PageHashURLSupport } from './page-hash-url-support.feature';

describe('PageHashURLParam', () => {

  let locationMock: LocationMock;

  beforeEach(() => {
    locationMock = new LocationMock();
    (locationMock.window as any).DOMParser = DOMParser;
  });
  afterEach(() => {
    locationMock.down();
  });

  let context: BootstrapContext;
  let navigation: Navigation;
  let page: Page;

  beforeEach(async () => {
    @Feature({
      needs: PageHashURLSupport,
      setup(setup) {
        setup.provide({ a: BootstrapWindow, is: locationMock.window });
      },
    })
    class TestFeature {
    }

    context = await bootstrapComponents(TestFeature).whenReady;
    navigation = context.get(Navigation);
    navigation.read(p => page = p);
  });

  it('is equal to page URL initially', () => {
    expect(page.get(PageHashURLParam).href).toBe(new URL(page.url.origin).href);
  });
  it('replaces target page URL hash', async () => {

    const target = await navigation.with(PageHashURLParam, '/hash-path').open('/other#hash');

    expect(target!.url.href).toBe('http://localhost/other#/hash-path');
    expect(target!.get(PageHashURLParam).href).toBe(new URL('/hash-path', page.url.origin).href);
  });
  it('does not alter target page URL', async () => {

    const target = await navigation.open('/other#hash');

    expect(target!.url.href).toBe('http://localhost/other#hash');
    expect(target!.get(PageHashURLParam).href).toBe(new URL('/hash', page.url.origin).href);
  });
  it('does not alter target page URL when set to `null`', async () => {

    const target = await navigation.with(PageHashURLParam, null).open('/other#hash');

    expect(target!.url.href).toBe('http://localhost/other#hash');
    expect(target!.get(PageHashURLParam).href).toBe(new URL('/hash', page.url.origin).href);
  });
  it('does not alter target page URL hash when set to `null`', async () => {
    await navigation.open('/other#hash');

    const target = await navigation.with(PageHashURLParam, null).replace();

    expect(target!.url.href).toBe('http://localhost/other#hash');
    expect(target!.get(PageHashURLParam).href).toBe(new URL('/hash', page.url.origin).href);
  });
});

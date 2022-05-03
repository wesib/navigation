import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cxConstAsset } from '@proc7ts/context-builder';
import { afterThe } from '@proc7ts/fun-events';
import { HttpFetch } from '@wesib/generic';
import { bootstrapComponents, BootstrapContext, BootstrapWindow, Feature } from '@wesib/wesib';
import { Mock, SpyInstance } from 'jest-mock';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { LocationMock } from '../spec';
import { appRevSearchParam, PageCacheBuster } from './page-cache-buster.impl';
import { PageLoadParam } from './page-load-param';
import { PageLoadSupport } from './page-load-support.feature';

describe('PageCacheBuster', () => {

  let doc: Document;
  let locationMock: LocationMock;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
    jest.spyOn(doc, 'baseURI', 'get').mockImplementation(() => 'http://localhost/index');
    locationMock = new LocationMock({ doc });
    (locationMock.window as any).DOMParser = DOMParser;
  });
  afterEach(() => {
    locationMock.down();
  });

  let pageRev: string;

  beforeEach(() => {
    pageRev = 'page-rev';

    const meta = doc.createElement('meta');

    meta.name = 'wesib-app-rev';
    meta.content = pageRev;

    doc.head.appendChild(meta);
  });

  let responseRev: string;
  let responseHtml: () => string;
  let mockFetch: Mock<HttpFetch>;
  let context: BootstrapContext;

  beforeEach(async () => {
    responseRev = pageRev;
    responseHtml = () => `<html><head><meta name="wesib-app-rev" content="${responseRev}"></head></html>`;
    mockFetch = jest.fn((_input, _init?) => afterThe({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve(responseHtml()),
    } as Response));

    @Feature({
      needs: PageLoadSupport,
      setup(setup) {
        setup.provide(cxConstAsset(BootstrapWindow, locationMock.window));
        setup.provide(cxConstAsset(HttpFetch, mockFetch));
      },
    })
    class TestFeature {}

    context = await bootstrapComponents(TestFeature).whenReady;
  });

  let navigation: Navigation;
  let updateSpy: SpyInstance<(url: string | URL) => Page>;
  let reloadSpy: SpyInstance<() => void>;

  beforeEach(() => {
    navigation = context.get(Navigation);
    updateSpy = jest.spyOn(navigation, 'update');
    updateSpy.mockImplementation(() => ({} as Page));
    reloadSpy = jest.spyOn(navigation, 'reload');
  });

  it('sends page revision as search parameter', async () => {
    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some?q=v').catch(reject);
    });

    const request = mockFetch.mock.calls[0][0] as Request;

    expect(request.url).toBe(`http://localhost/some?q=v&${appRevSearchParam}=${pageRev}`);
  });
  it('does not reload current page if loaded page revision is the same', async () => {

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some?q=v').catch(reject);
    });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
  it('does not reload current page if loaded page revision is empty', async () => {
    responseRev = '';

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some?q=v').catch(reject);
    });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
  it('reloads current page if loaded page revision differs', async () => {
    responseRev = 'updated-rev';

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some?q=v').catch(reject);
    });

    expect(updateSpy).toHaveBeenCalled();
    expect((updateSpy.mock.calls[0][0] as URL).href)
        .toBe(`http://localhost/some?q=v&${appRevSearchParam}=${responseRev}`);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  describe('toString', () => {
    it('provides string representation', () => {
      expect(String(PageCacheBuster)).toBe('[PageCacheBuster]');
    });
  });

});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cxConstAsset } from '@proc7ts/context-builder';
import { EventReceiver, mapOn_, onEventBy, onPromise } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { HttpFetch } from '@wesib/generic';
import { bootstrapComponents, BootstrapContext, Feature } from '@wesib/wesib';
import { Mock } from 'jest-mock';
import { Page } from '../page';
import { MockObject } from '../spec';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadResponse } from './page-load-response';
import { PageLoadURLModifier } from './page-load-url-modifier';
import { PageLoader } from './page-loader.impl';

describe('PageLoader', () => {
  let mockHttpFetch: Mock<HttpFetch>;
  let page: Page;
  let mockResponse: MockObject<Response>;
  let mockResponseHeaders: MockObject<Headers>;

  beforeEach(() => {
    page = {
      url: new URL('http://localhost/test'),
      get: noop as any,
    } as Page;
    mockResponseHeaders = {
      get: jest.fn(),
    } as any;
    mockResponse = {
      ok: true,
      text: jest.fn(),
      headers: mockResponseHeaders,
    } as any;

    mockHttpFetch = jest.fn((_input, _init?) => onPromise(Promise.resolve(mockResponse)));
  });

  let bsContext: BootstrapContext;
  let mockAgent: Mock<PageLoadAgent>;

  beforeEach(async () => {
    mockAgent = jest.fn((next, _request) => next());

    @Feature({
      setup(setup) {
        setup.provide(cxConstAsset(HttpFetch, mockHttpFetch));
        setup.provide(cxConstAsset(PageLoadAgent, mockAgent));
      },
    })
    class TestFeature {}

    bsContext = await bootstrapComponents(TestFeature).whenReady;
  });

  let loadPage: PageLoader;

  beforeEach(() => {
    loadPage = bsContext.get(PageLoader);
  });

  it('is available in bootstrap context', () => {
    expect(loadPage).toBeInstanceOf(Function);
  });
  it('fetches document', async () => {
    mockResponse.text.mockImplementation(() => Promise.resolve('<div>test</div>'));

    await loadDocument();

    expect(mockHttpFetch).toHaveBeenCalledWith(
      expect.any(Request) as unknown as Request,
      undefined,
    );

    const request = mockHttpFetch.mock.calls[0][0] as Request;

    expect(request.url).toBe('http://localhost/test');
    // expect(request.mode).toBe('same-origin');
    // expect(request.credentials).toBe('same-origin');
    expect(request.headers.get('Accept')).toBe('text/html');
  });
  it('reports document load progress', async () => {
    mockResponse.text.mockImplementation(() => Promise.resolve('<div>test</div>'));

    const receiver = jest.fn<(response: PageLoadResponse) => void>();
    const done = jest.fn<(reason?: unknown) => void>();
    const supply = await loadDocument(receiver, done);

    expect(receiver).toHaveBeenCalledWith({ ok: undefined, page });
    expect(receiver).toHaveBeenLastCalledWith({
      ok: true,
      page,
      document: expect.any(Document) as unknown as Document,
      response: expect.anything() as unknown as Response,
    });
    expect(receiver).toHaveBeenCalledTimes(2);
    expect(supply.isOff).toBe(true);
    expect(done).toHaveBeenCalledWith(undefined);

    const document = (receiver.mock.calls[1][0] as PageLoadResponse.Ok).document;
    const div: Element = document.querySelector('div') as Element;

    expect(div.ownerDocument).toBeInstanceOf(Document);
    expect(div).toBeInstanceOf(HTMLDivElement);
    expect(div.textContent).toBe('test');
  });
  it('parses the response as HTML by default', async () => {
    mockResponse.text.mockImplementation(() => Promise.resolve('<div>test</div>'));

    const receiver = jest.fn<(response: PageLoadResponse) => void>();
    const done = jest.fn<(reason?: unknown) => void>();
    const supply = await loadDocument(receiver, done);

    expect(receiver).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: true, page }) as unknown as PageLoadResponse,
    );
    expect(supply.isOff).toBe(true);
    expect(done).toHaveBeenCalledWith(undefined);

    const document = (receiver.mock.calls[1][0] as PageLoadResponse.Ok).document;
    const div: Element = document.querySelector('div') as Element;

    expect(div.ownerDocument).toBeInstanceOf(Document);
    expect(div).toBeInstanceOf(HTMLDivElement);
    expect(div.textContent).toBe('test');
  });
  it('sets base URI to page URL by default', async () => {
    mockResponse.text.mockImplementation(() => Promise.resolve('<div>test</div>'));

    const receiver = jest.fn<(response: PageLoadResponse) => void>();

    await loadDocument(receiver);

    const document = (receiver.mock.calls[1][0] as PageLoadResponse.Ok).document;

    expect(document.baseURI).toBe('http://localhost/test');
  });
  it('resolves base URI against page URL by default', async () => {
    (page as any).url = new URL('http://localhost/test/page/index.html');
    mockResponse.text.mockImplementation(() => Promise.resolve('<html><head><base href=".."></head></html>'));

    const receiver = jest.fn<(response: PageLoadResponse) => void>();

    await loadDocument(receiver);

    const document = (receiver.mock.calls[1][0] as PageLoadResponse.Ok).document;

    expect(document.baseURI).toBe('http://localhost/test/');
  });
  it('parses the response accordingly to `Context-Type` header', async () => {
    mockResponseHeaders.get.mockImplementation(_name => 'application/xml; charset=utf-8');
    mockResponse.text.mockImplementation(() => Promise.resolve('<?xml version="1.0"?><content>test</content>'));

    const receiver = jest.fn<(response: PageLoadResponse) => void>();
    const done = jest.fn<(reason?: unknown) => void>();
    const supply = await loadDocument(receiver, done);

    expect(receiver).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: true, page }) as unknown as PageLoadResponse,
    );
    expect(supply.isOff).toBe(true);
    expect(done).toHaveBeenCalledWith(undefined);

    const document = (receiver.mock.calls[1][0] as PageLoadResponse.Ok).document;
    const content = document.querySelector('content') as Node;

    expect(content).toBeInstanceOf(Element);
    expect(content).not.toBeInstanceOf(HTMLElement);
    expect(content.textContent).toBe('test');
  });
  it('reports fetch error', async () => {
    const error = new Error('Some error');

    mockHttpFetch = jest.fn((_input, _init?) => onEventBy(() => {
        const failedSupply = new Supply();

        failedSupply.off(error);

        return failedSupply;
      }));

    const receiver = jest.fn();
    const done = jest.fn();

    mockResponse.text.mockImplementation(() => Promise.reject(error));

    const supply = await loadDocument(receiver, done);

    expect(receiver).not.toHaveBeenLastCalledWith(expect.objectContaining({ ok: undefined, page }));
    expect(supply.isOff).toBe(true);
    expect(done).toHaveBeenCalledWith(error);
  });
  it('reports invalid HTTP response', async () => {
    (mockResponse as any).ok = false;
    (mockResponse as any).status = 404;
    mockResponse.text.mockImplementation(() => Promise.resolve('dhfdfhfhg'));

    const receiver = jest.fn();
    const done = jest.fn();
    const supply = await loadDocument(receiver, done);

    expect(receiver).toHaveBeenLastCalledWith({
      ok: false,
      page,
      response: mockResponse,
      error: mockResponse.status,
    });
    expect(supply.isOff).toBe(true);
    expect(done).toHaveBeenCalled();
  });
  it('reports parse error', async () => {
    mockResponseHeaders.get.mockImplementation(name => {
      if (name.toLowerCase() === 'content-type') {
        return 'application/x-wrong';
      }

      return null;
    });
    mockResponse.text.mockImplementation(() => Promise.resolve('dhfdfhfhg'));

    const receiver = jest.fn();
    const done = jest.fn();
    const supply = await loadDocument(receiver, done);

    expect(receiver).toHaveBeenLastCalledWith({
      ok: false,
      page,
      response: mockResponse,
      error: expect.any(Object),
    });
    expect(supply.isOff).toBe(true);
    expect(done).toHaveBeenCalled();
  });
  it('applies page load URL', async () => {
    await new Promise(resolve => {
      @Feature({
        setup(setup) {
          setup.provide(
            cxConstAsset(PageLoadURLModifier, (url: URL) => url.searchParams.set('test', 'updated')),
          );
          setup.whenReady(resolve);
        },
      })
      class PageLoadURLFeature {}

      bsContext.load(PageLoadURLFeature);
    });

    mockResponse.text.mockImplementation(() => Promise.resolve('<div>test</div>'));

    await loadDocument();

    const request = mockHttpFetch.mock.calls[0][0] as Request;

    expect(request.url).toBe('http://localhost/test?test=updated');
  });
  it('calls agent', async () => {
    mockResponse.text.mockImplementation(() => Promise.resolve('<div>test</div>'));

    const newResponse: PageLoadResponse = {
      ok: true,
      page,
      response: { name: 'response' } as any,
      document: document.implementation.createHTMLDocument('other'),
    };

    mockAgent.mockImplementation(next => next().do(mapOn_(response => (response.ok ? newResponse : response))));

    const receiver = jest.fn();

    await loadDocument(receiver);

    expect(receiver).toHaveBeenCalledWith({ ok: undefined, page });
    expect(receiver).toHaveBeenLastCalledWith(newResponse);
  });

  describe('toString', () => {
    it('provides string representation', () => {
      expect(String(PageLoader)).toBe('[PageLoader]');
    });
  });

  function loadDocument(
    receiver: EventReceiver<[PageLoadResponse]> = noop,
    done: (reason?: unknown) => void = noop,
  ): Promise<Supply> {
    return new Promise<Supply>(resolve => {
      const supply = loadPage(page)(receiver);

      supply.whenOff(reason => {
        done(reason);
        resolve(supply);
      });
    });
  }
});

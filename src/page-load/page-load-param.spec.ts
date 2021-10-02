import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cxConstAsset } from '@proc7ts/context-builder';
import { afterThe, EventEmitter, onceOn } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { HttpFetch } from '@wesib/generic';
import { bootstrapComponents, BootstrapContext, BootstrapWindow, Feature } from '@wesib/wesib';
import { Mock } from 'jest-mock';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { LocationMock } from '../spec/location-mock';
import { testPageParam } from '../spec/test-page-param';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadParam } from './page-load-param';
import { PageLoadResponse } from './page-load-response';

describe('PageLoadParam', () => {

  let locationMock: LocationMock;

  beforeEach(() => {
    locationMock = new LocationMock();
    (locationMock.window as any).DOMParser = DOMParser;
  });
  afterEach(() => {
    locationMock.down();
  });

  let responder: EventEmitter<[PageLoadResponse]>;
  let mockAgent: Mock<ReturnType<PageLoadAgent>, Parameters<PageLoadAgent>>;
  let receiver: Mock<void, [PageLoadResponse]>;

  beforeEach(() => {
    responder = new EventEmitter();
    mockAgent = jest.fn((_next, _request) => responder.on);
    receiver = jest.fn();
  });

  let context: BootstrapContext;
  let navigation: Navigation;
  let page: Page;

  beforeEach(async () => {
    @Feature({
      setup(setup) {
        setup.provide(cxConstAsset(BootstrapWindow, locationMock.window));
        setup.provide(cxConstAsset(PageLoadAgent, mockAgent));
      },
    })
    class TestFeature {
    }

    context = await bootstrapComponents(TestFeature).whenReady;
    navigation = context.get(Navigation);
    navigation.read(p => page = p);
  });

  it('does not load initial page', () => {
    page.put(PageLoadParam, { receiver });

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);

    expect(receiver).not.toHaveBeenCalled();
  });
  it('loads opened page', async () => {
    page.put(PageLoadParam, { receiver });

    await navigation.open('/other');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(receiver).toHaveBeenCalledWith(response);
    expect(receiver).toHaveBeenCalledTimes(1);
  });
  it('does not load any page when pretending to navigate', () => {
    page.put(PageLoadParam, { receiver });

    const [param] = testPageParam();

    navigation.with(param, 'test-value').pretend('/other');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(receiver).not.toHaveBeenCalled();
  });
  it('reports opened page after parameterized navigation', async () => {
    await navigation.with(PageLoadParam, { receiver }).open('/other');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(receiver).toHaveBeenCalledWith(response);
    expect(receiver).toHaveBeenCalledTimes(1);
  });
  it('loads replacement page', async () => {
    page.put(PageLoadParam, { receiver });

    await navigation.open('/other');
    await navigation.replace('./third');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(receiver).toHaveBeenCalledWith(response);
    expect(receiver).toHaveBeenCalledTimes(1);
  });
  it('loads page when returned to it', async () => {
    page.put(PageLoadParam, { receiver });

    await navigation.open('/other');
    receiver.mockClear();
    navigation.back();

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(receiver).toHaveBeenCalledWith(response);
    expect(receiver).toHaveBeenCalledTimes(1);
  });
  it('reports page load error', async () => {
    mockAgent.mockImplementation(next => next());

    const error = new Error('reason');
    const reject = Promise.reject<string>(error);

    await new Promise(resolve => {
      @Feature({
        setup(setup) {
          setup.provide(cxConstAsset(HttpFetch, () => afterThe({ ok: true, text: () => reject } as Response)));
        },
        init(ctx) {
          ctx.whenReady(resolve);
        },
      })
      class MockFetchFeature {
      }

      context.load(MockFetchFeature);
    });

    page.put(PageLoadParam, { receiver });

    await navigation.open('/other');
    await reject.catch(noop);
    await Promise.resolve();

    expect(receiver).toHaveBeenCalledWith({
      ok: false,
      page,
      error,
    });
  });
  it('reports loaded page to all receivers', async () => {

    const receiver2 = jest.fn();

    page.put(PageLoadParam, { receiver });
    page.put(PageLoadParam, { receiver: receiver2 });

    await navigation.open('/other');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(receiver2).toHaveBeenCalledWith(response);
    expect(receiver2).toHaveBeenCalledTimes(1);
  });
  it('does not report already loaded page', async () => {
    page.put(PageLoadParam, { receiver });

    await navigation.open('/other');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);

    const receiver2 = jest.fn();

    page.put(PageLoadParam, { receiver: receiver2 });
    expect(receiver2).not.toHaveBeenCalled();
  });
  it('does not report to unregistered receivers', async () => {

    const supply = new Supply();
    const receiver2 = jest.fn();

    page.put(PageLoadParam, { receiver: { supply, receive: (_, r) => receiver(r) } });
    page.put(PageLoadParam, { receiver: { supply, receive: (_, r) => receiver2(r) } });

    await navigation.open('/other');
    supply.off();

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);

    expect(receiver).not.toHaveBeenCalled();
    expect(receiver2).not.toHaveBeenCalled();
  });
  it('does not load page when navigation cancelled', async () => {
    navigation.onLeave.do(onceOn)(event => event.preventDefault());
    await navigation.with(PageLoadParam, { receiver }).open('/other');

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);

    expect(receiver).not.toHaveBeenCalled();
  });

  describe('fragments', () => {

    let request: Request;
    let result: string;
    let mockFetch: Mock<ReturnType<HttpFetch>, Parameters<HttpFetch>>;

    beforeEach(() => {
      result = '<body></body>';
      mockFetch = jest.fn((input, _init?) => {
        request = input as Request;

        return afterThe(
            {
              ok: true,
              headers: new Headers(),
              text: () => Promise.resolve(result),
            } as Response,
        );
      });
    });

    beforeEach(async () => {
      mockAgent.mockImplementation(next => next());

      await new Promise(resolve => {
        @Feature({
          setup(setup) {
            setup.provide(cxConstAsset(HttpFetch, mockFetch));
          },
          init(ctx) {
            ctx.whenReady(resolve);
          },
        })
        class MockFetchFeature {
        }

        context.load(MockFetchFeature);
      });
    });

    it('loads requested fragment by id', async () => {
      result = `<div id="test-fragment">fragment content</div>`;

      const response = await new Promise<PageLoadResponse>((resolve, reject) => {
        navigation.with(
            PageLoadParam,
            {
              receiver: r => r.ok && resolve(r),
              fragment: { id: 'test-fragment' },
            },
        ).open('/other').catch(reject);
      });

      expect(request.headers.get('Accept-Fragment')).toEqual('id=test-fragment');
      expect(response).toMatchObject({
        ok: true,
        fragment: expect.objectContaining({ id: 'test-fragment' }),
      });
    });
    it('loads requested fragment by tag name', async () => {
      result = `<test-fragment>fragment content</test-fragment>`;

      const response = await new Promise<PageLoadResponse>((resolve, reject) => {
        navigation.with(
            PageLoadParam,
            {
              receiver: r => r.ok && resolve(r),
              fragment: { tag: 'test-fragment' },
            },
        ).open('/other').catch(reject);
      });

      expect(request.headers.get('Accept-Fragment')).toEqual('tag=test-fragment');
      expect(response).toMatchObject({
        ok: true,
        fragment: expect.objectContaining({ tagName: 'TEST-FRAGMENT' }),
      });
    });
    it('requests non-existing fragment', async () => {
      result = `<div id="test-fragment">fragment content</div>`;

      const response = await new Promise<PageLoadResponse>((resolve, reject) => {
        navigation.with(
            PageLoadParam,
            {
              receiver: r => r.ok && resolve(r),
              fragment: { id: 'wrong-fragment' },
            },
        ).open('/other').catch(reject);
      });

      expect(request.headers.get('Accept-Fragment')).toEqual('id=wrong-fragment');
      expect(response).toMatchObject({ ok: true, fragment: undefined });
    });
    it('loads multiple fragments', async () => {
      result = `<div id="test-fragment">fragment content</div><test-fragment-2>fragment 2 content</test-fragment-2>`;

      let resolve1: (response: PageLoadResponse) => void;
      let resolve2: (response: PageLoadResponse) => void;
      const promise1 = new Promise<PageLoadResponse>(resolve => resolve1 = resolve);
      const promise2 = new Promise<PageLoadResponse>(resolve => resolve2 = resolve);

      await navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve1(r),
            fragment: { id: 'test-fragment' },
          },
      ).with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve2(r),
            fragment: { tag: 'test-fragment-2' },
          },
      ).open('/other');

      const response1 = await promise1;
      const response2 = await promise2;

      expect(request.headers.get('Accept-Fragment')).toEqual('id=test-fragment, tag=test-fragment-2');
      expect(response1).toMatchObject({
        ok: true,
        fragment: expect.objectContaining({ id: 'test-fragment' }),
      });
      expect(response2).toMatchObject({
        ok: true,
        fragment: expect.objectContaining({ tagName: 'TEST-FRAGMENT-2' }),
      });
    });
    it('requests full document if at least one request contains no fragment', async () => {
      result = `<div id="test-fragment">fragment content</div>`;

      let resolve1: (response: PageLoadResponse) => void;
      let resolve2: (response: PageLoadResponse) => void;
      const promise1 = new Promise<PageLoadResponse>(resolve => resolve1 = resolve);
      const promise2 = new Promise<PageLoadResponse>(resolve => resolve2 = resolve);

      await navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve1(r),
            fragment: { id: 'test-fragment' },
          },
      ).with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve2(r),
          },
      ).open('/other');

      const response1 = await promise1;
      const response2 = await promise2;

      expect(request.headers.get('Accept-Fragment')).toBeNull();
      expect(response1).toMatchObject({ ok: true, fragment: expect.objectContaining({ id: 'test-fragment' }) });
      expect(response2).toMatchObject({ ok: true });
      expect((response2 as PageLoadResponse.Ok).fragment).toBeUndefined();
    });
    it('reports error', async () => {

      const error = new Error('reason');
      const reject = Promise.reject<string>(error);

      mockFetch.mockImplementation(() => afterThe({ ok: true, text: () => reject } as Response));

      const response = await new Promise<PageLoadResponse>((resolve, reject) => {
        navigation.with(
            PageLoadParam,
            {
              receiver: r => r.ok === false && resolve(r),
              fragment: { id: 'test-fragment' },
            },
        ).open('/other').catch(reject);
      });

      expect(response).toMatchObject({ ok: false, error });
    });
  });
});

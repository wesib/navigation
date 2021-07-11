import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cxConstAsset } from '@proc7ts/context-builder';
import { afterSupplied, onceAfter, onceOn, onSupplied } from '@proc7ts/fun-events';
import { asis, noop } from '@proc7ts/primitives';
import { bootstrapComponents, BootstrapContext, BootstrapWindow, Feature } from '@wesib/wesib';
import { Mock } from 'jest-mock';
import { Navigation } from './navigation';
import { NavigationAgent } from './navigation-agent';
import { EnterPageEvent, LeavePageEvent, NavigationEventType, StayOnPageEvent } from './navigation.event';
import { Page } from './page';
import { PageParam } from './page-param';
import { MockObject } from './spec';
import { LocationMock, navHistoryState } from './spec/location-mock';
import { testPageParam } from './spec/test-page-param';

describe('Navigation', () => {

  let locationMock: LocationMock;

  beforeEach(() => {
    locationMock = new LocationMock();
  });
  afterEach(() => {
    locationMock.down();
  });

  let navigation: Navigation;
  let agent: Mock<ReturnType<NavigationAgent>, Parameters<NavigationAgent>>;

  beforeEach(async () => {

    let context: BootstrapContext = null!;

    agent = jest.fn((next, _action, _from, _to) => next());

    @Feature({
      setup(setup) {
        setup.provide(cxConstAsset(BootstrapWindow, locationMock.window));
        setup.provide(cxConstAsset(NavigationAgent, agent));
      },
    })
    class TestFeature {
    }

    context = await bootstrapComponents(TestFeature).whenReady;
    navigation = context.get(Navigation);
  });

  let location: { url: string; data: any };

  beforeEach(() => {
    navigation.read(({ url, data }) => location = { url: url.href, data });
  });

  it('reads initial location from `Location` and `History`', () => {
    expect(location).toEqual({ url: 'http://localhost/index', data: 'initial' });
    expect(locationMock.href).toHaveBeenCalled();
    expect(locationMock.state).toHaveBeenCalled();
  });
  it('makes initial page current', () => {
    navigation.read.do(onceAfter)(page => {
      expect(page.current).toBe(true);
      expect(page.visited).toBe(true);
    });
  });

  describe('length', () => {
    it('returns history length', () => {
      expect(navigation).toHaveLength(1);
      expect(locationMock.historyLength).toHaveBeenCalled();
    });
  });

  describe('go', () => {
    it('calls `History.go(delta)`', () => {
      navigation.go(10);
      expect(locationMock.history.go).toHaveBeenCalledWith(10);
    });
  });

  describe('back', () => {
    it('calls `History.go(-1)`', () => {
      navigation.back();
      expect(locationMock.history.go).toHaveBeenCalledWith(-1);
    });
  });

  describe('forward', () => {
    it('calls `History.go(1)`', () => {
      navigation.forward();
      expect(locationMock.history.go).toHaveBeenCalledWith(1);
    });
  });

  describe('reload', () => {
    it('calls `History.go()`', () => {
      navigation.reload();
      expect(locationMock.history.go).toHaveBeenCalledWith(undefined);
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('is the same as `read`', () => {
      void expect(afterSupplied(navigation)).toBe(navigation.read);
    });
  });

  describe('[OnEvent__symbol]', () => {
    it('is the same as `on`', () => {
      void expect(onSupplied(navigation)).toBe(navigation.on);
    });
  });

  describe('open', () => {
    it('navigates to target', async () => {
      await navigation.open({ url: new URL('http://localhost/other'), data: 'updated', title: 'new title' });
      expect(locationMock.history.pushState).toHaveBeenCalledWith(
          navHistoryState({ data: 'updated' }),
          'new title',
          'http://localhost/other',
      );
      expect(location).toEqual({ url: 'http://localhost/other', data: 'updated' });
    });
    it('navigates to path', async () => {
      await navigation.open('other');
      expect(locationMock.history.pushState).toHaveBeenCalledWith(
          navHistoryState({}),
          '',
          'http://localhost/other',
      );
      expect(location).toEqual({ url: 'http://localhost/other' });
    });
    it('navigates to the same URL', async () => {
      await navigation.open({ data: 'updated', title: 'new title' });
      expect(locationMock.history.pushState).toHaveBeenCalledWith(
          navHistoryState({ data: 'updated' }),
          'new title',
          'http://localhost/index',
      );
      expect(location).toEqual({ url: 'http://localhost/index', data: 'updated' });
    });
    it('updates current page', async () => {

      let left: Page;

      navigation.read.do(onceAfter)(page => left = page);
      await navigation.open('other');

      navigation.read.do(onceAfter)(page => {
        expect(page.current).toBe(true);
        expect(page.visited).toBe(true);
        expect(left.current).toBe(false);
        expect(left.visited).toBe(true);
      });
    });
    it('sends navigation events', async () => {

      let leavePage!: LeavePageEvent;
      const onLeave = jest.fn((event: LeavePageEvent) => {
        leavePage = event;
        expect(leavePage.from.current).toBe(true);
        expect(leavePage.from.visited).toBe(true);
        expect(leavePage.to.current).toBe(false);
        expect(leavePage.to.visited).toBe(false);
      });
      let enterPage!: EnterPageEvent;
      const onEnter = jest.fn((event: EnterPageEvent) => {
        enterPage = event;
        expect(enterPage.to.current).toBe(true);
        expect(enterPage.to.visited).toBe(true);
      });
      const onEvent = jest.fn();

      navigation.onLeave(onLeave);
      navigation.onEnter(onEnter);
      navigation.on(onEvent);

      await navigation.open({ url: '/other', data: 'updated' });

      expect(onLeave).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledTimes(1);

      expect(onEvent).toHaveBeenCalledWith(leavePage);
      expect(onEvent).toHaveBeenLastCalledWith(enterPage);

      expect(leavePage.when).toBe('pre-open');
      expect(leavePage.from.url.href).toBe('http://localhost/index');
      expect(leavePage.to.url.href).toBe('http://localhost/other');
      expect(leavePage.type).toBe(NavigationEventType.LeavePage);
      expect(leavePage.from.data).toBe('initial');
      expect(leavePage.to.data).toBe('updated');

      expect(enterPage.when).toBe('open');
      expect(enterPage.to.url.href).toBe('http://localhost/other');
      expect(enterPage.type).toBe(NavigationEventType.EnterPage);
      expect(enterPage.to.data).toBe('updated');
    });
    it('does not navigate if pre-navigate event is cancelled', async () => {
      navigation.onLeave.do(onceOn)(event => event.preventDefault());
      expect(await navigation.open('/other')).toBeNull();
      expect(locationMock.window.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(locationMock.history.pushState).not.toHaveBeenCalled();
      expect(location).toEqual({ url: 'http://localhost/index', data: 'initial' });
      expect(locationMock.window.dispatchEvent)
          .toHaveBeenCalledWith(expect.objectContaining({ type: NavigationEventType.StayOnPage }));
    });
    it('informs on navigation cancellation', async () => {

      const onEvent = jest.fn();
      let stayOnPage!: StayOnPageEvent;

      navigation.onLeave.do(onceOn)(event => event.preventDefault());
      navigation.onStay(event => stayOnPage = event);
      navigation.on(onEvent);
      await navigation.open('/other');
      expect(stayOnPage.when).toBe('stay');
      expect(stayOnPage.to.url.href).toBe('http://localhost/other');
      expect(stayOnPage.reason).toBeUndefined();
      expect(onEvent).toHaveBeenLastCalledWith(stayOnPage);
    });
    it('calls agent', async () => {
      expect(await navigation.open({ url: '/other', title: 'new title', data: 'new data' }))
          .toMatchObject({ title: 'new title', data: 'new data' });
      expect(agent).toHaveBeenCalledWith(
          expect.any(Function),
          'pre-open',
          expect.objectContaining({
            url: expect.objectContaining({ href: 'http://localhost/index' }),
            data: 'initial',
          }),
          expect.objectContaining({
            url: expect.objectContaining({ href: 'http://localhost/other' }),
            title: 'new title',
            data: 'new data',
          }),
      );
    });
    it('cancels navigation if agent didn\'t call the next one', async () => {
      agent.mockImplementation(noop);
      expect(await navigation.open({ url: '/other', title: 'new title', data: 'new data' })).toBeNull();
      expect(agent).toHaveBeenCalled();
      expect(locationMock.window.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(locationMock.history.pushState).not.toHaveBeenCalled();
      expect(location).toEqual({ url: 'http://localhost/index', data: 'initial' });
      expect(locationMock.window.dispatchEvent)
          .toHaveBeenCalledWith(expect.objectContaining({ type: NavigationEventType.StayOnPage }));
    });
    it('cancels the failed navigation', async () => {

      const error = new Error('failed');

      locationMock.history.pushState.mockImplementation(() => { throw error; });

      let stayOnPage!: StayOnPageEvent;

      navigation.onStay(event => stayOnPage = event);
      expect(await navigation.open('/other').catch(asis)).toBe(error);
      expect(stayOnPage.when).toBe('stay');
      expect(stayOnPage.to.url.href).toBe('http://localhost/other');
      expect(stayOnPage.reason).toBe(error);
    });
    it('cancels previous navigation when the new one initiated', async () => {
      navigation.onLeave.do(onceOn)(() => {
        navigation.open({ url: '/second', data: 3 }).catch(noop);
      });
      expect(await navigation.open('/other')).toBeNull();
      await Promise.resolve(); // await for another navigation to finish
      expect(locationMock.window.dispatchEvent).toHaveBeenCalledTimes(4);
      expect(locationMock.history.pushState).toHaveBeenCalledWith(
          navHistoryState({ data: 3 }),
          '',
          'http://localhost/second',
      );
      expect(locationMock.history.pushState).toHaveBeenCalledTimes(1);
      expect(location).toEqual({ url: 'http://localhost/second', data: 3 });
      expect(locationMock.window.dispatchEvent)
          .toHaveBeenLastCalledWith(expect.objectContaining({ type: NavigationEventType.EnterPage }));
    });
    it('cancels previous navigation when the third one initiated', async () => {

      const other = navigation.open('/other');
      const second = navigation.open('/second');
      const third = navigation.open('/third');

      expect(await other).toBeNull();
      expect(await second).toBeNull();
      expect(await third).toMatchObject({ url: new URL('http://localhost/third') });
      expect(locationMock.window.dispatchEvent).toHaveBeenCalledTimes(4);
      expect(locationMock.history.pushState).toHaveBeenCalledWith(
          navHistoryState({ data: undefined }),
          '',
          'http://localhost/third',
      );
      expect(locationMock.history.pushState).toHaveBeenCalledTimes(1);
      expect(location).toEqual({ url: 'http://localhost/third' });
      expect(locationMock.window.dispatchEvent)
          .toHaveBeenLastCalledWith(expect.objectContaining({ type: NavigationEventType.EnterPage }));
    });
  });

  describe('hashchange', () => {
    it('navigates to new page', () => {
      locationMock.enter('#other');
      expect(location).toEqual({ url: 'http://localhost/index#other', data: null });
    });
    it('updates current page', () => {

      let left: Page;

      navigation.read.do(onceAfter)(page => left = page);
      locationMock.enter('#other');

      navigation.read.do(onceAfter)(page => {
        expect(page.current).toBe(true);
        expect(page.visited).toBe(true);
        expect(left.current).toBe(false);
        expect(left.visited).toBe(true);
      });
    });
    it('sends navigation event', () => {

      const onEnter = jest.fn();

      navigation.onEnter(onEnter);
      locationMock.enter('#other');

      expect(onEnter).toHaveBeenCalledWith(expect.objectContaining({
        type: NavigationEventType.EnterPage,
        when: 'enter',
        to: expect.objectContaining({
          url: expect.objectContaining({ href: 'http://localhost/index#other' }),
          data: null,
        }),
      }));
    });
  });

  describe('replace', () => {
    it('replaces location with the target', async () => {

      const newPage = await navigation.replace({
        url: new URL('http://localhost/other'),
        data: 'updated',
        title: 'new title',
      });

      expect(newPage).toMatchObject({
        url: new URL('http://localhost/other'),
        data: 'updated',
        title: 'new title',
      });
      expect(locationMock.history.replaceState).toHaveBeenCalledWith(
          navHistoryState({ data: 'updated' }),
          'new title',
          'http://localhost/other',
      );
      expect(newPage).toBe(navigation.page);
      expect(location).toEqual({ url: 'http://localhost/other', data: 'updated' });
    });
    it('replaces location with the target URL', async () => {
      await navigation.replace('/other');
      expect(locationMock.history.replaceState).toHaveBeenCalledWith(
          navHistoryState({ data: undefined }),
          '',
          'http://localhost/other',
      );
      expect(location).toEqual({ url: 'http://localhost/other' });
    });
    it('replaces location with the same URL', async () => {
      await navigation.replace({ data: 'updated', title: 'new title' });
      expect(locationMock.history.replaceState).toHaveBeenCalledWith(
          navHistoryState({ data: 'updated' }),
          'new title',
          'http://localhost/index',
      );
      expect(location).toEqual({ url: 'http://localhost/index', data: 'updated' });
    });
    it('updates current page', async () => {

      let left: Page;

      navigation.read.do(onceAfter)(page => left = page);
      await navigation.replace('other');

      navigation.read.do(onceAfter)(page => {
        expect(page.current).toBe(true);
        expect(page.visited).toBe(true);
        expect(left.current).toBe(false);
        expect(left.visited).toBe(true);
      });
    });
    it('sends navigation events', async () => {

      let leavePage!: LeavePageEvent;
      const onLeave = jest.fn((event: LeavePageEvent) => {
        leavePage = event;
        expect(leavePage.from.current).toBe(true);
        expect(leavePage.from.visited).toBe(true);
        expect(leavePage.to.current).toBe(false);
        expect(leavePage.to.visited).toBe(false);
      });
      let enterPage!: EnterPageEvent;
      const onEnter = jest.fn((event: EnterPageEvent) => {
        enterPage = event;
        expect(enterPage.to.current).toBe(true);
        expect(enterPage.to.visited).toBe(true);
      });

      navigation.onLeave(onLeave);
      navigation.onEnter(onEnter);

      await navigation.replace({ url: '/other', data: 'updated' });
      expect(onLeave).toHaveBeenCalledTimes(1);
      expect(onEnter).toHaveBeenCalledTimes(1);

      expect(leavePage.when).toBe('pre-replace');
      expect(leavePage.from.url.href).toBe('http://localhost/index');
      expect(leavePage.to.url.href).toBe('http://localhost/other');
      expect(leavePage.type).toBe(NavigationEventType.LeavePage);
      expect(leavePage.from.data).toBe('initial');
      expect(leavePage.to.data).toBe('updated');

      expect(enterPage.when).toBe('replace');
      expect(enterPage.to.url.href).toBe('http://localhost/other');
      expect(enterPage.type).toBe(NavigationEventType.EnterPage);
      expect(enterPage.to.data).toBe('updated');
    });
    it('does not replace the location if pre-navigate event is cancelled', async () => {
      locationMock.history.replaceState.mockClear();
      navigation.onLeave.do(onceOn)(event => event.preventDefault());
      await navigation.replace('/other');
      expect(locationMock.window.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(locationMock.history.replaceState).not.toHaveBeenCalled();
      expect(location).toEqual({ url: 'http://localhost/index', data: 'initial' });
      expect(locationMock.window.dispatchEvent)
          .toHaveBeenCalledWith(expect.objectContaining({ type: NavigationEventType.StayOnPage }));
    });
    it('informs on navigation cancellation', async () => {

      let stayOnPage!: StayOnPageEvent;

      navigation.onLeave.do(onceOn)(event => event.preventDefault());
      navigation.onStay(event => stayOnPage = event);
      await navigation.replace('/other');
      expect(stayOnPage.when).toBe('stay');
      expect(stayOnPage.to.url.href).toBe('http://localhost/other');
      expect(stayOnPage.reason).toBeUndefined();
    });
    it('cancels the failed location replacement', async () => {

      const error = new Error('failed');

      locationMock.history.replaceState.mockImplementation(() => { throw error; });

      let stayOnPage!: StayOnPageEvent;

      navigation.onStay(event => stayOnPage = event);
      expect(await navigation.replace('/other').catch(asis)).toBe(error);
      expect(stayOnPage.when).toBe('stay');
      expect(stayOnPage.to.url.href).toBe('http://localhost/other');
      expect(stayOnPage.reason).toBe(error);
    });
  });

  describe('pretend', () => {

    let param: PageParam<string, string>;
    let mockHandle: MockObject<PageParam.Handle<string, string>>;
    let fromPage: Page;

    beforeEach(() => {
      [param, mockHandle] = testPageParam('test');
      navigation.read.do(onceAfter)(page => fromPage = page);
    });

    it('builds navigation target', () => {
      expect(navigation.with(param, 'other').pretend({
        url: new URL('http://localhost/other'),
        data: 'updated',
        title: 'new title',
      })).toMatchObject({
        url: new URL('http://localhost/other'),
        data: 'updated',
        title: 'new title',
      });
    });
    it('invokes callback', () => {

      const callback = jest.fn((from: Page, to: Page) => {
        expect(from).toBe(fromPage);
        expect(to.url.href).toBe(fromPage.url.href);
        expect(from).not.toBe(to);
        expect(to.get(param)).toBe('other');
        return 'cb result';
      });

      expect(navigation.with(param, 'other').pretend(callback)).toBe('cb result');
    });
    it('fails when property application failed', () => {

      const error = new Error('test');

      navigation.read.do(onceAfter)(page => page.put(param, 'test'));
      (mockHandle.transfer as any).mockImplementation(() => { throw error; });
      expect(() => navigation.with(param, 'other').pretend()).toThrow(error);
    });
    it('returns `undefined` when agent prevent navigation', () => {
      agent.mockImplementation(noop);
      expect(navigation.with(param, 'other').pretend('/other')).toBeUndefined();
    });
    it('cleans up parameters', () => {
      navigation.with(param, 'other').pretend();
      expect(mockHandle.stay).toHaveBeenCalledWith(fromPage);
    });
  });

  describe('on pop state', () => {
    it('sends navigation event', () => {

      const onLeave = jest.fn();
      let enterPage!: EnterPageEvent;
      const onEnter = jest.fn((event: EnterPageEvent) => {
        enterPage = event;
        expect(enterPage.to.current).toBe(true);
        expect(enterPage.to.visited).toBe(true);
      });

      navigation.onLeave(onLeave);
      navigation.onEnter(onEnter);

      locationMock.href.mockImplementation(() => 'http://localhost/revisited');
      locationMock.window.dispatchEvent(new PopStateEvent('popstate', { state: 'popped' }));

      expect(onLeave).not.toHaveBeenCalled();
      expect(onEnter).toHaveBeenCalledTimes(1);

      expect(enterPage.when).toBe('return');
      expect(enterPage.to.url.href).toBe('http://localhost/revisited');
      expect(enterPage.type).toBe(NavigationEventType.EnterPage);
      expect(enterPage.to.data).toBe('popped');
    });
    it('updates location', () => {
      locationMock.href.mockImplementation(() => 'http://localhost/revisited');
      locationMock.window.dispatchEvent(new PopStateEvent('popstate', { state: 'popped' }));

      expect(location).toEqual({ url: 'http://localhost/revisited', data: 'popped' });
    });
  });

  describe('toString', () => {
    it('provides string representation', () => {
      expect(String(Navigation)).toBe('[Navigation]');
    });
  });

});

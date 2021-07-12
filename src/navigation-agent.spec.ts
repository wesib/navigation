import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CxBuilder, cxConstAsset } from '@proc7ts/context-builder';
import { CxReferenceError } from '@proc7ts/context-values';
import { noop } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { Mock } from 'jest-mock';
import { Navigation } from './navigation';
import { NavigationAgent } from './navigation-agent';
import { Page } from './page';
import { testPageParam } from './spec/test-page-param';

describe('NavigationAgent', () => {

  let cxBuilder: CxBuilder;
  let agent: NavigationAgent;

  beforeEach(() => {
    cxBuilder = new CxBuilder(get => ({ get }));
    agent = cxBuilder.get(NavigationAgent);
  });

  let mockNavigate: Mock<void, [Navigation.Target?]>;
  let when: 'pre-open' | 'pre-replace';
  let from: Page;
  let to: Page;

  beforeEach(() => {
    mockNavigate = jest.fn();
    when = 'pre-open';
    from = {
      visited: true,
      current: true,
      url: new URL('http://localhost/index'),
      data: 'initial',
      get: noop,
      put: noop,
    };
    to = {
      visited: false,
      current: true,
      url: new URL('http://localhost/other'),
      data: 'updated',
      title: 'New title',
      get: jest.fn(),
      put: jest.fn(),
    };
  });

  beforeEach(() => {
    Supply.onUnexpectedAbort(noop);
  });
  afterEach(() => {
    Supply.onUnexpectedAbort();
  });

  it('performs navigation without agents', () => {
    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.objectContaining({ href: to.url.href }),
      get: expect.any(Function),
    }));
  });
  it('returns `null` fallback without agents', () => {
    expect(cxBuilder.get(NavigationAgent, { or: null })).toBeNull();
  });
  it('performs navigation without agents by fallback one', () => {
    cxBuilder = new CxBuilder(get => ({ get }));

    const mockAgent = jest.fn();

    agent = cxBuilder.get(NavigationAgent, { or: mockAgent });
    agent(mockNavigate, when, from, to);
    expect(mockAgent).toHaveBeenCalledWith(mockNavigate, when, from, to);
  });
  it('calls the registered agent', () => {

    const mockAgent = jest.fn(
        (
            next: (target?: Navigation.URLTarget) => void,
            _when: string,
            _from: Page,
            _to: Page,
        ) => next(),
    );

    cxBuilder.provide(cxConstAsset(NavigationAgent, mockAgent));

    agent(mockNavigate, when, from, to);
    expect(mockAgent).toHaveBeenCalledWith(expect.any(Function), when, from, to);
  });
  it('performs navigation by calling `next`', () => {
    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next()));

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates URL', () => {
    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next({ url: new URL('http://localhost/other') })));

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      url: new URL('http://localhost/other'),
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates URL using path', () => {
    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next({ url: 'other' })));

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      url: new URL('http://localhost/other'),
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates title', () => {
    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next({ title: 'other title' })));

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      title: 'other title',
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates data', () => {
    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next({ data: 'other data' })));

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      data: 'other data',
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('accesses page parameters', () => {

    const [param] = testPageParam();

    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next()));
    cxBuilder.provide(cxConstAsset(NavigationAgent, (next, _when, _from, toPage) => {
      toPage.get(param);
      return next();
    }));

    agent(mockNavigate, when, from, to);
    expect(to.get).toHaveBeenCalledWith(param);
  });
  it('updates page parameters', () => {

    const [param] = testPageParam();

    cxBuilder.provide(cxConstAsset(NavigationAgent, next => next()));
    cxBuilder.provide(cxConstAsset(NavigationAgent, (next, _when, _from, toPage) => {
      toPage.put(param, 'test');
      return next();
    }));

    agent(mockNavigate, when, from, to);
    expect(to.put).toHaveBeenCalledWith(param, 'test');
  });
  it('throws when context destroyed', () => {

    const reason = new Error('reason');

    cxBuilder.supply.off(reason);
    expect(() => agent(mockNavigate, when, from, to)).toThrow(new CxReferenceError(
        NavigationAgent,
        'The [NavigationAgent] is no longer available',
        reason,
    ));
  });
});

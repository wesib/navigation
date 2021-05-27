import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ContextRegistry, ContextSupply } from '@proc7ts/context-values';
import { noop } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { Mock } from 'jest-mock';
import { Navigation } from './navigation';
import { NavigationAgent } from './navigation-agent';
import { Page } from './page';
import { testPageParam } from './spec/test-page-param';

describe('NavigationAgent', () => {

  let registry: ContextRegistry;
  let agent: NavigationAgent;

  beforeEach(() => {
    registry = new ContextRegistry();

    const values = registry.newValues();

    agent = values.get(NavigationAgent);
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

  it('performs navigation without agents', () => {
    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.objectContaining({ href: to.url.href }),
      get: expect.any(Function),
    }));
  });
  it('performs navigation without agents with `null` fallback value', () => {
    agent = registry.newValues().get(NavigationAgent, { or: null })!;
    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith(to);
  });
  it('performs navigation without agents by fallback one', () => {

    const mockAgent = jest.fn();

    agent = registry.newValues().get(NavigationAgent, { or: mockAgent });
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

    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: mockAgent,
    });

    agent(mockNavigate, when, from, to);
    expect(mockAgent).toHaveBeenCalledWith(expect.any(Function), when, from, to);
  });
  it('performs navigation by calling `next`', () => {
    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next(),
    });

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates URL', () => {
    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next({ url: new URL('http://localhost/other') }),
    });

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      url: new URL('http://localhost/other'),
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates URL using path', () => {
    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next({ url: 'other' }),
    });

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      url: new URL('http://localhost/other'),
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates title', () => {
    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next({ title: 'other title' }),
    });

    agent(mockNavigate, when, from, to);
    expect(mockNavigate).toHaveBeenCalledWith({
      ...to,
      title: 'other title',
      get: expect.any(Function),
      put: expect.any(Function),
    });
  });
  it('updates data', () => {
    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next({ data: 'other data' }),
    });

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

    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next(),
    });
    registry.provide({
      a: NavigationAgent,
      is: (next, _when, _from, toPage) => {
        toPage.get(param);
        return next();
      },
    });

    agent(mockNavigate, when, from, to);
    expect(to.get).toHaveBeenCalledWith(param);
  });
  it('updates page parameters', () => {

    const [param] = testPageParam();

    registry.provide<NavigationAgent, []>({
      a: NavigationAgent,
      is: next => next(),
    });
    registry.provide({
      a: NavigationAgent,
      is: (next, _when, _from, toPage) => {
        toPage.put(param, 'test');
        return next();
      },
    });

    agent(mockNavigate, when, from, to);
    expect(to.put).toHaveBeenCalledWith(param, 'test');
  });
  it('throws when context destroyed', () => {

    const contextSupply = new Supply();

    registry.provide({ a: ContextSupply, is: contextSupply });

    const values = registry.newValues();

    agent = values.get(NavigationAgent);

    const reason = new Error('reason');

    contextSupply.off(reason);
    expect(() => agent(mockNavigate, when, from, to)).toThrow(reason);
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ContextRegistry } from '@proc7ts/context-values';
import { EventEmitter, onceOn, OnEvent, onSupplied } from '@proc7ts/fun-events';
import { Mock } from 'jest-mock';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadResponse } from './page-load-response';

describe('PageLoadAgent', () => {

  let registry: ContextRegistry;
  let agent: PageLoadAgent;

  beforeEach(() => {
    registry = new ContextRegistry();

    const values = registry.newValues();

    agent = values.get(PageLoadAgent);
  });

  let request: Request;
  let mockLoad: Mock<OnEvent<[PageLoadResponse]>, [Request?]>;
  let emitter: EventEmitter<[PageLoadResponse]>;

  beforeEach(() => {
    request = new Request('http://localhost/test');
    emitter = new EventEmitter();
    mockLoad = jest.fn((_request?: Request) => emitter.on);
  });

  it('performs the load without agents registered', () => {
    expect(agent(mockLoad, request)).toBe(emitter.on);
    expect(mockLoad).toHaveBeenCalledWith(request);
  });
  it('performs the load without agents registered and with `null` fallback value', () => {
    agent = registry.newValues().get(PageLoadAgent, { or: null })!;
    expect(agent(mockLoad, request)).toBe(emitter.on);
    expect(mockLoad).toHaveBeenCalledWith(request);
  });
  it('calls the registered agent', async () => {

    const emitter2 = new EventEmitter<[PageLoadResponse]>();
    const mockAgent = jest.fn(() => emitter2.on);

    registry.provide({ a: PageLoadAgent, is: mockAgent });

    const response1 = { name: 'document1' } as any;
    const response2 = { name: 'document2' } as any;
    const response = await new Promise<PageLoadResponse>(resolve => {
      onSupplied(agent(mockLoad, request)).do(onceOn)(resolve);
      emitter.send(response1);
      emitter2.send(response2);
    });

    expect(response).toBe(response2);
  });
  it('performs the load by calling `next`', () => {
    registry.provide<PageLoadAgent, []>({
      a: PageLoadAgent,
      is: next => next(),
    });

    expect(agent(mockLoad, request)).toBe(emitter.on);
    expect(mockLoad).toHaveBeenCalledWith(request);
  });
  it('calls the next agent in chain by calling `next`', () => {

    const mockAgent: Mock<ReturnType<PageLoadAgent>, Parameters<PageLoadAgent>> = jest.fn(
        (next, _request) => next(),
    );

    registry.provide<PageLoadAgent, []>({
      a: PageLoadAgent,
      is: next => next(),
    });
    registry.provide<PageLoadAgent, []>({
      a: PageLoadAgent,
      is: mockAgent,
    });

    expect(agent(mockLoad, request)).toBe(emitter.on);
    expect(mockAgent).toHaveBeenCalledWith(expect.any(Function), request);
    expect(mockLoad).toHaveBeenCalledWith(request);
  });
});

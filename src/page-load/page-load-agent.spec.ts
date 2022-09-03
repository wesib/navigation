import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CxBuilder, cxConstAsset } from '@proc7ts/context-builder';
import { EventEmitter, onceOn, OnEvent, onSupplied } from '@proc7ts/fun-events';
import { Mock } from 'jest-mock';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadResponse } from './page-load-response';

describe('PageLoadAgent', () => {
  let cxBuilder: CxBuilder;
  let agent: PageLoadAgent;

  beforeEach(() => {
    cxBuilder = new CxBuilder(get => ({ get }));
    agent = cxBuilder.get(PageLoadAgent);
  });

  let request: Request;
  let mockLoad: Mock<(request?: Request) => OnEvent<[PageLoadResponse]>>;
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
  it('returns `null` fallback value without agents', () => {
    expect(cxBuilder.get(PageLoadAgent, { or: null })).toBeNull();
  });
  it('calls the registered agent', async () => {
    const emitter2 = new EventEmitter<[PageLoadResponse]>();
    const mockAgent = jest.fn(() => emitter2.on);

    cxBuilder.provide(cxConstAsset(PageLoadAgent, mockAgent));

    const response1 = { name: 'document1' } as unknown as PageLoadResponse;
    const response2 = { name: 'document2' } as unknown as PageLoadResponse;
    const response = await new Promise<PageLoadResponse>(resolve => {
      onSupplied(agent(mockLoad, request)).do(onceOn)(resolve);
      emitter.send(response1);
      emitter2.send(response2);
    });

    expect(response).toBe(response2);
  });
  it('performs the load by calling `next`', () => {
    cxBuilder.provide(cxConstAsset(PageLoadAgent, next => next()));

    expect(agent(mockLoad, request)).toBe(emitter.on);
    expect(mockLoad).toHaveBeenCalledWith(request);
  });
  it('calls the next agent in chain by calling `next`', () => {
    const mockAgent: Mock<PageLoadAgent> = jest.fn((next, _request) => next());

    cxBuilder.provide(cxConstAsset(PageLoadAgent, next => next()));
    cxBuilder.provide(cxConstAsset(PageLoadAgent, mockAgent));

    expect(agent(mockLoad, request)).toBe(emitter.on);
    expect(mockAgent).toHaveBeenCalledWith(expect.any(Function), request);
    expect(mockLoad).toHaveBeenCalledWith(request);
  });

  describe('toString', () => {
    it('provides string representation', () => {
      expect(String(PageLoadAgent)).toBe('[PageLoadAgent]');
    });
  });
});

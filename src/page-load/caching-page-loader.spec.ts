import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter, onEventBy } from '@proc7ts/fun-events';
import { Mock } from 'jest-mock';
import { Page } from '../page';
import { cachingPageLoader } from './caching-page-loader.impl';
import { PageLoadResponse } from './page-load-response';
import { PageLoader } from './page-loader.impl';

describe('cachingPageLoader', () => {

  let responder: EventEmitter<[PageLoadResponse]>;
  let mockLoader: Mock<PageLoader>;
  let caching: PageLoader;
  let page: Page;
  let page2: Page;
  let mockReceiver: Mock<(response: PageLoadResponse) => void>;
  let mockReceiver2: Mock<(response: PageLoadResponse) => void>;
  let received: PageLoadResponse;

  beforeEach(() => {
    responder = new EventEmitter();
    mockLoader = jest.fn(_page => responder.on);
    caching = cachingPageLoader(mockLoader);
    page = { url: new URL('http://localhost/page?p=1#test') } as Page;
    page2 = { url: new URL('http://localhost/page2?p=1#test') } as Page;
    mockReceiver = jest.fn(r => { received = r; });
    mockReceiver2 = jest.fn();
  });

  it('loads page', () => {
    caching(page)(mockReceiver);

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(received).toBe(response);
    expect(mockReceiver).toHaveBeenCalledTimes(1);
  });
  it('reports page load progress', () => {
    caching(page)(mockReceiver);

    const response1 = { ok: undefined, page } as PageLoadResponse;
    const response2 = { ok: true, page } as PageLoadResponse;

    responder.send(response1);
    responder.send(response2);
    expect(mockReceiver).toHaveBeenCalledWith(response1);
    expect(mockReceiver).toHaveBeenLastCalledWith(response2);
    expect(mockReceiver).toHaveBeenCalledTimes(2);
  });
  it('receives the same response for the same page', () => {
    caching(page)(mockReceiver);
    caching(page)(mockReceiver2);

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(mockReceiver2).toHaveBeenCalledWith(response);
    expect(mockReceiver).toHaveBeenCalledTimes(1);
    expect(mockReceiver2).toHaveBeenCalledTimes(1);
  });
  it('receives the same response for the page with different hash', () => {
    caching(page)(mockReceiver);
    caching({ url: new URL('#other', page.url) } as Page)(mockReceiver2);

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    expect(mockReceiver2).toHaveBeenCalledWith(response);
    expect(mockReceiver).toHaveBeenCalledTimes(1);
    expect(mockReceiver2).toHaveBeenCalledTimes(1);
  });
  it('receives the same response for the same already loaded page', () => {
    caching(page)(mockReceiver);

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);
    caching(page)(mockReceiver2);
    expect(mockReceiver2).toHaveBeenCalledWith(response);
    expect(mockReceiver).toHaveBeenCalledTimes(1);
    expect(mockReceiver2).toHaveBeenCalledTimes(1);
  });
  it('aborts previous page load when another one requested', () => {

    const done1 = jest.fn();

    caching(page)(mockReceiver).whenOff(done1);
    caching(page2)(mockReceiver2);

    expect(done1).toHaveBeenCalled();

    const response = { ok: true, page: page2 } as PageLoadResponse;

    responder.send(response);
    expect(mockReceiver).not.toHaveBeenCalled();
    expect(mockReceiver2).toHaveBeenCalledWith(response);
    expect(mockReceiver2).toHaveBeenCalledTimes(1);
  });
  it('aborts page load when all supplies cut off', async () => {

    const loadDone = jest.fn();

    mockLoader.mockImplementation(
        () => onEventBy(receiver => responder.on(receiver).whenOff(loadDone)),
    );

    const supply1 = caching(page)(mockReceiver);
    const supply2 = caching(page)(mockReceiver2);

    supply1.off(1);
    await Promise.resolve();
    expect(loadDone).not.toHaveBeenCalled();
    supply2.off(2);
    await Promise.resolve();
    expect(loadDone).toHaveBeenCalledWith(2);
  });
  it('allows the same page load right after all supplies cut off', async () => {

    const loadDone = jest.fn();

    mockLoader.mockImplementation(
        () => onEventBy(receiver => responder.on(receiver).whenOff(loadDone)),
    );

    const supply1 = caching(page)(mockReceiver);

    supply1.off(1);

    const supply2 = caching(page)(mockReceiver2);

    await Promise.resolve();
    expect(loadDone).not.toHaveBeenCalled();
    expect(supply2.isOff).toBe(false);

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);

    expect(mockReceiver).not.toHaveBeenCalled();
    expect(mockReceiver2).toHaveBeenCalledWith(response);
    expect(mockLoader).toHaveBeenCalledTimes(1);
  });
  it('reloads the same page after all supplies cut off and timeout passed', async () => {

    const loadDone = jest.fn();

    mockLoader.mockImplementation(
        () => onEventBy(receiver => responder.on(receiver).whenOff(loadDone)),
    );

    const supply1 = caching(page)(mockReceiver);

    supply1.off(1);
    await Promise.resolve();
    expect(loadDone).toHaveBeenCalledWith(1);

    const supply2 = caching(page)(mockReceiver2);

    expect(supply2.isOff).toBe(false);

    const response = { ok: true, page } as PageLoadResponse;

    responder.send(response);

    expect(mockReceiver).not.toHaveBeenCalled();
    expect(mockReceiver2).toHaveBeenCalledWith(response);
    expect(mockLoader).toHaveBeenCalledTimes(2);
  });
});

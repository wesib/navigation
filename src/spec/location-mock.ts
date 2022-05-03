import { expect, jest } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import { BootstrapWindow } from '@wesib/wesib';
import { Mock } from 'jest-mock';
import { NAV_DATA_KEY, NavDataEnvelope, PartialNavData } from '../nav-history.impl';
import { MockObject } from './mock-object';

export class LocationMock {

  readonly location: MockObject<Location>;
  readonly href: Mock<() => string>;
  readonly history: MockObject<History>;
  readonly historyLength: Mock<() => number>;
  readonly state: Mock<() => string>;
  readonly baseURI: Mock<() => string>;
  readonly window: MockObject<BootstrapWindow>;
  readonly down: () => void;
  private _index = 0;
  private readonly stateData: [URL, any][];

  constructor(
      {
        doc,
        win,
      }: {
        doc?: Document | undefined;
        win?: BootstrapWindow | undefined;
      } = {},
  ) {

    let mockWindow: MockObject<Window> | undefined;
    let down: () => void = noop;

    if (!win) {

      const eventTarget = document.body.appendChild(document.createElement('div'));

      mockWindow = win = {
        addEventListener: eventTarget.addEventListener.bind(eventTarget),
        removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
        dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
      } as any;

      down = () => {
        eventTarget.remove();
      };
    } else {
      mockWindow = undefined;
    }

    const self = this;

    this.stateData = [[new URL('http://localhost/index'), 'initial']];

    this.href = jest.fn(() => this.currentURL.href);
    this.location = {
      get href() {
        return self.href();
      },
    } as any;
    this.state = jest.fn(() => this.currentState);
    this.historyLength = jest.fn(() => this.stateData.length);
    this.history = {
      get length() {
        return self.historyLength();
      },
      get state() {
        return self.state();
      },
      go: jest.fn((delta: number = 1 - 1) => {

        const oldIndex = this._index;

        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        this._index = Math.max(0, Math.min(this.stateData.length - 1, oldIndex + delta));
        if (oldIndex !== this._index) {
          this.window.dispatchEvent(new PopStateEvent('popstate', { state: this.state() }));
        }
      }),
      pushState: jest.fn((newState, _title, url?: string) => {
        this.stateData[++this._index] = [url != null ? new URL(url, this.baseURI()) : this.currentURL, newState];
        this.stateData.length = this._index + 1;
      }),
      replaceState: jest.fn((newState, _title, url?: string) => {
        this.stateData[this._index] = [url != null ? new URL(url, this.baseURI()) : this.currentURL, newState];
      }),
    } as any;
    this.baseURI = jest.fn(() => 'http://localhost');

    if (mockWindow) {
      this.window = {
        location: this.location,
        history: this.history,
        addEventListener: jest.spyOn(mockWindow, 'addEventListener'),
        removeEventListener: jest.spyOn(mockWindow, 'removeEventListener'),
        dispatchEvent: jest.spyOn(mockWindow, 'dispatchEvent'),
        document: doc || {
          get baseURI() {
            return self.baseURI();
          },
        },
      } as any;
    } else {
      this.window = win as MockObject<BootstrapWindow>;

      const locationSpy = jest.spyOn(this.window, 'location', 'get').mockImplementation(() => this.location);
      const historySpy = jest.spyOn(this.window, 'history', 'get').mockImplementation(() => this.history);

      down = () => {
        locationSpy.mockReset();
        historySpy.mockReset();
      };
    }

    this.down = down;
  }

  get currentURL(): URL {
    return this.stateData[this._index][0];
  }

  get currentState(): any {
    return this.getState(this._index);
  }

  getState(index: number): any {
    return this.stateData[index][1];
  }

  setState(index: number, state: any): void {
    this.stateData[index][1] = state;
  }

  enter(hash: string, events: readonly ('hashchange' | 'popstate')[] = ['hashchange', 'popstate']): void {

    const oldURL = this.currentURL;
    const newURL = new URL(hash, oldURL);

    this.stateData[++this._index] = [newURL, null];
    this.stateData.length = this._index + 1;
    for (const event of events) {
      switch (event) {
      case 'popstate':
        this.window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

        break;
      case 'hashchange':
        this.window.dispatchEvent(new HashChangeEvent('hashchange', { newURL: newURL.href, oldURL: oldURL.href }));

        break;
      }
    }
  }

}

export function navHistoryState(
    {
      id = expect.anything() as any,
      uid = expect.anything() as any,
      data,
    }: Partial<PartialNavData>,
): NavDataEnvelope {
  return {
    [NAV_DATA_KEY]: {
      uid,
      id,
      data,
    },
  };
}

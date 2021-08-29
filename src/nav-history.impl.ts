import { CxEntry, cxScoped, cxSingle } from '@proc7ts/context-values';
import { ValueTracker } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { itsEach } from '@proc7ts/push-iterator';
import { BootstrapContext, BootstrapWindow } from '@wesib/wesib';
import { Navigation } from './navigation';
import { Page } from './page';
import { PageParam, PageParam__symbol } from './page-param';

export const NAV_DATA_KEY = 'wesib:navigation:data' as const;

export interface PartialNavData {
  readonly uid?: string | undefined;
  readonly id?: number | undefined;
  readonly data: any | undefined;
}

export interface NavData extends PartialNavData {
  readonly uid: string;
  readonly id: number;
}

export interface NavDataEnvelope {
  readonly [NAV_DATA_KEY]: NavData;
}

function extractNavData(state: any): PartialNavData {
  return state == null || typeof state !== 'object'
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ? { data: state }
      : (state as NavDataEnvelope)[NAV_DATA_KEY] as PartialNavData;
}

const NavHistory$perContext: CxEntry.Definer<NavHistory> = (/*#__PURE__*/ cxScoped(
    BootstrapContext,
    (/*#__PURE__*/ cxSingle({
      byDefault: target => new NavHistory(target.get(BootstrapContext)),
    })),
));

export class NavHistory {

  static perContext(target: CxEntry.Target<NavHistory>): CxEntry.Definition<NavHistory> {
    return NavHistory$perContext(target);
  }

  static toString(): string {
    return '[NavHistory]';
  }

  private readonly _document: Document;
  private readonly _location: Location;
  private readonly _history: History;
  private readonly _entries = new Map<number, PageEntry>();
  private readonly _uid: string;
  private _lastId = 0;

  constructor(private readonly _context: BootstrapContext) {

    const window = _context.get(BootstrapWindow);

    this._document = window.document;
    this._location = window.location;
    this._history = window.history;
    this._uid = btoa(String(Math.random()));
  }

  init(): PageEntry {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { data } = extractNavData(this._history.state);
    const entry = this.newEntry({
      url: new URL(this._location.href),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
      title: this._document.title,
    });

    this._entries.set(entry.id, entry);
    entry.schedule(() => {
      entry.enter('init');
      this._history.replaceState(this._historyState(entry), '');
    });

    return entry;
  }

  newEntry(target: Navigation.URLTarget): PageEntry {
    return new PageEntry(this._context, ++this._lastId, target);
  }

  open(
      toEntry: PageEntry,
      tracker: ValueTracker<PageEntry>,
  ): void {

    const { page: { title = '', url } } = toEntry;

    this._history.pushState(
        this._historyState(toEntry),
        title,
        url.href,
    );

    this._enter('open', toEntry, tracker);
  }

  private _enter(
      when: 'open' | 'enter',
      toEntry: PageEntry,
      tracker: ValueTracker<PageEntry>,
  ): void {

    const fromEntry = tracker.it;

    this._entries.set(toEntry.id, toEntry);

    try {
      // Forget all entries starting from next one
      for (let e = fromEntry.next; e; e = e.next) {
        this._forget(e);
      }
    } finally {
      toEntry.prev = fromEntry;
      fromEntry.next = toEntry;
      toEntry.schedule(() => {
        try {
          fromEntry.leave();
        } finally {
          toEntry.enter(when);
        }
      });
      tracker.it = toEntry;
    }
  }

  replace(
      toEntry: PageEntry,
      tracker: ValueTracker<PageEntry>,
  ): void {

    const fromEntry = tracker.it;
    const { page: { title = '', url } } = toEntry;

    this._history.replaceState(
        this._historyState(toEntry),
        title,
        url.href,
    );

    this._entries.set(toEntry.id, toEntry);

    const prev = fromEntry.prev;

    if (prev) {
      toEntry.prev = prev;
      prev.next = toEntry;
    }

    toEntry.schedule(() => {
      try {
        fromEntry.leave();
      } finally {
        try {
          this._forget(fromEntry);
        } finally {
          toEntry.enter('replace');
        }
      }
    });
    tracker.it = toEntry;
  }

  popState(
      popState: PopStateEvent,
      tracker: ValueTracker<PageEntry>,
  ): PageEntry | undefined {

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { state } = popState;

    if (state == null) {
      // Hash change
      if (this._history.state == null) {
        // Not a return
        return this._changeHash(tracker);
      }
      return; // Already handled by `hashchange` handler
    }

    const fromEntry = tracker.it;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { uid, data, id: pageId } = extractNavData(state);
    let toEntry: PageEntry;

    const existingEntry = uid === this._uid && pageId != null ? this._entries.get(pageId) : undefined;

    if (existingEntry) {
      toEntry = existingEntry;
    } else {
      // Returning to page existed in previous app version
      toEntry = this.newEntry({
        url: new URL(this._location.href),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data,
        title: this._document.title,
      });
      fromEntry.transfer(toEntry, 'return');
      this._entries.set(toEntry.id, toEntry);
      this._history.replaceState(this._historyState(toEntry), '');
    }

    toEntry.schedule(() => {
      try {
        fromEntry.leave();
      } finally {
        toEntry.enter('return');
      }
    });

    tracker.it = toEntry;

    return toEntry;
  }

  public hashChange(tracker: ValueTracker<PageEntry>): PageEntry | void {
    if (this._history.state == null) {
      // Not a return
      return this._changeHash(tracker);
    }
    // Otherwise, a `popstate` event is also triggered,
    // and its handler would do the job (or already did).
  }

  public update(tracker: ValueTracker<PageEntry>, url: URL): PageEntry {

    const oldEntry = tracker.it;
    const newEntry = new PageEntry(this._context, ++this._lastId, { ...oldEntry.page, url }, oldEntry);

    this._entries.set(newEntry.id, newEntry);
    this._history.replaceState(this._historyState(newEntry), '', url.href);
    this._entries.delete(oldEntry.id);

    return tracker.it = newEntry;
  }

  private _changeHash(tracker: ValueTracker<PageEntry>): PageEntry {

    const fromEntry = tracker.it;
    const toEntry = this.newEntry({
      url: new URL(this._location.href),
      data: null,
      title: this._document.title,
    });

    try {
      fromEntry.transfer(toEntry, 'enter');
    } finally {
      this._history.replaceState(this._historyState(toEntry), '');
      this._enter('enter', toEntry, tracker);
    }

    return toEntry;
  }

  private _forget(entry: PageEntry): void {
    this._entries.delete(entry.id);
    entry.forget();
  }

  private _historyState({ id, page: { data } }: PageEntry): NavDataEnvelope {
    return {
      [NAV_DATA_KEY]: {
        uid: this._uid,
        id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data,
      },
    };
  }

}

const enum PageStatus {
  New,
  Visited,
  Current,
}

/**
 * @internal
 */
export class PageEntry {

  next?: PageEntry | undefined;
  prev?: PageEntry | undefined;
  private _status: PageStatus = PageStatus.New;
  readonly page: Page;
  private readonly _params: Map<PageParam<any, any>, PageParam.Handle<any, any>>;
  private _update: () => void = noop;

  constructor(
      private readonly _bsContext: BootstrapContext,
      readonly id: number,
      target: Navigation.URLTarget,
      proto?: PageEntry,
  ) {
    this._params = proto ? proto._params : new Map<PageParam<any, any>, PageParam.Handle<any, any>>();

    const entry = this;

    this.page = {
      get url() {
        return target.url;
      },
      get title() {
        return target.title;
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      get data(): any {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return target.data;
      },
      get visited() {
        return !!entry._status;
      },
      get current() {
        return entry._status === PageStatus.Current;
      },
      get<T>(ref: PageParam.Ref<T, unknown>): T | undefined {
        return entry.get(ref);
      },
      put(ref, input) {
        entry.put(ref, input);
      },
    };
  }

  get<T>(ref: PageParam.Ref<T, unknown>): T | undefined {

    const param = ref[PageParam__symbol];
    const handle: PageParam.Handle<T, unknown> | undefined = this._params.get(param);

    if (handle) {
      return handle.get();
    }

    const newHandle = param.byDefault(this.page, this._bsContext);

    return newHandle && this._init(param, newHandle);
  }

  put<T, TInput>(ref: PageParam.Ref<T, TInput>, input: TInput): T {

    const param = ref[PageParam__symbol];
    const handle: PageParam.Handle<T, TInput> | undefined = this._params.get(param);

    if (handle) {
      handle.put(input);
      return handle.get();
    }

    return this._init(param, param.create(this.page, input, this._bsContext));
  }

  private _init<T, TInput>(param: PageParam<T, TInput>, handle: PageParam.Handle<T, TInput>): T {
    this._params.set(param, handle);

    if (this.page.current && handle.enter) {
      handle.enter(this.page, 'init');
    }

    return handle.get();
  }

  transfer(to: PageEntry, when: 'pretend' | 'pre-open' | 'pre-replace' | 'enter' | 'return'): void {
    itsEach(this._params.entries(), ([param, handle]) => {
      if (handle.transfer) {

        const transferred = handle.transfer(to.page, when);

        if (transferred) {
          to._params.set(param, transferred);
        }
      }
    });
  }

  stay(at: Page): void {
    itsEach(this._params.values(), handle => handle.stay && handle.stay(at));
  }

  enter(when: 'init' | 'open' | 'replace' | 'enter' | 'return'): void {
    this._status = PageStatus.Current;
    itsEach(this._params.values(), handle => handle.enter && handle.enter(this.page, when));
  }

  leave(): void {
    this._status = PageStatus.Visited;
    itsEach(this._params.values(), handle => handle.leave && handle.leave());
  }

  forget(): void {
    itsEach(this._params.values(), handle => handle.forget && handle.forget());
    this._params.clear();
  }

  schedule(update: () => void): void {
    this._update = update;
  }

  apply(): void {

    const update = this._update;

    this._update = noop;
    update();
  }

}

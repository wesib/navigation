import { DomEventDispatcher, OnDomEvent } from '@frontmeans/dom-events';
import { CxEntry, cxScoped, cxSingle } from '@proc7ts/context-values';
import {
  AfterEvent,
  AfterEvent__symbol,
  EventKeeper,
  EventSender,
  mapAfter,
  onAny,
  OnEvent,
  OnEvent__symbol,
  onSupplied,
  trackValue,
} from '@proc7ts/fun-events';
import { mergeFunctions, noop } from '@proc7ts/primitives';
import { BootstrapContext, BootstrapWindow } from '@wesib/wesib';
import { NavHistory, PageEntry } from './nav-history.impl';
import { NavigationAgent } from './navigation-agent';
import {
  EnterPageEvent,
  LeavePageEvent,
  NavigationEvent,
  NavigationEventType,
  StayOnPageEvent,
} from './navigation.event';
import { Page } from './page';
import { PageParam } from './page-param';

const Navigation$perContext: CxEntry.Definer<Navigation> = (/*#__PURE__*/ cxScoped(
    BootstrapContext,
    (/*#__PURE__*/ cxSingle({
      byDefault: Navigation$byDefault,
    })),
));

/**
 * Browser navigation service.
 *
 * Expected to be used as a [History] and [Location] APIs replacement.
 *
 * Fires additional navigation events the browser does not support natively.
 *
 * Implements an `EventSender` interface by sending {@link NavigationEvent navigation events} to registered receivers.
 *
 * Implements an `EventKeeper` interface by sending current {@link Page page} to registered receivers.
 *
 * Available as bootstrap context value.
 *
 * [History]: https://developer.mozilla.org/en-US/docs/Web/API/History
 * [Location]: https://developer.mozilla.org/en-US/docs/Web/API/Location
 */
export abstract class Navigation implements EventSender<[NavigationEvent]>, EventKeeper<[Page]> {

  static perContext(target: CxEntry.Target<Navigation>): CxEntry.Definition<Navigation> {
    return Navigation$perContext(target);
  }

  static toString(): string {
    return '[Navigation]';
  }

  /**
   * Current page.
   */
  abstract readonly page: Page;

  /**
   * The number of element in navigation history.
   */
  abstract readonly length: number;

  /**
   * An `OnDomEvent` sender of {@link EnterPageEvent enter page events}.
   */
  abstract readonly onEnter: OnDomEvent<EnterPageEvent>;

  /**
   * An `OnDomEvent` sender of {@link LeavePageEvent leave page events}.
   *
   * The registered listener may cancel navigation by calling `preventDefault()` method of received event.
   */
  abstract readonly onLeave: OnDomEvent<LeavePageEvent>;

  /**
   * An `OnDomEvent` {@link StayOnPageEvent stay on page events}.
   *
   * The registered listener is informed when navigation has been cancelled by one of leave page event receivers,
   * navigation failed due to e.g. invalid URL, or when another navigation request initiated before the page left.
   *
   * @returns `OnDomEvent` sender of {@link StayOnPageEvent stay on page events}.
   */
  abstract readonly onStay: OnDomEvent<StayOnPageEvent>;

  /**
   * An `OnEvent` sender of {@link NavigationEvent navigation events}.
   *
   * The `[OnEvent__symbol]` property is an alias of this one.
   */
  abstract readonly on: OnEvent<[NavigationEvent]>;

  [OnEvent__symbol](): OnEvent<[NavigationEvent]> {
    return this.on;
  }

  /**
   * An `AfterEvent` keeper of {@link page current page}.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[Page]>;

  [AfterEvent__symbol](): AfterEvent<[Page]> {
    return this.read;
  }

  /**
   * Goes to the previous page in navigation history.
   *
   * Calling this method is the same as calling `go(-1)`.
   */
  back(): void {
    this.go(-1);
  }

  /**
   * Goes to the next page in navigation history.
   *
   * Calling this method is the same as calling `go(1)`.
   */
  forward(): void {
    this.go(1);
  }

  /**
   * Loads a page from navigation history, identified by its relative location to the current page.
   *
   * For example `-1` navigates to previous page, while `1` navigates to the next one. If you specify an out-of-bounds
   * value (for instance, specifying -1 when there are no previously-visited pages in navigation history), this method
   * silently has no effect.
   *
   * @param delta - Relative location in navigation history to navigate to. The absent value or value of `0` reloads
   * the current page.
   */
  abstract go(delta?: number): void;

  /**
   * Reloads current page.
   *
   * Calling this method is the same as calling `go()`.
   */
  reload(): void {
    this.go();
  }

  /**
   * Opens a page by navigating to the given `target`.
   *
   * Appends an entry to navigation history.
   *
   * @param target - Either navigation target or URL to navigate to.
   * @fires PreNavigateEvent#wesib:preNavigate  On window object prior to actually navigate.
   * Then navigates to the `target`, unless the event cancelled.
   * @fires NavigateEvent@wesib:navigate  On window object when navigation succeed.
   *
   * @returns A promise resolved to navigated page, or to `null` otherwise.
   */
  abstract open(target: Navigation.Target | string | URL): Promise<Page | null>;

  /**
   * Replaces current navigation history entry with the given `target`.
   *
   * @param target - Either navigation target or URL to replace current history entry with.
   * @fires PreNavigateEvent#wesib:preNavigate  On window object prior to actually update the history.
   * Then navigates to the `target`, unless the event cancelled.
   * @fires NavigateEvent@wesib:navigate  On window object when history updated.
   *
   * @returns A promise resolved to navigated page, or to `null` otherwise.
   */
  abstract replace(target: Navigation.Target | string | URL): Promise<Page | null>;

  /**
   * Replaces current page URL with the given one.
   *
   * Does not alter current page state, and does not trigger any events.
   *
   * @param url - An URL to replace the the current one with.
   *
   * @returns Current page with updated URL.
   */
  abstract update(url: string | URL): Page;

  /**
   * Creates parameterized navigation instance and assigns a page parameter to apply to target page.
   *
   * @typeParam T - Parameter value type.
   * @typeParam TInput - Parameter input type.
   * @param ref - A reference to page navigation parameter to apply.
   * @param input - Parameter input to use when constructing its value.
   *
   * @returns New parameterized navigation instance.
   */
  abstract with<T, TInput>(ref: PageParam.Ref<T, TInput>, input: TInput): Navigation.Parameterized;

}

export namespace Navigation {

  /**
   * Parameterized navigation.
   *
   * Allows to assign target page parameters prior to navigating to it.
   */
  export interface Parameterized {

    /**
     * Applies parameter to navigation target page.
     *
     * @typeParam T - Parameter value type.
     * @typeParam TInput - Parameter input type.
     * @param ref - A reference to page navigation parameter to apply.
     * @param input - Parameter input to use when constructing its value.
     *
     * @returns New parameterized navigation instance.
     */
    with<T, TInput>(ref: PageParam.Ref<T, TInput>, input: TInput): Parameterized;

    /**
     * Opens a page by navigating to the given `target` with provided page parameters.
     *
     * Appends an entry to navigation history.
     *
     * @param target - Either navigation target or URL to navigate to. Navigates to current page URL when omitted.
     * @fires PreNavigateEvent#wesib:preNavigate  On window object prior to actually navigate.
     * Then navigates to the `target`, unless the event cancelled.
     * @fires NavigateEvent@wesib:navigate  On window object when navigation succeed.
     *
     * @returns A promise resolved to navigated page, or to `null` otherwise.
     */
    open(target?: Navigation.Target | string | URL): Promise<Page | null>;

    /**
     * Replaces the most recent entry in navigation history with the given `target` and provided page parameters.
     *
     * @param target - Either navigation target or URL to replace the latest history entry with. Navigates to current
     * page URL when omitted.
     * @fires PreNavigateEvent#wesib:preNavigate  On window object prior to actually update the history.
     * Then navigates to the `target`, unless the event cancelled.
     * @fires NavigateEvent@wesib:navigate  On window object when history updated.
     *
     * @returns A promise resolved to navigated page, or to `null` otherwise.
     */
    replace(target?: Navigation.Target | string | URL): Promise<Page | null>;

    /**
     * Pretends navigation.
     *
     * Prepares navigation and parameters, but does not actually navigate. Instead it calls the provided callback
     * function.
     *
     * This is useful e.g. to build target URL or evaluate target page parameter.
     *
     * @param target - Either navigation target or URL to pretend navigation to.
     * @param callback - A callback function receiving two pages as parameters: the page to leave, and the page to open.
     * The latter one is valid only inside callback, as its parameters will be cleaned up right after callback returns.
     * The value returned from callback is then returned from this method call. It may be used to collect some data
     * from target page.
     *
     * @returns Either the value returned by callback, or `undefined` when navigation failed.
     */
    pretend<T>(
        target: Navigation.Target | string | URL,
        callback: (this: void, from: Page, to: Page) => T,
    ): T | undefined;

    /**
     * Pretends navigation to the same page.
     *
     * Prepares navigation and parameters, but does not actually navigate. Instead it calls the provided callback
     * function.
     *
     * This is useful e.g. to build target URL or evaluate target page parameter.
     *
     * @param callback - A callback function receiving two pages as parameters: the page to leave, and the page to open.
     * The latter one is valid only inside callback, as its parameters will be cleaned up right after callback returns.
     * The value returned from callback is then returned from this method call. It may be used to collect some data
     * from target page.
     *
     * @returns Either the value returned by callback, or `undefined` when navigation failed.
     */
    pretend<T>(
        callback: (this: void, from: Page, to: Page) => T,
    ): T | undefined;

    /**
     * Pretends navigation and builds navigation target.
     *
     * Prepares navigation and parameters, but does not actually navigate. Instead it calls the provided callback
     * function.
     *
     * This is useful e.g. to build target URL or evaluate target page parameter.
     *
     * @param target - Either navigation target or URL to pretend navigation to. Prepends navigation to current page
     * when omitted.
     *
     * @returns Either Navigation target with URL value, or `undefined` when navigation failed.
     */
    pretend(
        target?: Navigation.Target | string | URL,
    ): URLTarget | undefined;

  }

  /**
   * Navigation target.
   *
   * This is passed to {@link Navigation.open} and {@link Navigation.replace} methods.
   */
  export interface Target {

    /**
     * A URL to update the browser location string to.
     */
    readonly url?: string | URL | undefined;

    /**
     * Opaque data to apply to session history. I.e. either push or replace.
     */
    readonly data?: unknown | undefined;

    /**
     * New window title.
     */
    readonly title?: string | undefined;

  }

  /**
   * Navigation target with URL value.
   */
  export interface URLTarget extends Target {

    readonly url: URL;

  }

}

function Navigation$byDefault(target: CxEntry.Target<Navigation>): Navigation {

  const window = target.get(BootstrapWindow);
  const { document, history } = window;
  const dispatcher = new DomEventDispatcher(window);
  const navHistory = target.get(NavHistory);
  const agent = target.get(NavigationAgent);
  const nav = trackValue<PageEntry>(navHistory.init());

  nav.read(nextEntry => nextEntry.apply()); // The very first page entry receiver applies scheduled updates to page

  let next: Promise<any> = Promise.resolve();

  dispatcher.on<PopStateEvent>('popstate')(popState => {

    const entry = navHistory.popState(popState, nav);

    if (entry) {
      dispatcher.dispatch(new EnterPageEvent(
          NavigationEventType.EnterPage,
          {
            when: popState.state != null ? 'return' : 'enter',
            to: entry.page,
          },
      ));
    }
  });

  dispatcher.on('hashchange')(() => {

    const entry = navHistory.hashChange(nav);

    if (entry) {
      dispatcher.dispatch(new EnterPageEvent(
          NavigationEventType.EnterPage,
          {
            when: 'enter',
            to: entry.page,
          },
      ));
    }
  });

  type NavTarget = { -readonly [K in keyof Navigation.URLTarget]: Navigation.URLTarget[K] };

  class Navigation$ extends Navigation {

    readonly onEnter: OnDomEvent<EnterPageEvent>;
    readonly onLeave: OnDomEvent<LeavePageEvent>;
    readonly onStay: OnDomEvent<StayOnPageEvent>;
    readonly on: OnEvent<[NavigationEvent]>;
    readonly read: AfterEvent<[Page]>;

    constructor() {
      super();
      this.onEnter = dispatcher.on<EnterPageEvent>(NavigationEventType.EnterPage);
      this.onLeave = dispatcher.on<LeavePageEvent>(NavigationEventType.LeavePage);
      this.onStay = dispatcher.on<StayOnPageEvent>(NavigationEventType.StayOnPage);
      this.on = onAny<[NavigationEvent]>(
          onSupplied(this.onEnter),
          onSupplied(this.onLeave),
          onSupplied(this.onStay),
      );
      this.read = nav.read.do(
          mapAfter(({ page }) => page),
      );
    }

    get page(): Page {
      return nav.it.page;
    }

    get length(): number {
      return history.length;
    }

    go(delta?: number): void {
      history.go(delta);
    }

    open(target: Navigation.Target | string | URL): Promise<Page | null> {
      return navigate('pre-open', 'open', target);
    }

    replace(target: Navigation.Target | string | URL): Promise<Page | null> {
      return navigate('pre-replace', 'replace', target);
    }

    update(url: string | URL): Page {
      return navHistory.update(nav, toURL(url)).page;
    }

    with<T, TInput>(ref: PageParam.Ref<T, TInput>, input: TInput): Navigation.Parameterized {
      return withParam(page => page.put(ref, input));
    }

  }

  return new Navigation$();

  function withParam(applyParams: (page: Page) => void): Navigation.Parameterized {
    return {
      with<T, TInput>(ref: PageParam.Ref<T, TInput>, input: TInput): Navigation.Parameterized {
        return withParam(mergeFunctions(applyParams, page => page.put(ref, input)));
      },
      open(target?: Navigation.Target | string | URL) {
        return navigate('pre-open', 'open', target, applyParams);
      },
      replace(target?: Navigation.Target | string | URL) {
        return navigate('pre-replace', 'replace', target, applyParams);
      },
      pretend<T>(
          targetOrCallback?: Navigation.Target | string | URL | ((this: void, from: Page, to: Page) => T),
          callback: (this: void, from: Page, to: Page) => T = (_from, to) => to as unknown as T,
      ): T | undefined {

        let target: Navigation.Target | string | URL | undefined;

        if (typeof targetOrCallback === 'function') {
          callback = targetOrCallback;
          target = undefined;
        } else {
          target = targetOrCallback;
        }

        const navTarget = navTargetOf(target);
        const fromEntry = nav.it;
        const toEntry = newEntry('pretend', fromEntry, navTarget, applyParams);

        try {
          return applyAgent('pretend', fromEntry, navTarget, toEntry)
              ? callback(fromEntry.page, toEntry.page)
              : undefined;
        } finally {
          toEntry.stay(nav.it.page);
        }
      },
    };
  }

  function toURL(url: string | URL | undefined): URL {
    if (typeof url === 'string') {
      return new URL(url, document.baseURI);
    }

    return url || nav.it.page.url;
  }

  function navTargetOf(target?: Navigation.Target | string | URL): NavTarget {
    if (target == null || typeof target === 'string' || target instanceof URL) {
      return { url: toURL(target) };
    }
    if (target.url instanceof URL) {
      return target as Navigation.URLTarget;
    }

    return { ...target, url: toURL(target.url) };
  }

  function navigate(
      whenLeave: 'pre-open' | 'pre-replace',
      when: 'open' | 'replace',
      target?: Navigation.Target | string | URL,
      applyParams: (page: Page) => void = noop,
  ): Promise<Page | null> {

    const navTarget = navTargetOf(target);
    const promise = next = next.then(doNavigate, doNavigate);

    return promise;

    function doNavigate(): Page | null {

      let toEntry: PageEntry | undefined = undefined;

      try {

        const prepared = prepare();

        if (!prepared) {
          return prepared; // Navigation cancelled
        }

        toEntry = prepared;
        navHistory[when](toEntry, nav);
        dispatcher.dispatch(new EnterPageEvent(
            NavigationEventType.EnterPage,
            {
              when,
              to: toEntry.page,
            },
        ));

        return toEntry.page;
      } catch (e) {
        stay(toEntry, e);
        throw e;
      }
    }

    function prepare(): PageEntry | null {
      if (next !== promise) {
        return stay();
      }

      const fromEntry = nav.it;
      const toEntry = newEntry(whenLeave, fromEntry, navTarget, applyParams);
      const leavePage = new LeavePageEvent(
          NavigationEventType.LeavePage,
          {
            when: whenLeave,
            from: fromEntry.page,
            to: toEntry.page,
          },
      );

      if (!dispatcher.dispatch(leavePage)
          || next !== promise
          || !applyAgent(whenLeave, fromEntry, navTarget, toEntry)) {
        return stay(toEntry);
      }

      return toEntry;
    }

    function stay(toEntry?: PageEntry, reason?: unknown): null {
      if (toEntry) {
        toEntry.stay(nav.it.page);
      }

      dispatcher.dispatch(new StayOnPageEvent(
          NavigationEventType.StayOnPage,
          {
            from: nav.it.page,
            to: navTarget,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            reason,
          },
      ));

      return null;
    }

  }

  function newEntry(
      whenLeave: 'pretend' | 'pre-open' | 'pre-replace',
      fromEntry: PageEntry,
      navTarget: NavTarget,
      applyParams: (page: Page) => void,
  ): PageEntry {

    const toEntry = navHistory.newEntry(navTarget);

    try {
      fromEntry.transfer(toEntry, whenLeave);
      applyParams(toEntry.page);
    } catch (e) {
      toEntry.stay(nav.it.page);
      throw e;
    }

    return toEntry;
  }

  function applyAgent(
      whenLeave: 'pretend' | 'pre-open' | 'pre-replace',
      fromEntry: PageEntry,
      navTarget: NavTarget,
      toEntry: PageEntry,
  ): boolean {

    let navigated = false;

    agent(
        ({ url, data, title }) => {
          navigated = true;
          navTarget.url = url;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          navTarget.data = data;
          navTarget.title = title;
        },
        whenLeave,
        fromEntry.page,
        toEntry.page,
    );

    return navigated;
  }

}

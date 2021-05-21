import { ContextUpRef, FnContextKey } from '@proc7ts/context-values/updatable';
import { noop, valueProvider } from '@proc7ts/primitives';

/**
 * A signature of page load URL modifier function.
 *
 * All such functions registered in bootstrap context are called in order of their registration with current page URL.
 * They are able to modify it, e.g. by applying additional URL search parameters. The modified URL is used then to load
 * the page.
 */
export type PageLoadURLModifier =
/**
 * @param url - An URL of page to load.
 */
    (this: void, url: URL) => void;

/**
 * A key of bootstrap context value containing a page load URL modifier.
 *
 * Does not modify URL by default.
 */
export const PageLoadURLModifier: ContextUpRef<PageLoadURLModifier, PageLoadURLModifier> = (
    /*#__PURE__*/ new FnContextKey('page-load-url', { byDefault: valueProvider(noop) })
);

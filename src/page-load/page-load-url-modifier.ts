import { CxEntry, cxRecent, cxScoped } from '@proc7ts/context-values';
import { asis, noop, valueProvider } from '@proc7ts/primitives';
import { BootstrapContext } from '@wesib/wesib';

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
 * Bootstrap context entry containing a page load URL modifier.
 *
 * Does not modify URL by default.
 */
export const PageLoadURLModifier: CxEntry<PageLoadURLModifier, PageLoadURLModifier> = {
  perContext: (/*#__PURE__*/ cxScoped(
      BootstrapContext,
      (/*#__PURE__*/ cxRecent<PageLoadURLModifier>({
        create: asis,
        byDefault: valueProvider(noop),
        assign: ({ get, to }) => {

          const modifier: PageLoadURLModifier = url => get()(url);

          return receiver => to((_, by) => receiver(modifier, by));
        },
      })),
  )),
  toString: () => '[PageLoadURLModifier]',
};

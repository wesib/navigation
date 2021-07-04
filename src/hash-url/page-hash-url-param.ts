import { Page } from '../page';
import { PageParam } from '../page-param';
import { getHashURL } from './hash-url';
import { PageHashURLValueParam } from './page-hash-url-param.impl';

/**
 * @internal
 */
class PageHashURLParam$ extends PageParam<URL, URL | string | null | undefined> {

  create(page: Page, input: URL | string | null | undefined): PageParam.Handle<URL, URL | string | null | undefined> {

    const handle: PageParam.Handle<URL, URL | string | null | undefined> = {
      get() {
        return page.get(PageHashURLValueParam) || getHashURL(page.url);
      },
      put(value) {
        page.put(PageHashURLValueParam, value);
      },
    };

    handle.put(input);

    return handle;
  }

  override byDefault(page: Page): PageParam.Handle<URL, URL> {
    return this.create(page, null);
  }

}

/**
 * Page parameter representing its {@link getHashURL hash URL}.
 *
 * When {@link Navigation.with set} to another value while navigating, the hash of target URL is updated, unless set to
 * `null` or `undefined`.
 *
 * Requires {@link PageHashURLSupport} for above to function properly.
 */
export const PageHashURLParam: PageParam.WithDefaults<URL, URL | string | null | undefined> = (
    /*#__PURE__*/ new PageHashURLParam$()
);

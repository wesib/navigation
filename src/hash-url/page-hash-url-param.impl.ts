import { Page } from '../page';
import { PageParam } from '../page-param';

class PageHashURLValueParam$ extends PageParam<URL | undefined | null, URL | string | null | undefined> {

  create(
      page: Page,
      input: URL | null | undefined,
  ): PageParam.Handle<URL | null | undefined, URL | string | null | undefined> {

    let hashURL: URL | null | undefined;
    const handle: PageParam.Handle<URL | null | undefined, URL | string | null | undefined> = {
      get() {
        return hashURL;
      },
      put(value) {
        hashURL = typeof value === 'string' ? new URL(value, page.url.origin) : value;
      },
    };

    handle.put(input);

    return handle;
  }

}

/**
 * @internal
 */
export const PageHashURLValueParam: PageParam<URL | null | undefined, URL | string | null | undefined> = (
    /*#__PURE__*/ new PageHashURLValueParam$()
);

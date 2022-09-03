import { BootstrapContext } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { PageParam } from '../page-param';
import { cachingPageLoader } from './caching-page-loader.impl';
import { PageLoadRequest } from './page-load-request';
import { PageLoadRequests, PageLoadRequestsParam } from './page-load-requests.impl';
import { PageLoader } from './page-loader.impl';

class PageLoadParam$ extends PageParam<void, PageLoadRequest> {

  create(
    page: Page,
    request: PageLoadRequest,
    bsContext: BootstrapContext,
  ): PageParam.Handle<void, PageLoadRequest> {
    const requests = new PageLoadRequests(
      bsContext.get(Navigation),
      cachingPageLoader(bsContext.get(PageLoader)),
    );
    const handle = requests.handle();

    page.put(PageLoadRequestsParam, requests);
    handle.put(request);

    return handle;
  }

}

/**
 * Page load parameter.
 *
 * Accepts a {@link PageLoadRequest page load request} as input.
 *
 * A page load is initiated whenever a page with new address is {@link Navigation.onEnter entered}.
 *
 * Page load won't be initiated if:
 * - page load parameter is not {@link Page.put} added,
 * - all added {@link PageLoadRequest.receiver response receiver}s supplies are cut off, or
 * - the entered page address is the the same one as previous one, except the hash,
 */
export const PageLoadParam: PageParam<void, PageLoadRequest> = /*#__PURE__*/ new PageLoadParam$();

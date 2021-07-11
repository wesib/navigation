import { CxEntry, cxScoped, cxSingle, CxValues } from '@proc7ts/context-values';
import { mapOn_ } from '@proc7ts/fun-events';
import { BootstrapContext, BootstrapWindow } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadURLModifier } from './page-load-url-modifier';

const PageCacheBuster$perContext: CxEntry.Definer<PageCacheBuster> = (/*#__PURE__*/ cxScoped(
    BootstrapContext,
    (/*#__PURE__*/ cxSingle({
      byDefault: target => new PageCacheBuster(target),
    })),
));

export const appRevSearchParam = '__wesib_app_rev__';

export class PageCacheBuster {

  static perContext(target: CxEntry.Target<PageCacheBuster>): CxEntry.Definition<PageCacheBuster> {
    return PageCacheBuster$perContext(target);
  }

  static toString(): string {
    return '[PageCacheBuster]';
  }

  readonly urlModifier: PageLoadURLModifier | undefined;
  readonly agent: PageLoadAgent | undefined;

  constructor(context: CxValues) {

    const rev = appRev(context.get(BootstrapWindow).document);

    if (!rev) {
      this.urlModifier = undefined;
      this.agent = undefined;
    } else {

      const navigation = context.get(Navigation);

      this.urlModifier = url => url.searchParams.set(appRevSearchParam, rev);
      this.agent = (next, request) => next(new Request(request.url, request)).do(
          mapOn_(response => {
            if (response.ok) {

              const newRev = appRev(response.document);

              if (newRev && newRev !== rev) {

                const url = new URL(response.page.url.href);

                url.searchParams.set(appRevSearchParam, newRev);
                navigation.update(url);
                navigation.reload();
              }
            }

            return response;
          }),
      );
    }
  }

}

function appRev(doc: Document): string | null | undefined {
  return doc.querySelector('meta[name=wesib-app-rev]')?.getAttribute('content');
}

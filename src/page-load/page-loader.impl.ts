import { hthvParse, hthvQuote } from '@hatsy/http-header-value';
import { SingleContextKey } from '@proc7ts/context-values';
import { afterThe, digOn_, EventNotifier, mapOn_, OnEvent, onEventBy, resolveOnOrdered } from '@proc7ts/fun-events';
import { HttpFetch } from '@wesib/generic';
import { BootstrapContext, bootstrapDefault, BootstrapWindow } from '@wesib/wesib';
import { Page } from '../page';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadRequestsParam } from './page-load-requests.impl';
import { PageLoadResponse } from './page-load-response';
import { PageLoadURLModifier } from './page-load-url-modifier';

/**
 * @internal
 */
export type PageLoader = (this: void, page: Page) => OnEvent<[PageLoadResponse]>;

/**
 * @internal
 */
export const PageLoader = (/*#__PURE__*/ new SingleContextKey<PageLoader>(
    'page-loader',
    {
      byDefault: bootstrapDefault(newPageLoader),
    },
));

function newPageLoader(context: BootstrapContext): PageLoader {

  const window = context.get(BootstrapWindow);
  const httpFetch = context.get(HttpFetch);
  const modifyURL = context.get(PageLoadURLModifier);
  const agent = context.get(PageLoadAgent);
  const parser = new window.DOMParser();

  return page => {

    const url = new URL(page.url.href);

    modifyURL(url);

    const request = new Request(
        url.href,
        {
          mode: 'same-origin',
          credentials: 'same-origin',
          headers: new Headers({ Accept: 'text/html' }),
        },
    );

    return onEventBy(receiver => agent(fetch, request)(receiver));

    function fetch(fetchRequest: Request): OnEvent<[PageLoadResponse]> {
      requestPageFragments(page, fetchRequest);

      return onEventBy<[PageLoadResponse]>(receiver => {

        const dispatcher = new EventNotifier<[PageLoadResponse]>();

        dispatcher.on(receiver);
        dispatcher.send({ page });

        httpFetch(fetchRequest).do(
            mapOn_(response => Promise.all([response, response.text()])),
            resolveOnOrdered,
            digOn_((...batch: [Response, string][]) => afterThe<[Response, string][]>(...batch)),
            mapOn_(([response, text]): PageLoadResponse => {
              if (!response.ok) {
                return {
                  ok: false as const,
                  page,
                  response,
                  error: response.status,
                };
              }
              try {
                return {
                  ok: true as const,
                  page,
                  response,
                  document: parsePageDocument(parser, url, response, text),
                };
              } catch (error) {
                return {
                  ok: false as const,
                  page,
                  response,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  error,
                };
              }
            }),
        )(receiver);
      });
    }
  };
}

function requestPageFragments(page: Page, request: Request): void {

  const fragments = page.get(PageLoadRequestsParam)?.fragments;

  if (fragments && fragments.length) {
    request.headers.set(
        'Accept-Fragment',
        fragments.reduce(
            (header, fragment) => (header ? header + ', ' : '') + (
                fragment.tag != null
                    ? 'tag=' + hthvQuote(fragment.tag)
                    : 'id=' + hthvQuote(fragment.id)
            ),
            '',
        ),
    );
  }
}

function parsePageDocument(parser: DOMParser, url: URL, response: Response, text: string): Document {

  const doc = parser.parseFromString(
      text,
      hthvParse(response.headers.get('Content-Type') || 'text/html')[0].v as DOMParserSupportedType,
  );

  if (doc.head) {

    const base = doc.head.querySelector('base');

    if (base) {
      base.href = new URL(base.getAttribute('href')!, url).href;
    } else {

      const newBase = doc.createElement('base');

      newBase.href = url.href;

      doc.head.appendChild(newBase);
    }
  }

  return doc;
}

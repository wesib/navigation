import { OnEvent, onEventBy, supplyOn, trackValue, valueOn_ } from '@proc7ts/fun-events';
import { asis } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { Page } from '../page';
import { PageLoadResponse } from './page-load-response';
import { PageLoader } from './page-loader.impl';

/**
 * @internal
 */
export function cachingPageLoader(loader: PageLoader): PageLoader {
  let state:
    | {
        readonly url: string;
        readonly on: OnEvent<[PageLoadResponse]>;
        readonly sup: Supply;
      }
    | undefined;

  return page => {
    const url = pageUrl(page);

    if (state) {
      if (state.url === url) {
        return state.on;
      }
      state.sup.off();
    }

    let tracked:
      | {
          readonly on: OnEvent<[PageLoadResponse]>;
          num: number;
        }
      | undefined;
    const supply = new Supply(() => {
      state = undefined;
      tracked = undefined;
    });

    const on = onEventBy<[PageLoadResponse]>(receiver => {
      if (!tracked) {
        const onLoad = loader(page);
        const tracker = trackValue<PageLoadResponse>();
        const trackSupply = onLoad(resp => {
          tracker.it = resp;
        }).whenOff(reason => {
          // Error drops page cache, unlike successful page load.
          if (reason != null) {
            supply.off(reason);
          }
        });

        supply.cuts(trackSupply).cuts(tracker);

        tracked = {
          on: tracker.read.do(valueOn_<[PageLoadResponse?], PageLoadResponse>(asis)),
          num: 0,
        };
      }

      const requested = tracked;

      ++requested.num;

      return requested.on
        .do(supplyOn(supply))(receiver)
        .whenOff(reason => {
          if (!--requested.num) {
            // Allow to request the same page again
            Promise.resolve()
              .then(() => {
                if (!requested.num && requested === tracked) {
                  supply.off(reason);
                }
              })
              .catch(console.error);
          }
        });
    });

    state = { url, on, sup: supply };

    return on;
  };
}

function pageUrl(page: Page): string {
  return new URL('', page.url).href;
}

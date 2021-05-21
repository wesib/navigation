import { FeatureDef, FeatureDef__symbol } from '@wesib/wesib';
import { PageCacheBuster } from './page-cache-buster.impl';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadURLModifier } from './page-load-url-modifier';
import { pageScriptsAgent } from './page-scripts-agent.impl';
import { pageStyleAgent } from './page-style-agent.impl';
import { pageTitleAgent } from './page-title-agent.impl';

/**
 * @internal
 */
const PageLoadSupport__feature: FeatureDef = {
  setup(setup) {
    setup.provide({
      a: PageLoadURLModifier,
      by: (buster: PageCacheBuster) => buster.urlModifier,
      with: [PageCacheBuster],
    });
    setup.provide({
      a: PageLoadAgent,
      by: (buster: PageCacheBuster) => buster.agent,
      with: [PageCacheBuster],
    });
    setup.provide({ a: PageLoadAgent, by: pageScriptsAgent });
    setup.provide({ a: PageLoadAgent, by: pageStyleAgent });
    setup.provide({ a: PageLoadAgent, by: pageTitleAgent });
  },
};

/**
 * Page load support feature.
 *
 * Enables default {@link PageLoadAgent page load agents}:
 * 1. Page cache busting agent.
 *    If `<meta name="wesib-app-rev">` tag is present in initial page, then sends this tag's content with each page load
 *    request as `__wesib_app_rev__` search parameter. If the loaded page contains the same named meta tag with
 *    different content, then reloads the page.
 *    This serves both as cache busting technique, and as server-side application updates handler.
 * 2. Scripts agent.
 *    Includes external scripts from loaded page into main document.
 * 3. Style agent.
 *    Replaces external styles of main document styles with the ones from loaded page.
 *    Unless loaded page has no external styles.
 * 4. Title agent.
 *    Applies loaded page title to bootstrap window. If there is one.
 */
export class PageLoadSupport {

  static get [FeatureDef__symbol](): FeatureDef {
    return PageLoadSupport__feature;
  }

}

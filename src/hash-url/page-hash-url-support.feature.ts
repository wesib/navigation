import { FeatureDef, FeatureDef__symbol } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { NavigationAgent } from '../navigation-agent';
import { Page } from '../page';
import { setHashURL } from './hash-url';
import { PageHashURLValueParam } from './page-hash-url-param.impl';

const PageHashURLSupport__feature: FeatureDef = {
  setup(setup) {
    setup.provide({ a: NavigationAgent, is: pageHashURLAgent });
  },
};

/**
 * {@link PageHashURLParam Page hash URL parameter} support feature.
 */
export class PageHashURLSupport {

  static get [FeatureDef__symbol](): FeatureDef {
    return PageHashURLSupport__feature;
  }

}

function pageHashURLAgent(
    next: (this: void, target?: Navigation.Target) => void,
    _when: 'pretend' | 'pre-open' | 'pre-replace',
    _from: Page,
    to: Page,
): void {

  const hashURL = to.get(PageHashURLValueParam);

  if (hashURL) {
    next({ url: setHashURL(to.url, hashURL) });
  } else {
    next();
  }
}

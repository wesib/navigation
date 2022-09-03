import { importNodeContent } from '@frontmeans/dom-primitives';
import { CxEntry, cxSingle } from '@proc7ts/context-values';
import { onceAfter, trackValue } from '@proc7ts/fun-events';
import { valueByRecipe } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { FragmentRenderCtl } from '@wesib/generic';
import { ComponentContext } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { PageFragmentRequest, PageLoadParam, PageLoadResponse } from '../page-load';
import { PageRenderer, PageRendererExecution } from './page-renderer';
import { RenderPageDef } from './render-page-def';

/**
 * Page render control.
 *
 * Controls rendering by {@link PageRenderer page renderers} upon page load.
 *
 * Available in component context.
 */
export interface PageRenderCtl {
  /**
   * Enables loaded page rendering by the given `renderer`.
   *
   * A `renderer` call will be scheduled by {@link DocumentRenderKit document render kit} once {@link Navigation.page
   * current page} changes.
   *
   * @param renderer - Page renderer function.
   * @param def - Optional page rendering definition.
   *
   * @returns Renderer supply. The rendering would stop once this supply is cut off.
   */
  renderPageBy(renderer: PageRenderer, def?: RenderPageDef): Supply;
}

/**
 * Component context entry containing {@link PageRenderCtl page render control}.
 */
export const PageRenderCtl: CxEntry<PageRenderCtl> = {
  perContext: /*#__PURE__*/ cxSingle({
    byDefault: target => new PageRenderCtl$(target.get(ComponentContext)),
  }),
  toString: () => '[PageRenderCtl]',
};

class PageRenderCtl$ implements PageRenderCtl {

  constructor(private readonly _context: ComponentContext) {}

  renderPageBy(renderer: PageRenderer, def: RenderPageDef = {}): Supply {
    const spec = valueByRecipe(def, this._context);
    const { contentKey = RenderPage$contentKey$default } = spec;
    const detectFragment = RenderPage$fragmentDetector(spec);

    const navigation = this._context.get(Navigation);
    const renderCtl = this._context.get(FragmentRenderCtl);

    let lastPageKey: string;
    const responseTracker = trackValue<[PageLoadResponse, string]>();
    const handleResponse = (response: PageLoadResponse): void => {
      const pageKey = contentKey(response.page) as string;

      if (pageKey === lastPageKey) {
        return; // Only hash changed? Do not refresh the page.
      }

      responseTracker.it = [response, pageKey];
    };
    const supply = renderCtl.renderFragmentBy(
      fragExec => {
        const responseAndKey = responseTracker.it;

        if (!responseAndKey) {
          fragExec.retainContent();

          return;
        }

        const [response, pageKey] = responseAndKey;
        const exec: PageRendererExecution = {
          ...fragExec,
          postpone(postponed) {
            fragExec.postpone(() => postponed(exec));
          },
          response,
        };

        if (response.ok) {
          lastPageKey = pageKey;

          const { fragment } = response;

          if (fragment) {
            importNodeContent(fragment, fragExec.content);
          }
        }

        renderer(exec);
      },
      {
        ...spec,
        when: 'connected',
        on: responseTracker.on,
      },
    );

    this._context.whenConnected(context => {
      lastPageKey = contentKey(navigation.page) as string;
      navigation.read.do(onceAfter)(page => {
        page.put(PageLoadParam, {
          fragment: detectFragment(context),
          receiver: {
            supply: new Supply().needs(supply),
            receive: (_ctx, response) => handleResponse(response),
          },
        });
      });
    });

    return supply;
  }

}

function RenderPage$fragmentDetector({
  fragment,
}: RenderPageDef.Spec): (context: ComponentContext) => PageFragmentRequest {
  if (fragment) {
    return _context => fragment;
  }

  return ({ element: { id, tagName } }: { element: Element }) => id ? { id } : { tag: tagName.toLowerCase() };
}

function RenderPage$contentKey$default({ url }: Page): string {
  return new URL('', url).href;
}

import { afterAll, AfterEvent, afterThe, isAfterEvent, trackValue, translateAfter_ } from '@proc7ts/fun-events';
import { noop, valueByRecipe } from '@proc7ts/primitives';
import { Supply, SupplyPeer } from '@proc7ts/supply';
import { BootstrapWindow, ComponentContext } from '@wesib/wesib';
import { getHashURL } from '../hash-url';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { NavLink } from './nav-link';

const NavMenu$Links__symbol = (/*#__PURE__*/ Symbol('NavMenu.links'));

/**
 * Navigation menu.
 *
 * Serves as an {@link NavLink.Owner owner} of navigation links. Activates the links matching {@link Navigation.page
 * current page}.
 */
export class NavMenu implements SupplyPeer {

  /**
   * @internal
   */
  private readonly [NavMenu$Links__symbol]: NavMenu$Links;

  /**
   * Navigation menu supply.
   */
  get supply(): Supply {
    return this[NavMenu$Links__symbol].supply;
  }

  /**
   * Constructs navigation menu.
   *
   * @param links - Navigation links of this menu. Either an iterable of navigation links or their providers,
   * an `AfterEvent` keeper of the same, or a function accepting component context and this menu as parameters,
   * and returning one of the above.
   * @param options - Additional options.
   */
  constructor(
      links:
          | Iterable<NavLink | NavLink.Provider>
          | AfterEvent<(NavLink | NavLink.Provider)[]>
          | ((this: void, context: ComponentContext, menu: NavMenu) =>
          | Iterable<NavLink | NavLink.Provider>
          | AfterEvent<(NavLink | NavLink.Provider)[]>),
      options?: NavMenu.Options,
  ) {
    this[NavMenu$Links__symbol] = new NavMenu$Links(this, links, options);
  }

  /**
   * Binds this menu to the given context.
   *
   * Subsequent calls have no effect.
   *
   * @param context - Owning component context.
   *
   * @returns `this` instance.
   */
  bindTo(context: ComponentContext): this {
    this[NavMenu$Links__symbol].bindTo(context);
    return this;
  }

}

export namespace NavMenu {

  /**
   * Navigation menu options.
   */
  export interface Options {

    /**
     * Whether to activate navigation links.
     *
     * `true` by default.
     */
    readonly activate?: boolean;

    /**
     * Weighs matching navigation link.
     *
     * This method will be called for each navigation link on each current page update.
     *
     * By default:
     * 1. If the link path has neither hash, nor search parameters, then:
     * 1.1. Checks whether page URL path starts with the link's one.
     * 1.2. If so, then uses link path length as weight.
     * 2. If the link path has search parameters, but has no hash, then requires the page path to be the same as link's
     *    one, and page search parameters include all of the link's ones. The number of link search parameters plus the
     *    link path length is used as weight.
     * 3. If the link path has a hash, then requires the page path and search parameters to be the same as link's ones,
     *    and their hashes are treated as {@link getHashURL URLs}. The weight is calculated by applying steps 1, 2, and
     *    3 to hash URLs increased by the link path length and the number of search parameters.
     *
     * Ignores search parameters with names starting and ending with double underscores. Like `__wesib_app_rev__`.
     *
     * @param link - Navigation link to weigh.
     * @param menu - Owning navigation menu.
     * @param context - Owning component context.
     * @param page - Current navigation page.
     *
     * @returns Navigation link weight. Non-positive wight means the page URL doesn't match the link at all.
     */
    weigh?(
        {
          link,
          menu,
          context,
          page,
        }: {
          link: NavLink;
          menu: NavMenu;
          context: ComponentContext;
          page: Page;
        },
    ): number;

  }

}

class NavMenu$Links {

  readonly supply: Supply;
  private readonly _links = trackValue([new Set<NavLink>()]);
  private readonly _active = new Map<NavLink, Supply>();
  private readonly _activate: boolean;
  private readonly _weigh: typeof defaultNavLinkWeight;

  constructor(
      private readonly _menu: NavMenu,
      private readonly _navLinks:
          | Iterable<NavLink | NavLink.Provider>
          | AfterEvent<(NavLink | NavLink.Provider)[]>
          | ((this: void, context: ComponentContext, menu: NavMenu) =>
          | Iterable<NavLink | NavLink.Provider>
          | AfterEvent<(NavLink | NavLink.Provider)[]>),
      options: NavMenu.Options = {},
  ) {
    this.supply = new Supply().cuts(this._links);

    const { activate = true, weigh } = options;

    this._activate = activate;
    this._weigh = weigh ? weigh.bind(options) : defaultNavLinkWeight;
  }

  bindTo(context: ComponentContext): void {
    this.bindTo = noop;
    context.whenConnected(context => {

      let afterLinks: AfterEvent<(NavLink | NavLink.Provider)[]>;

      if (isAfterEvent(this._navLinks)) {
        afterLinks = this._navLinks;
      } else {

        const linkValues = valueByRecipe(this._navLinks, context, this._menu);

        afterLinks = isAfterEvent(linkValues)
            ? linkValues
            : afterThe(linkValues).do(
                translateAfter_((send, links) => send(...links)),
            );
      }

      const owner: NavLink.Owner = {
        context,
        supply: this.supply,
      };

      afterLinks((...links) => {
        this._replace(owner, links);
      });

      if (this._activate) {

        const navigation = context.get(Navigation);

        afterAll({
          page: navigation,
          links: this._links,
        })(({
          page: [page],
          links: [[links]],
        }) => {
          this._updateActive(context, page, links);
        });
      }
    });
  }

  private _replace(
      owner: NavLink.Owner,
      replacement: readonly (NavLink | NavLink.Provider)[],
  ): void {

    const toAdd = new Set<NavLink>();

    for (const linkOrProvider of replacement) {

      const link = valueByRecipe(linkOrProvider, owner);

      if (link) {
        toAdd.add(link);
      }
    }

    const [links] = this._links.it;
    const toRemove: NavLink[] = [];

    for (const link of links.keys()) {
      if (!toAdd.delete(link)) {
        toRemove.push(link);
      }
    }

    if (toAdd.size || toRemove.length) {
      for (const removed of toRemove) {
        links.delete(removed);
        this._deactivate(removed);
        removed.supply?.off();
      }
      for (const added of toAdd) {

        const { supply } = added;

        if (supply) {
          if (supply.isOff) {
            continue; // Exclude disabled nav link.
          }

          supply.needs(this).whenOff(() => {
            // Handle nav link removal

            const [links] = this._links.it;

            if (links.delete(added)) {
              this._links.it = [links];
            }
          });
        }

        links.add(added);
      }

      this._links.it = [links];
    }
  }

  private _updateActive(context: ComponentContext, page: Page, links: Set<NavLink>): void {

    const toDeactivate: NavLink[] = [];
    const toActivate = this._selectActive(context, page, links);

    for (const link of this._active.keys()) {
      if (!toActivate.delete(link)) {
        toDeactivate.push(link);
      }
    }

    for (const deactivated of toDeactivate) {
      this._deactivate(deactivated);
    }
    for (const activated of toActivate) {
      if (activated.activate) {
        this._active.set(
            activated,
            activated.activate(),
        );
      }
    }
  }

  private _selectActive(context: ComponentContext, page: Page, links: Set<NavLink>): Set<NavLink> {

    let maxWeight = 0;
    let active = new Set<NavLink>();

    for (const link of links) {

      const weight = this._weigh({ link, menu: this._menu, context, page });

      if (weight > maxWeight) {
        maxWeight = weight;
        active = new Set<NavLink>().add(link);
      } else if (weight === maxWeight) {
        active.add(link);
      }
    }

    return active;
  }

  private _deactivate(link: NavLink): void {

    const supply = this._active.get(link);

    if (supply) {
      this._active.delete(link);
      supply.off();
    }
  }

}

function defaultNavLinkWeight(
    {
      link,
      context,
      page,
    }: {
      link: NavLink;
      menu: NavMenu;
      context: ComponentContext;
      page: Page;
    },
): number {

  const href = link.href;
  const linkURL = new URL(href, context.get(BootstrapWindow).document.baseURI);

  return calcNavLinkWeight(linkURL, page.url);
}

function calcNavLinkWeight(linkURL: URL, pageURL: URL): number {
  if (linkURL.origin !== pageURL.origin) {
    return -1;
  }

  const linkDir = navLinkPath2dir(linkURL);
  const pageDir = navLinkPath2dir(pageURL);

  if (linkURL.hash) {
    if (linkDir !== pageDir) {
      return -1;
    }
    // Require search parameters to be equal

    const searchParamWeight = navLinkSearchParamsWeight(linkURL, pageURL);

    if (searchParamWeight < 0 || navLinkSearchParamsWeight(pageURL, linkURL) < 0) {
      return -1;
    }

    return linkURL.pathname.length
        + searchParamWeight
        + calcNavLinkWeight(getHashURL(linkURL), getHashURL(pageURL));
  }

  const searchParamWeight = navLinkSearchParamsWeight(linkURL, pageURL);

  if (searchParamWeight) {
    if (searchParamWeight < 0) {
      return -1;
    }
    if (linkDir !== pageDir) {
      return -1;
    }
    return linkURL.pathname.length + searchParamWeight;
  }

  if (!pageDir.startsWith(linkDir)) {
    return -1;
  }

  return linkURL.pathname.length;
}

function navLinkPath2dir(url: URL): string {

  const path = url.pathname;

  return path.endsWith('/') ? path : path + '/';
}

function navLinkSearchParamsWeight(
    { searchParams: linkParams }: URL,
    { searchParams: pageParams }: URL,
): number {

  let weight = 0;

  linkParams.forEach((value, key) => {
    if (!isIgnoredSearchParam(key)) {
      if (weight >= 0) {
        if (pageParams.getAll(key).includes(value)) {
          weight += 1;
        } else {
          weight = -1;
        }
      }
    }
  });

  return weight;
}

function isIgnoredSearchParam(key: string): boolean {
  return key.startsWith('__') && key.endsWith('__');
}

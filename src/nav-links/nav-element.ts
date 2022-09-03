import { DomEventDispatcher } from '@frontmeans/dom-events';
import { deriveDrekContext, drekContextOf, drekCssClassesOf } from '@frontmeans/drek';
import { css__naming, NamespaceAliaser, QualifiedName } from '@frontmeans/namespace-aliaser';
import { EventReceiver } from '@proc7ts/fun-events';
import { setOfElements, valueByRecipe } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/supply';
import { ComponentRenderScheduler, RenderDef, Wesib__NS } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { NavLink } from './nav-link';

export namespace NavElement {
  /**
   * Navigation element construction options.
   *
   * @typeParam TElement - Navigation element type.
   */
  export interface Options<TElement extends Element> {
    /**
     * Type or types of events to handle.
     *
     * `click` by default.
     */
    readonly event?: string | readonly string[] | undefined;

    /**
     * Qualified name of CSS class to mark the active anchor element with.
     *
     * The `active` class in Wesib namespace is used by default.
     */
    readonly active?: QualifiedName | undefined;

    /**
     * Rendering definition options to pass to nav links render scheduler.
     */
    readonly render?: RenderDef.Options | undefined;

    /**
     * Extracts an {@link NavLink.href URI} the navigation link refers to.
     *
     * @param element - Navigation element instance.
     *
     * @returns Navigation URI.
     */
    href(element: TElement): string;
  }
}

const NavElement$activeClass: QualifiedName = ['active', Wesib__NS];

/**
 * Creates navigation link for the given element.
 *
 * @typeParam TElement - Navigation element type.
 * @param element - Either target element, or a function returning one by the given navigation link owner.
 * @param options - Custom navigation element options.
 *
 * @returns Navigation link provider.
 */
export function navElement<TElement extends Element>(
  element: TElement | ((this: void, owner: NavLink.Owner) => TElement),
  options: NavElement.Options<TElement>,
): (this: void, owner: NavLink.Owner) => NavLink;

/**
 * Optionally creates navigation link for the given element.
 *
 * @typeParam TElement - Navigation element type.
 * @param element - Either target element, or a function returning one by the given navigation link owner,
 * or nothing.
 * @param options - Custom navigation element options.
 *
 * @returns Navigation link provider.
 */
export function navElement<TElement extends Element>(
  element:
    | TElement
    | ((this: void, owner: NavLink.Owner) => TElement | null | undefined)
    | null
    | undefined,
  options: NavElement.Options<TElement>,
): NavLink.Provider;

export function navElement<TElement extends Element>(
  element:
    | TElement
    | ((this: void, owner: NavLink.Owner) => TElement | null | undefined)
    | null
    | undefined,
  options: NavElement.Options<TElement>,
): NavLink.Provider {
  const getHref = options.href.bind(options);
  const events = setOfElements(options.event || 'click');
  const { active = NavElement$activeClass } = options;
  let activeClass: string;

  return owner => {
    const anchor = valueByRecipe(element, owner);

    if (!anchor) {
      return;
    }

    const { context, supply: ownerSupply = context.supply } = owner;

    activeClass = css__naming.name(active, context.get(NamespaceAliaser));

    const navigation = context.get(Navigation);
    const scheduler = context.get(ComponentRenderScheduler);
    const schedule = scheduler({ node: anchor });
    const supply = new Supply().needs(ownerSupply);
    const handleClick: EventReceiver<[Event]> = {
      supply,
      receive(_ctx, event) {
        const href = getHref(anchor);
        const pageURL = navigation.page.url;
        const url = new URL(href, anchor.ownerDocument.baseURI);

        if (url.origin !== pageURL.origin) {
          return; // External link
        }

        event.preventDefault();
        if (pageURL.href !== url.href) {
          navigation.open(href).catch(console.error);
        }
      },
    };
    const eventDispatcher = new DomEventDispatcher(anchor);

    supply.cuts(eventDispatcher);
    for (const event of events) {
      eventDispatcher.on(event)(handleClick);
    }

    const css = drekCssClassesOf(anchor).renderIn(
      deriveDrekContext(drekContextOf(anchor), {
        scheduler: _opts => schedule,
      }),
    );

    return {
      get href(): string {
        return getHref(anchor);
      },

      supply,

      activate() {
        return css.add(activeClass);
      },
    };
  };
}

import { QualifiedName } from '@frontmeans/namespace-aliaser';
import { RenderDef } from '@wesib/wesib';
import { navElement } from './nav-element';
import { NavLink } from './nav-link';

type GenericElement = Element;

export namespace NavAnchor {
  /**
   * Anchor element.
   */
  export interface Element extends GenericElement {
    /**
     * Hyper-reference of this anchor.
     */
    readonly href: string;
  }

  /**
   * Navigation anchor construction options.
   */
  export interface Options {
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
  }
}

/**
 * Creates navigation link for the given anchor element.
 *
 * @param element - Either an anchor element, or a function returning one by the given navigation link owner.
 * @param options - Custom anchor options.
 *
 * @returns Navigation link provider.
 */
export function navAnchor(
  element: NavAnchor.Element | ((this: void, owner: NavLink.Owner) => NavAnchor.Element),
  options?: NavAnchor.Options,
): (this: void, owner: NavLink.Owner) => NavLink;

/**
 * Optionally creates navigation link for the given anchor element.
 *
 * @param element - Either an anchor element, or a function returning one by the given navigation link owner,
 * or nothing.
 * @param options - Custom anchor options.
 *
 * @returns Navigation link provider.
 */
export function navAnchor(
  element:
    | NavAnchor.Element
    | ((this: void, owner: NavLink.Owner) => NavAnchor.Element | null | undefined)
    | null
    | undefined,
  options?: NavAnchor.Options,
): NavLink.Provider;

export function navAnchor(
  element:
    | NavAnchor.Element
    | ((this: void, owner: NavLink.Owner) => NavAnchor.Element | null | undefined)
    | null
    | undefined,
  options: NavAnchor.Options = {},
): NavLink.Provider {
  return navElement(element, {
    ...options,
    href(element) {
      return element.href;
    },
  });
}

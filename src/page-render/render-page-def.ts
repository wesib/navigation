import { RenderFragmentDef } from '@wesib/generic';
import { RenderDef } from '@wesib/wesib';
import { Page } from '../page';
import { PageFragmentRequest } from '../page-load';
import { PageRendererExecution } from './page-renderer';

/**
 * Page rendering definition.
 *
 * This is either a {@link RenderPageDef.Spec rendering specifier}, or its provider function.
 */
export type RenderPageDef = RenderPageDef.Spec | RenderDef.Provider<RenderPageDef.Spec>;

export namespace RenderPageDef {
  /**
   * Page rendering method signature.
   *
   * @param execution - Page renderer execution context.
   */
  export type Method = (execution: PageRendererExecution) => void;

  /**
   * Page rendering specifier.
   *
   * Configures {@link RenderPage @RenderPage} decorator.
   */
  export interface Spec extends Omit<RenderFragmentDef.Spec, 'when' | 'on'> {
    /**
     * Page fragment to include.
     *
     * By default uses custom element identifier if present, or element tag name otherwise.
     */
    readonly fragment?: PageFragmentRequest | undefined;

    /**
     * Builds content key for the given page.
     *
     * The loaded content will replace already included one only when their content key differ.
     *
     * By default, uses page URL without hash part as a key. This prevents content refresh when only URL hash changes.
     *
     * @param page - Target page. Either loaded or not.
     *
     * @returns Content key.
     */
    contentKey?(this: void, page: Page): unknown;
  }
}

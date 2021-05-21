import { FragmentRendererExecution } from '@wesib/generic';
import { ComponentRenderer } from '@wesib/wesib';
import { PageLoadResponse } from '../page-load';

/**
 * A signature of component fragment renderer.
 *
 * Such renderer is called in pre-rendering phase once {@link Navigation.page current page} changes and page load event
 * occurred. I.e. when the page load {@link PageLoadResponse.Start starts}, {@link PageLoadResponse.Failure fails},
 * or {@link PageLoadResponse.Ok succeeds}. In the latter case, the {@link PageRendererExecution.content content} is
 * filled with loaded page content prior to calling the renderer.
 *
 * @typeParam TExecution - A type of supported page renderer execution.
 */
export type PageRenderer<TExecution extends PageRendererExecution = PageRendererExecution> =
    ComponentRenderer<TExecution>;

/**
 * Page renderer execution context.
 *
 * This is passed to {@link PageRenderer page renderer} when the latter executed on page load event.
 */
export interface PageRendererExecution extends FragmentRendererExecution {

  /**
   * A page load response.
   */
  readonly response: PageLoadResponse;

}

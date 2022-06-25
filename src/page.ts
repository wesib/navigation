import { PageParam } from './page-param';

/**
 * Navigated page representation.
 *
 * Represents a navigation history entry.
 */
export interface Page {

  /**
   * Page location URL.
   */
  readonly url: URL;

  /**
   * History entry data.
   */
  readonly data?: unknown | undefined;

  /**
   * New window title.
   */
  readonly title?: string | undefined;

  /**
   * Whether this page is visited at least one.
   *
   * This is `false` for target pages before navigating to them.
   */
  readonly visited: boolean;

  /**
   * Whether the page is the one opened in browser.
   */
  readonly current: boolean;

  /**
   * Requests a page navigation parameter of this page that guaranteed to have value.
   *
   * The requested parameter has default value.
   *
   * @typeParam T - Parameter value type.
   * @param ref - A reference to page navigation parameter to retrieve.
   *
   * @returns The requested parameter value.
   */
  get<T>(ref: PageParam.WithDefaults.Ref<T, unknown>): T;

  /**
   * Requests arbitrary page navigation parameter of this page.
   *
   * @typeParam T - Parameter value type.
   * @param ref - A reference to page navigation parameter to retrieve.
   *
   * @returns Either requested parameter value, or `undefined` if requested parameter is not assigned to the page.
   */
  get<T>(ref: PageParam.Ref<T, unknown>): T | undefined;

  /**
   * Puts navigation parameter to this page.
   *
   * The meaning of putting depends on type parameter implementation. This can be e.g. a value assignment, or appending
   * to the list of values.
   *
   * @typeParam T - Parameter value type.
   * @typeParam TInput - Parameter input type.
   * @param ref - A reference to page navigation parameter to put.
   * @param input - Parameter input to use when constructing its value.
   */
  put<T, TInput>(ref: PageParam.Ref<T, TInput>, input: TInput): void;

}

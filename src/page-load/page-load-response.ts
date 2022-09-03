import { Page } from '../page';

/**
 * A response to {@link PageLoadRequest page load request}.
 *
 * Indicates page load status: either is is {@link PageLoadResponse.Start started}, {@link PageLoadResponse.Ok
 * completed successfully}, or {@link PageLoadResponse.Failure failed}.
 */
export type PageLoadResponse =
  | PageLoadResponse.Start
  | PageLoadResponse.Ok
  | PageLoadResponse.Failure;

export namespace PageLoadResponse {
  /**
   * Page load start.
   *
   * Reported when page load is just started, but not finished yet.
   */
  export interface Start {
    /**
     * Page load completeness flag. Always `undefined`.
     */
    readonly ok?: undefined;

    /**
     * The page to be loaded.
     */
    readonly page: Page;
  }

  /**
   * Successfully loaded page..
   */
  export interface Ok {
    /**
     * Page load completeness flag. Always `true`.
     */
    readonly ok: true;

    /**
     * Loaded page.
     */
    readonly page: Page;

    /**
     * HTTP fetch response.
     */
    readonly response: Response;

    /**
     * Loaded document.
     */
    readonly document: Document;

    /**
     * Loaded fragment.
     *
     * This is a requested element, if found in the loaded document.
     */
    readonly fragment?: Element | undefined;

    /**
     * Page load error. Always `undefined`.
     */
    readonly error?: undefined;
  }

  export interface Failure {
    /**
     * Page load completeness flag. Always `false`.
     */
    readonly ok: false;

    /**
     * The page failed to load.
     */
    readonly page: Page;

    /**
     * HTTP fetch response.
     */
    readonly response?: Response | undefined;

    /**
     * Error document.
     */
    readonly document?: Document | undefined;

    /**
     * Page load error. Always present.
     */
    readonly error: unknown;
  }
}

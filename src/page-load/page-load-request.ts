import { EventReceiver } from '@proc7ts/fun-events';
import { PageLoadResponse } from './page-load-response';

/**
 * Page load request.
 *
 * Accepted as a input of {@link PageLoadParam page load parameter}.
 */
export interface PageLoadRequest {
  /**
   * Page fragment request.
   *
   * When specified, this fragment will be requested by `Accept-Fragment` HTTP request header, and the response will
   * contain a {@link PageLoadResponse.Ok.fragment loaded fragment}.
   *
   * When omitted in one of the page load requests, the full document will be requested. I.e. `Accept-Fragment` header
   * won't be sent in HTTP request.
   */
  readonly fragment?: PageFragmentRequest | undefined;

  /**
   * Page load events receiver.
   *
   * Will be notified on {@link PageLoadResponse page load response} events whenever page loaded.
   * The notifications would no longer be sent one {@link PageLoadRequest.receiver request receiver}'s supply
   * is cut off.
   */
  readonly receiver: EventReceiver<[PageLoadResponse]>;
}

/**
 * Page fragment request.
 */
export type PageFragmentRequest = PageFragmentRequest.ById | PageFragmentRequest.ByTag;

export namespace PageFragmentRequest {
  /**
   * A request of page element with the given identifier.
   */
  export interface ById {
    /**
     * Requested element identifier.
     */
    id: string;

    tag?: undefined;
  }

  /**
   * A request of page element with the given tag name.
   */
  export interface ByTag {
    id?: undefined;

    /**
     * Requested element tag name.
     */
    tag: string;
  }
}

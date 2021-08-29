import { Supply } from '@proc7ts/supply';
import { ComponentContext } from '@wesib/wesib';

/**
 * Navigation link.
 */
export interface NavLink {

  /**
   * An URI this navigation link refers to.
   */
  readonly href: string;

  /**
   * Navigation link supply.
   *
   * Disables navigation link once cut off.
   */
  readonly supply?: Supply | undefined;

  /**
   * Activates this navigation link.
   *
   * E.g. marks it as active with corresponding CSS class.
   *
   * @returns Activation supply that deactivates the link once cut off.
   */
  activate?(): Supply;

}

export namespace NavLink {

  /**
   * Navigation link provider.
   */
  export type Provider =
  /**
   * @param owner - Navigation link owner.
   *
   * @returns Either navigation link instance, or `null`/`undefined` if there is no one.
   */
      (this: void, owner: Owner) => NavLink | null | undefined;

  /**
   * Navigation link owner.
   */
  export interface Owner {

    /**
     * Owning component context.
     */
    readonly context: ComponentContext;

    /**
     * Owner supply.
     *
     * It is expected that constructed {@link NavLink.supply link supply} depends on this one.
     */
    readonly supply?: Supply | undefined;

  }

}

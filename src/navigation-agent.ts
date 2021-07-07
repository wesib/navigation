import { cxDynamic, CxEntry } from '@proc7ts/context-values';
import { BootstrapWindow } from '@wesib/wesib';
import { Navigation } from './navigation';
import { Page } from './page';
import { PageParam } from './page-param';
import Target = Navigation.Target;

/**
 * Navigation agent signature.
 *
 * The agent is called by navigation methods when leaving current page and may alter navigation processing.
 * E.g. change navigation target. For that it should be registered in appropriate context.
 *
 * All registered agents are organized into chain. The first agent in chain is called by navigation method.
 */
export type NavigationAgent =
/**
 * @param next - Either calls the next agent in chain, or applies the final navigation target if this agent is the last
 * one. Not calling this function effectively prevents navigation.
 * Accepts an optional {@link Navigation.Target} parameter. The original target will be used instead when omitted.
 * @param when - When navigation occurred. Either `pretend`, `pre-open`, or `pre-replace`.
 * @param from - The page to leave.
 * @param to - Navigation target page.
 */
    (
        this: void,
        next: (this: void, target?: Target) => void,
        when: 'pretend' | 'pre-open' | 'pre-replace',
        from: Page,
        to: Page,
    ) => void;

export namespace NavigationAgent {

  /**
   * Combined navigation agent signature.
   *
   * This is what is available under {@link NavigationAgent} key.
   */
  export type Combined =
  /**
   * @param next - Either calls the next agent in chain, or applies the final navigation target if this agent is the
   * last one. Not calling this function effectively prevents navigation.
   * Accepts an optional {@link Navigation.Target} parameter. The original target will be used instead when omitted.
   * @param when - When navigation occurred. Either `pretend`, `pre-open`, or `pre-replace`.
   * @param from - The page to leave.
   * @param to - Navigation target page.
   */
      (
          this: void,
          next: (this: void, target: Navigation.URLTarget) => void,
          when: 'pretend' | 'pre-open' | 'pre-replace',
          from: Page,
          to: Page,
      ) => void;

}

/**
 * Context value entry containing {@link NavigationAgent} instance.
 *
 * The agent returned combines all registered agents into one. If no agent registered it just performs the navigation.
 */
export const NavigationAgent: CxEntry<NavigationAgent.Combined, NavigationAgent> = {
  perContext: (/*#__PURE__*/ cxDynamic<NavigationAgent.Combined, NavigationAgent>({
    create: NavigationAgent$create,
    byDefault: _target => NavigationAgent$default,
    assign: ({ get, to }) => {

      const agent: NavigationAgent.Combined = (next, when, from, to) => get()(
          next,
          when,
          from,
          to,
      );

      return receiver => to((_, by) => receiver(agent, by));
    },
  })),
  toString: () => '[NavigationAgent]',
};

function NavigationAgent$create(
    agents: NavigationAgent[],
    target: CxEntry.Target<NavigationAgent.Combined, NavigationAgent>,
): NavigationAgent.Combined {

  const { document } = target.get(BootstrapWindow);

  return NavigationAgent$combined;

  function NavigationAgent$combined(
      next: (this: void, target: Navigation.URLTarget) => void,
      when: 'pretend' | 'pre-open' | 'pre-replace',
      from: Page,
      to: Page,
  ): void {

    return navigate(0, to);

    function navigate(agentIdx: number, agentTo: Page): void {

      const agent = agents[agentIdx];

      if (!agent) {
        return next(agentTo);
      }

      agent(
          (
              {
                url: nextURL = agentTo.url,
                title: nextTitle = agentTo.title,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                data: nextData = agentTo.data,
              }: Navigation.Target = agentTo,
          ) => navigate(
              agentIdx + 1,
              {
                url: new URL(String(nextURL), document.baseURI),
                title: nextTitle,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                data: nextData,
                get visited() {
                  return agentTo.visited;
                },
                get current() {
                  return agentTo.current;
                },
                get<T>(ref: PageParam.Ref<T, unknown>): T | undefined {
                  return agentTo.get(ref);
                },
                put(ref, input) {
                  agentTo.put(ref, input);
                },
              },
          ),
          when,
          from,
          agentTo,
      );
    }
  }
}

function NavigationAgent$default(
    next: (this: void, target: Navigation.URLTarget) => void,
    _when: 'pretend' | 'pre-open' | 'pre-replace',
    _from: Page,
    to: Page,
): void {
  next(to);
}

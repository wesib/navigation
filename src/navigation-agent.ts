import { ContextValueSlot } from '@proc7ts/context-values';
import { contextDestroyed, ContextUpKey, ContextUpRef } from '@proc7ts/context-values/updatable';
import { AfterEvent, afterThe, digAfter } from '@proc7ts/fun-events';
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

/**
 * @internal
 */
class NavigationAgentKey
    extends ContextUpKey<NavigationAgent.Combined, NavigationAgent>
    implements ContextUpRef<NavigationAgent.Combined, NavigationAgent> {

  readonly upKey: ContextUpKey.UpKey<NavigationAgent.Combined, NavigationAgent>;

  constructor(name: string) {
    super(name);
    this.upKey = this.createUpKey(
        slot => {

          const { document } = slot.context.get(BootstrapWindow);

          slot.insert(slot.seed.do(
              digAfter((...agents) => {
                if (agents.length) {
                  return afterThe(combinedAgent);
                }
                if (slot.hasFallback && slot.or) {
                  return slot.or;
                }

                return afterThe(defaultNavigationAgent);

                function combinedAgent(
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
              }),
          ));
        },
    );
  }

  grow(
      slot: ContextValueSlot<
          NavigationAgent.Combined,
          ContextUpKey.Source<NavigationAgent>,
          AfterEvent<NavigationAgent[]>>,
  ): void {

    let delegated: NavigationAgent.Combined;

    slot.context.get(
        this.upKey,
        slot.hasFallback ? { or: slot.or != null ? afterThe(slot.or) : slot.or } : undefined,
    )!(
        agent => delegated = agent,
    ).whenOff(
        reason => delegated = contextDestroyed(reason),
    );

    slot.insert((next, when, from, to) => delegated(next, when, from, to));
  }

}

/**
 * @internal
 */
function defaultNavigationAgent(
    next: (this: void, target: Navigation.URLTarget) => void,
    _when: 'pretend' | 'pre-open' | 'pre-replace',
    _from: Page,
    to: Page,
): void {
  next(to);
}

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
 * A key of context value containing an {@link NavigationAgent} instance.
 *
 * The agent returned combines all registered agents into one. If no agent registered it just performs the navigation.
 */
export const NavigationAgent: ContextUpRef<NavigationAgent.Combined, NavigationAgent> = (
    /*#__PURE__*/ new NavigationAgentKey('navigation-agent')
);

import {
  AeComponentMember,
  AeComponentMemberTarget,
  ComponentClass,
  ComponentMember,
  ComponentMemberAmendment,
} from '@wesib/wesib';
import { PageLoadSupport } from '../page-load';
import { PageRenderCtl } from './page-render-ctl';
import { RenderPageDef } from './render-page-def';

/**
 * Creates a {@link RenderPageDef.Method page renderer} method amendment (and decorator).
 *
 * Renders pages using {@link PageRenderCtl page render control}.
 *
 * Utilizes {@link PageLoadParam} navigation parameter.
 *
 * Enables {@link PageLoadSupport} feature.
 *
 * @typeParam TClass - Amended component class type.
 * @typeParam TAmended - Amended component member entity type.
 * @param def - Page inclusion definition.
 *
 * @returns New component method amendment.
 */
export function RenderPage<
    TClass extends ComponentClass,
    TAmended extends AeComponentMember<RenderPageDef.Method, TClass> =
        AeComponentMember<RenderPageDef.Method, TClass>>(
    def?: RenderPageDef,
): ComponentMemberAmendment<RenderPageDef.Method, TClass, RenderPageDef.Method, TAmended> {
  return ComponentMember<RenderPageDef.Method, TClass, RenderPageDef.Method, TAmended>((
      { get, amend }: AeComponentMemberTarget<RenderPageDef.Method, TClass>,
  ) => amend({
    componentDef: {
      feature: {
        needs: [PageLoadSupport],
      },
      define(defContext) {
        defContext.whenComponent(context => {
          context.whenReady(context => {

            const { component } = context;
            const renderer = get(component).bind(component);

            context.get(PageRenderCtl).renderPageBy(renderer, def);
          });
        });
      },
    },
  }));
}

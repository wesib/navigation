import { importNode } from '@frontmeans/dom-primitives';
import { CxValues } from '@proc7ts/context-values';
import { mapOn_ } from '@proc7ts/fun-events';
import { filterArray, filterIt, itsEach, mapIt, PushIterable } from '@proc7ts/push-iterator';
import { BootstrapWindow } from '@wesib/wesib';
import { PageLoadAgent } from './page-load-agent';

export function pageScriptsAgent(context: CxValues): PageLoadAgent {

  const doc = context.get(BootstrapWindow).document;

  return next => next().do(
      mapOn_(response => {
        if (response.ok) {

          const allScripts = new Set<string>(mapIt(
              externalScripts(doc, doc.scripts),
              ([src]) => src,
          ));

          itsEach(
              filterIt(
                  externalScripts(response.document, response.document.querySelectorAll('script')),
                  ([src]) => !allScripts.has(src),
              ),
              ([src, script]) => {
                importNode(script, doc.head, (_from, to) => to.src = src);
                allScripts.add(src);
              },
          );
        }
        return response;
      }),
  );
}

function externalScripts(
    doc: Document,
    scripts: ArrayLike<HTMLScriptElement>,
): PushIterable<readonly [string, HTMLScriptElement]> {
  return mapIt(
      filterArray(scripts, ({ src }) => !!src),
      script => [new URL(script.src, doc.baseURI).href, script] as const,
  );
}

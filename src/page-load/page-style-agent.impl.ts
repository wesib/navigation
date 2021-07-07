import { importNode } from '@frontmeans/dom-primitives';
import { CxValues } from '@proc7ts/context-values';
import { mapOn_ } from '@proc7ts/fun-events';
import { itsEach, itsFirst, overArray } from '@proc7ts/push-iterator';
import { BootstrapWindow } from '@wesib/wesib';
import { PageLoadAgent } from './page-load-agent';

export function pageStyleAgent(context: CxValues): PageLoadAgent {

  const doc = context.get(BootstrapWindow).document;

  return next => next().do(
      mapOn_(response => {
        if (!response.ok) {
          return response;
        }

        const newStyles = response.document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]');

        if (!newStyles.length) {
          return response;
        }

        let target: Node = doc.head;
        let before: Node | null = null;
        const oldStyles = doc.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]');
        const oldStylesByHref = new Map<string, HTMLLinkElement>();
        const firstOldStyle = oldStyles.item(0);

        if (firstOldStyle) {
          target = firstOldStyle.parentNode!;
          before = firstOldStyle;
          itsEach(
              overArray(oldStyles),
              link => oldStylesByHref.set(new URL(link.href, doc.baseURI).href, link),
          );
        }

        itsEach(
            overArray(newStyles),
            newStyle => {

              const href = new URL(newStyle.href, doc.baseURI).href;
              const oldStyle = oldStylesByHref.get(href);

              if (oldStyle) {
                // Style already exists.
                if (itsFirst(oldStylesByHref.keys()) === href) {
                  // In proper position already.
                  // Insert the remaining styles after it.
                  target = oldStyle.parentNode!;
                  before = oldStyle.nextSibling;
                } else {
                  // Move to proper position.
                  target.insertBefore(oldStyle, before);
                }
                oldStylesByHref.delete(href);
              } else {
                // Import new style
                importNode(newStyle, target, before, (_from, to) => to.href = href);
              }
            },
        );

        // Remove remaining old styles
        itsEach(oldStylesByHref.values(), style => style.parentNode!.removeChild(style));

        return response;
      }),
  );
}

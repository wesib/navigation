import { CxValues } from '@proc7ts/context-values';
import { mapOn_ } from '@proc7ts/fun-events';
import { BootstrapWindow } from '@wesib/wesib';
import { PageLoadAgent } from './page-load-agent';

export function pageTitleAgent(context: CxValues): PageLoadAgent {

  const doc = context.get(BootstrapWindow).document;

  return next => next().do(mapOn_(response => {
    if (response.ok) {

      const title = response.document.getElementsByTagName('title').item(0);

      if (title && title.textContent) {
        doc.title = title.textContent;
      }
    }

    return response;
  }));
}

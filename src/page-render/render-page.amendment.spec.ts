import { queuedRenderScheduler } from '@frontmeans/render-scheduler';
import { afterThe } from '@proc7ts/fun-events';
import { noop, valueProvider } from '@proc7ts/primitives';
import { HttpFetch } from '@wesib/generic';
import {
  bootstrapComponents,
  BootstrapWindow,
  Component,
  ComponentContext,
  DefaultPreRenderScheduler,
  DefaultRenderScheduler,
} from '@wesib/wesib';
import { Navigation } from '../navigation';
import { PageLoadAgent, PageLoadParam } from '../page-load';
import { LocationMock } from '../spec/location-mock';
import { PageRenderer, PageRendererExecution } from './page-renderer';
import { RenderPageDef } from './render-page-def';
import { RenderPage } from './render-page.amendment';
import Mock = jest.Mock;

describe('@RenderPage', () => {

  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
  });

  let element: Element;

  beforeEach(() => {
    element = doc.body.appendChild(doc.createElement('page-content'));
    element.innerHTML = '(original content)';
  });

  let locationMock: LocationMock;

  beforeEach(() => {
    locationMock = new LocationMock({ win: window, doc });
  });
  afterEach(() => {
    locationMock.down();
  });

  let html: string;
  let mockFetch: Mock<ReturnType<HttpFetch>, Parameters<HttpFetch>>;
  let mockAgent: Mock<ReturnType<PageLoadAgent>, Parameters<PageLoadAgent>>;

  beforeEach(() => {
    html = '<page-content></page-content>';
    mockFetch = jest.fn((_input, _init?) => afterThe(
        {
          ok: true,
          headers: new Headers(),
          text: () => Promise.resolve(`<html lang="en"><body>${html}</body></html>`),
        } as Response,
    ));
    mockAgent = jest.fn((next, _request) => next());
  });

  it('retains initial content', async () => {
    html = '<page-content>included content</page-content>';

    await bootstrap();

    expect(element.textContent).toBe('(original content)');
  });
  it('includes loaded page fragment', async () => {
    html = '<page-content>included content</page-content>';

    const context = await bootstrap();
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('page').catch(reject);
    });

    expect(element.textContent).toBe('(original content)included content');
  });
  it('includes identified page fragment', async () => {
    html = `
<page-content>not included content</page-content>
<page-fragment id="test">included content</page-fragment>
`;
    element.id = 'test';

    const context = await bootstrap();
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('page').catch(reject);
    });

    expect(element.textContent).toBe('(original content)included content');
  });
  it('includes requested page fragment', async () => {
    html = `
<page-content>not included content</page-content>
<requested-fragment>included content</requested-fragment>
`;
    const context = await bootstrap({ fragment: { tag: 'requested-fragment' } });
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('page').catch(reject);
    });

    expect(element.textContent).toBe('(original content)included content');
  });
  it('clears content if requested fragment not loaded', async () => {
    html = `
<other-fragment>included content</other-fragment>
`;

    const context = await bootstrap({ fragment: { tag: 'requested-fragment' } });
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('page').catch(reject);
    });

    expect(element.childNodes[0].childNodes).toHaveLength(0);
  });
  it('reports page load progress', async () => {
    html = '<page-content>included content</page-content>';

    const render = jest.fn();
    const context = await bootstrap(undefined, render);
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('page').catch(reject);
    });

    expect(render).toHaveBeenLastCalledWith(expect.objectContaining({
      response: expect.objectContaining({ ok: true }),
    }));
    expect(render).toHaveBeenCalledTimes(2);
  });
  it('does not refresh included content if only URL hash changed', async () => {
    html = '<page-content>included content</page-content>';

    const render = jest.fn();
    const context = await bootstrap({}, render);
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open(new URL('#another-hash', navigation.page.url)).catch(reject);
    });

    expect(render).not.toHaveBeenCalled();
  });
  it('does not refresh included content if content key did not change', async () => {
    html = '<page-content>included content</page-content>';

    const render = jest.fn();
    const context = await bootstrap({ contentKey: valueProvider('same') }, render);
    const navigation = context.get(Navigation);

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('other').catch(reject);
    });

    expect(render).not.toHaveBeenCalled();
  });

  describe('postpone', () => {
    it('postpones rendering when content rendered', async () => {
      html = '<page-content>included content</page-content>';

      let textContent: string | null = null;
      const postponed = jest.fn(({ content }: PageRendererExecution) => {
        textContent = content.textContent;
      });
      const context = await bootstrap(undefined, ({ postpone }) => postpone(postponed));
      const navigation = context.get(Navigation);

      await new Promise<void>((resolve, reject) => {
        navigation.with(
            PageLoadParam,
            {
              receiver: r => r.ok && resolve(),
            },
        ).open('page').catch(reject);
      });

      expect(postponed).toHaveBeenCalled();
      expect(textContent).toBe('included content');
    });
  });

  async function bootstrap(def?: RenderPageDef, renderer: PageRenderer = noop): Promise<ComponentContext> {

    @Component(
        {
          feature: {
            setup(setup) {
              setup.provide({ a: BootstrapWindow, is: locationMock.window });
              setup.provide({ a: DefaultRenderScheduler, is: queuedRenderScheduler });
              setup.provide({ a: DefaultPreRenderScheduler, is: queuedRenderScheduler });
              setup.provide({ a: HttpFetch, is: mockFetch });
              setup.provide({ a: PageLoadAgent, is: mockAgent });
            },
          },
        },
    )
    class PageContent {

      @RenderPage(def)
      render = renderer;

    }

    const bsContext = await bootstrapComponents(PageContent).whenReady;
    const defContext = await bsContext.whenDefined(PageContent);

    return defContext.mountTo(element);
  }

});

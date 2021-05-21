import { immediateRenderScheduler } from '@frontmeans/render-scheduler';
import { mapOn_, trackValue, ValueTracker } from '@proc7ts/fun-events';
import { bootstrapComponents, Component, ComponentContext, DefaultRenderScheduler, Feature } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { navAnchor, NavAnchor } from './nav-anchor';
import { NavLink } from './nav-link';

describe('navAnchor', () => {

  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
  });

  let baseURI: string;
  let element: Element;
  let anchor: HTMLAnchorElement;

  beforeEach(() => {
    baseURI = 'http://localhost.localdomain:8888';
    jest.spyOn(doc, 'baseURI', 'get').mockImplementation(() => baseURI);
    element = doc.body.appendChild(doc.createElement('test-element'));
    anchor = element.appendChild(doc.createElement('a'));
  });
  afterEach(() => {
    element.remove();
  });

  let mockNavigation: jest.Mocked<Navigation>;
  let pageURL: ValueTracker<URL>;

  beforeEach(() => {
    pageURL = trackValue(new URL('current-page', baseURI));
    mockNavigation = {
      open: jest.fn(() => Promise.resolve()),
      read: pageURL.read.do(
          mapOn_(url => ({ url })),
      ),
      page: {
        get url() {
          return pageURL.it;
        },
      },
    } as any;
  });

  it('navigates on anchor click instead of default action', async () => {
    anchor.href = `${baseURI}/test`;
    await bootstrap();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    expect(anchor.dispatchEvent(event)).toBe(false);
    expect(mockNavigation.open).toHaveBeenCalledWith(anchor.href);
  });
  it('navigates using default anchor handler if its href has another origin', async () => {
    anchor.href = 'https://localhost.localdomain';
    await bootstrap();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    expect(anchor.dispatchEvent(event)).toBe(true);
    expect(mockNavigation.open).not.toHaveBeenCalled();
  });
  it('prevents navigation if href is the same as current page', async () => {
    anchor.href = `${baseURI}/current-page`;
    await bootstrap();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    expect(anchor.dispatchEvent(event)).toBe(false);
    expect(mockNavigation.open).not.toHaveBeenCalled();
  });
  it('handles expected event', async () => {
    anchor.href = `${baseURI}/test`;
    await bootstrap({ event: 'test:click' });

    const event = new MouseEvent('test:click', { bubbles: true, cancelable: true });

    expect(anchor.dispatchEvent(event)).toBe(false);
    expect(mockNavigation.open).toHaveBeenCalledWith(anchor.href);
  });
  it('does not handle unexpected event', async () => {
    anchor.href = `${baseURI}/test`;
    await bootstrap({ event: 'test:click' });

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    expect(anchor.dispatchEvent(event)).toBe(true);
    expect(mockNavigation.open).not.toHaveBeenCalled();
  });
  it('does not create a link when absent', async () => {

    const context = await bootstrap();

    expect(navAnchor(null)({ context })).toBeUndefined();
  });

  describe('href', () => {
    it('reflects anchor href', async () => {
      anchor.href = `${baseURI}/test`;

      const { component: { navLink } } = await bootstrap();

      expect(navLink.href).toBe(anchor.href);

      anchor.href = `http://localhost/other`;
      expect(navLink.href).toBe(anchor.href);
    });
  });

  describe('activate', () => {
    it('appends CSS class to anchor', async () => {

      const { component: { navLink } } = await bootstrap();

      navLink.activate!();

      expect(anchor.classList).toContain('active@b');
    });
    it('appends custom CSS class to anchor', async () => {

      const { component: { navLink } } = await bootstrap({ active: 'custom-active' });

      navLink.activate!();

      expect(anchor.classList).not.toContain('active@b');
      expect(anchor.classList).toContain('custom-active');
    });
    it('removes CSS class from anchor when deactivated', async () => {

      const { component: { navLink } } = await bootstrap({ event: 'test:click' });

      navLink.activate!().off();

      expect(anchor.classList).not.toContain('active@b');
    });
  });

  async function bootstrap(options?: NavAnchor.Options): Promise<ComponentContext<{ readonly navLink: NavLink }>> {

    @Component()
    @Feature({
      setup(setup) {
        setup.provide({ a: Navigation, is: mockNavigation });
        setup.provide({ a: DefaultRenderScheduler, is: immediateRenderScheduler });
      },
    })
    class TestComponent implements NavLink.Owner {

      readonly navLink: NavLink;

      constructor(readonly context: ComponentContext) {
        this.navLink = navAnchor(anchor, options)(this)!;
      }

    }

    const bsContext = await bootstrapComponents(TestComponent).whenReady;
    const defContext = await bsContext.whenDefined(TestComponent);

    return defContext.mountTo(element);
  }
});

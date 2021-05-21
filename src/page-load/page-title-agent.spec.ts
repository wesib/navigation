import { afterThe } from '@proc7ts/fun-events';
import { HttpFetch } from '@wesib/generic';
import { bootstrapComponents, BootstrapContext, BootstrapWindow, Feature } from '@wesib/wesib';
import { Navigation } from '../navigation';
import { LocationMock } from '../spec/location-mock';
import { PageLoadParam } from './page-load-param';
import { PageLoadSupport } from './page-load-support.feature';
import Mock = jest.Mock;

describe('pageTitleAgent', () => {

  let doc: Document;
  let locationMock: LocationMock;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
    doc.title = 'Initial Title';
    jest.spyOn(doc, 'baseURI', 'get').mockImplementation(() => 'http://localhost/index');
    locationMock = new LocationMock({ doc });
    (locationMock.window as any).DOMParser = DOMParser;
  });
  afterEach(() => {
    locationMock.down();
  });

  let responseHtml: string;
  let mockFetch: Mock<ReturnType<HttpFetch>, Parameters<HttpFetch>>;
  let context: BootstrapContext;

  beforeEach(async () => {
    responseHtml = '<html></html>';
    mockFetch = jest.fn((_input, _init?) => afterThe({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve(responseHtml),
    } as Response));

    @Feature({
      needs: PageLoadSupport,
      setup(setup) {
        setup.provide({ a: BootstrapWindow, is: locationMock.window });
        setup.provide({ a: HttpFetch, is: mockFetch });
      },
    })
    class TestFeature {}

    context = await bootstrapComponents(TestFeature).whenReady;
  });

  let navigation: Navigation;

  beforeEach(() => {
    navigation = context.get(Navigation);
  });

  it('sets loaded page title to document', async () => {
    responseHtml = `
<html>
<head>
<title>New Title</title>
</head>
</html>`;
    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some').catch(reject);
    });
    expect(doc.title).toBe('New Title');
  });
  it('does not update page title if absent in loaded document', async () => {
    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some').catch(reject);
    });
    expect(doc.title).toBe('Initial Title');
  });
  it('does not update page title if loaded document has empty title', async () => {
    responseHtml = `
<html>
<head>
<title></title>
</head>
</html>`;
    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some').catch(reject);
    });
    expect(doc.title).toBe('Initial Title');
  });
});

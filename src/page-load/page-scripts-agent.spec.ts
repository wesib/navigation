import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cxConstAsset } from '@proc7ts/context-builder';
import { afterThe } from '@proc7ts/fun-events';
import { noop } from '@proc7ts/primitives';
import { HttpFetch } from '@wesib/generic';
import { bootstrapComponents, BootstrapContext, BootstrapWindow, Feature } from '@wesib/wesib';
import { Mock } from 'jest-mock';
import { Navigation } from '../navigation';
import { LocationMock } from '../spec/location-mock';
import { PageLoadParam } from './page-load-param';
import { PageLoadSupport } from './page-load-support.feature';

describe('pageScriptsAgent', () => {

  let doc: Document;
  let locationMock: LocationMock;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('test');
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
        setup.provide(cxConstAsset(BootstrapWindow, locationMock.window));
        setup.provide(cxConstAsset(HttpFetch, mockFetch));
      },
    })
    class TestFeature {}

    context = await bootstrapComponents(TestFeature).whenReady;
  });

  let navigation: Navigation;

  beforeEach(() => {
    navigation = context.get(Navigation);
  });

  it('appends loaded page scripts to document', async () => {
    responseHtml = `
<html>
<head>
<base href="http://localhost/"/>
<script src="js/test.js" type="module"></script>
</head>
<body></body>
</html>`;
    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some').catch(reject);
    });
    expect(doc.scripts).toHaveLength(1);

    const script = doc.scripts[0];

    expect(script.src).toBe('http://localhost/js/test.js');
    expect(script.type).toBe('module');
  });
  it('does not appends loaded page scripts for the second time', async () => {
    responseHtml = `
<html>
<head>
<base href="http://localhost/"/>
<script src="js/test.js" type="module"></script>
</head>
<body></body>
</html>`;
    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/some').catch(reject);
    });

    responseHtml = `
<html>
<head>
<base href="http://localhost/"/>
<script src="js/test.js" type="module"></script>
<script src="js/test2.js" type="module"></script>
</head>
<body></body>
</html>`;

    await new Promise<void>((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok && resolve(),
          },
      ).open('/other').catch(reject);
    });

    expect(doc.scripts).toHaveLength(2);
    expect(doc.scripts[0].src).toBe('http://localhost/js/test.js');
    expect(doc.scripts[1].src).toBe('http://localhost/js/test2.js');
  });
  it('does not appends inline script to document', async () => {
    responseHtml = `
<html>
<head>
<base href="http://localhost/"/>
<script>alert('!');</script>
</head>
<body></body>
</html>`;
    await navigation.with(PageLoadParam, { receiver: noop }).open('/some');
    expect(doc.scripts).toHaveLength(0);
  });
  it('passes error messages through', async () => {
    mockFetch.mockImplementation(() => afterThe({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/unknown' }),
      text: () => Promise.resolve(responseHtml),
    } as Response));

    const response = await new Promise((resolve, reject) => {
      navigation.with(
          PageLoadParam,
          {
            receiver: r => r.ok === false && resolve(r),
          },
      ).open('/other').catch(reject);
    });

    expect(response).toMatchObject({ ok: false });
  });
});

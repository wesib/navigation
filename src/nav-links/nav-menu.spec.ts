import { CustomHTMLElement } from '@frontmeans/dom-primitives';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cxConstAsset } from '@proc7ts/context-builder';
import { afterThe, trackValue, translateAfter_ } from '@proc7ts/fun-events';
import { Supply } from '@proc7ts/supply';
import { BootstrapWindow, Component, ComponentContext, ComponentSlot } from '@wesib/wesib';
import { MockElement, testElement } from '@wesib/wesib/testing';
import { Mock } from 'jest-mock';
import { Navigation } from '../navigation';
import { Page } from '../page';
import { MockObject } from '../spec';
import { LocationMock } from '../spec/location-mock';
import { NavLink } from './nav-link';
import { NavMenu } from './nav-menu';

describe('NavMenu', () => {

  let locationMock: LocationMock;

  beforeEach(() => {
    locationMock = new LocationMock({ win: window });
    jest.spyOn(document, 'baseURI', 'get').mockImplementation(() => locationMock.baseURI());
  });
  afterEach(() => {
    locationMock.down();
  });

  let context: ComponentContext;

  beforeEach(async () => {
    @Component({
      extend: { type: MockElement },
      feature: {
        setup(setup) {
          setup.provide(cxConstAsset(BootstrapWindow, locationMock.window));
        },
      },
    })
    class TestComponent {}

    const element: CustomHTMLElement = new (await testElement(TestComponent))();

    context = await ComponentSlot.of(element).whenReady;
    element.connectedCallback!();
  });

  it('is constructed by links provider function', () => {

    const link1 = testLink('index/path');
    const link2 = testLink('index');
    const link3 = testLink('other');

    new NavMenu(() => afterThe(link1, link2, link3)).bindTo(context);

    expect(link1.activate).not.toHaveBeenCalled();
    expect(link2.activate).toHaveBeenCalledTimes(1);
    expect(link3.activate).not.toHaveBeenCalled();
  });
  it('is constructed by empty links provider function', () => {

    const link1 = testLink('index/path');
    const link2 = testLink('index');
    const link3 = testLink('other');

    new NavMenu(() => [link1, () => null, link3]).bindTo(context);

    expect(link1.activate).not.toHaveBeenCalled();
    expect(link2.activate).not.toHaveBeenCalled();
    expect(link3.activate).not.toHaveBeenCalled();
  });
  it('supports non-activatable links', async () => {

    const link1 = testLink('index/path');
    const link2: NavLink = {
      href: 'index',
    };
    const link3 = testLink('other');

    const links = trackValue<NavLink[]>([link1, link2, link3]);

    new NavMenu(links.read.do(
        translateAfter_((send, links) => send(...links)),
    )).bindTo(context);

    expect(link1.activate).not.toHaveBeenCalled();
    expect(link3.activate).not.toHaveBeenCalled();

    const navigation = context.get(Navigation);

    await navigation.open('index/path');

    expect(link1.activate).toHaveBeenCalledTimes(1);
    expect(link3.activate).not.toHaveBeenCalled();

    links.it = [link3];
    expect(lastActivation(link1).isOff).toBe(true);
  });
  it('does not accept disabled nav link', () => {

    const link1 = testLink('index/path');
    const link2 = testLink('index');
    const link3 = testLink('other');

    link2.supply.off();
    new NavMenu([link1, link2, link3]).bindTo(context);

    expect(link1.activate).not.toHaveBeenCalled();
    expect(link2.activate).not.toHaveBeenCalled();
    expect(link3.activate).not.toHaveBeenCalled();
  });
  it('removes disabled nav link', () => {

    const link1 = testLink('index/path');
    const link2 = testLink('index');
    const link3 = testLink('other');

    new NavMenu([link1, link2, link3]).bindTo(context);

    link2.supply.off();

    expect(link1.activate).not.toHaveBeenCalled();
    expect(link2.activate).toHaveBeenCalledTimes(1);
    expect(link3.activate).not.toHaveBeenCalled();
    expect(lastActivation(link2).isOff).toBe(true);
  });
  it('allows to disable nav links activation', () => {

    const link1 = testLink('index/path');
    const link2 = testLink('index');
    const link3 = testLink('other');

    new NavMenu([link1, link2, link3], { activate: false }).bindTo(context);

    expect(link1.activate).not.toHaveBeenCalled();
    expect(link2.activate).not.toHaveBeenCalled();
    expect(link3.activate).not.toHaveBeenCalled();
  });

  describe('supply', () => {
    it('disables nav links', () => {

      const link1 = testLink('index/path');
      const link2 = testLink('index');
      const link3 = testLink('other');

      new NavMenu([link1, link2, link3]).bindTo(context).supply.off();

      expect(link1.supply.isOff).toBe(true);
      expect(link2.supply.isOff).toBe(true);
      expect(link3.supply.isOff).toBe(true);
    });
  });

  describe('activation by path', () => {

    let link1: MockObject<Required<NavLink>>;
    let link2: MockObject<Required<NavLink>>;
    let link3: MockObject<Required<NavLink>>;

    beforeEach(() => {
      link1 = testLink('index/path');
      link2 = testLink('index');
      link3 = testLink('other');
    });

    it('activates nav link with longest matching URL', () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
    });
    it('activates multiple nav link with longest matching URL', () => {
      link3 = testLink('index');

      new NavMenu([link1, link2, link3]).bindTo(context);

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).toHaveBeenCalledTimes(1);
    });
    it('moves active nav link after navigation', async () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index/path');

      expect(link1.activate).toHaveBeenCalledTimes(1);
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
      expect(lastActivation(link2).isOff).toBe(true);
    });
    it('does not deactivate nav link after navigation to matching page', async () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index/other');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
    });
    it('deactivates all links when navigated to non-matching location', async () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('non-matching');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
      expect(lastActivation(link2).isOff).toBe(true);
    });
    it('never activates nav link with another origin', async () => {
      link2 = testLink('https://test.com/');

      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('');

      expect(link2.activate).not.toHaveBeenCalled();
    });
    it('moves active nav link after removing active one', async () => {

      const links = trackValue<NavLink[]>([link1, link2, link3]);

      new NavMenu(links.read.do(
          translateAfter_((send, links) => send(...links)),
      )).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index/path');

      links.it = [link2, link3];

      expect(link1.activate).toHaveBeenCalledTimes(1);
      expect(link2.activate).toHaveBeenCalledTimes(2);
      expect(link3.activate).not.toHaveBeenCalled();
      expect(link1.supply.isOff).toBe(true);
      expect(lastActivation(link1).isOff).toBe(true);
      expect(lastActivation(link2).isOff).toBe(false);
    });
    it('moves active nav link after adding more suitable one', async () => {

      const links = trackValue<NavLink[]>([link1, link2, link3]);

      new NavMenu(links.read.do(
          translateAfter_((send, links) => send(...links)),
      )).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?some=other');

      const link4 = testLink('index?some=other');

      links.it = [link1, link2, link3, link4];

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
      expect(link4.activate).toHaveBeenCalledTimes(1);
      expect(lastActivation(link2).isOff).toBe(true);
      expect(lastActivation(link4).isOff).toBe(false);
    });
    it('does not move active nav link after adding less suitable one', async () => {

      const links = trackValue<NavLink[]>([link1, link2, link3]);

      new NavMenu(links.read.do(
          translateAfter_((send, links) => send(...links)),
      )).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?some=other');

      const link4 = testLink('other?some=other');

      links.it = [link1, link2, link3, link4];

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
      expect(link4.activate).not.toHaveBeenCalled();
      expect(lastActivation(link2).isOff).toBe(false);
    });
    it('does not move active nav link if links did not updated', () => {

      const links = trackValue<NavLink[]>([link1, link2, link3]);

      new NavMenu(links.read.do(
          translateAfter_((send, links) => send(...links)),
      )).bindTo(context);

      links.it = [link1, link2, link3];

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
      expect(lastActivation(link2).isOff).toBe(false);
    });
  });

  describe('activation by search parameters', () => {

    let link1: MockObject<Required<NavLink>>;
    let link2: MockObject<Required<NavLink>>;
    let link3: MockObject<Required<NavLink>>;

    beforeEach(() => {
      link1 = testLink('index?a=1');
      link2 = testLink('index?a=1&b=2&b=3');
      link3 = testLink('index?a=1&b=2');
    });

    it('activates nav link with all matching parameters', async () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?b=2&a=1&b=3');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
    });
    it('activates nav link with most matching parameters', async () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?b=2&a=1');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link3.activate).toHaveBeenCalledTimes(1);
      expect(lastActivation(link3).isOff).toBe(false);
    });
    it('does not activate nav link with different search parameters', async () => {
      link3 = testLink('index?a=1&b=33');

      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?a=1&b=2');

      expect(link1.activate).toHaveBeenCalledTimes(1);
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link3.activate).not.toHaveBeenCalled();
      expect(lastActivation(link1).isOff).toBe(false);
    });
    it('ignores double-underscored parameters', async () => {
      link3 = testLink('index?a=1&b=2&__ignore__=1');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?b=2&a=1&__ignore__=2');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link3.activate).toHaveBeenCalledTimes(1);
      expect(lastActivation(link3).isOff).toBe(false);
    });
    it('activates nav link with the same dir path', async () => {
      link1 = testLink('index/?a=1');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?a=1');

      expect(link1.activate).toHaveBeenCalledTimes(1);
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link3.activate).not.toHaveBeenCalled();
      expect(lastActivation(link1).isOff).toBe(false);
    });
    it('does not activate nav link with different path', async () => {
      link1 = testLink('other?a=1');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('index?a=1');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link3.activate).not.toHaveBeenCalled();
    });
  });

  describe('activation by hash parameters', () => {

    let link1: MockObject<Required<NavLink>>;
    let link2: MockObject<Required<NavLink>>;
    let link3: MockObject<Required<NavLink>>;

    beforeEach(() => {
      link1 = testLink('path#hash?a=1');
      link2 = testLink('path#hash?a=1&b=2&b=3');
      link3 = testLink('path#hash?a=1&b=2');
    });

    it('activates nav link with matching hash', async () => {
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('path#hash/?b=2&a=1&b=3');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
    });
    it('activates nav link with matching hash and search parameters', async () => {
      link1 = testLink('path?foo=bar#/hash?a=1');
      link2 = testLink('path?foo=bar#/hash?a=1&b=2&b=3');
      link3 = testLink('path?foo=bar#/hash?a=1&b=2');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('path?foo=bar#hash/?b=2&a=1');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link3.activate).toHaveBeenCalledTimes(1);
    });
    it('does not activate nav link with different path', async () => {
      link1 = testLink('other?a=1#hash?a=1');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('other#hash?a=1');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link1.activate).not.toHaveBeenCalled();
    });
    it('does not activate nav link with lesser search params', async () => {
      link1 = testLink('path?foo=1#hash?a=1');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('path?foo=1&bar=2#index?a=1');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link1.activate).not.toHaveBeenCalled();
    });
    it('does not activate nav link with more search params', async () => {
      link1 = testLink('path?foo=1&bar=2&bar=3#hash?a=1');
      new NavMenu([link1, link2, link3]).bindTo(context);

      const navigation = context.get(Navigation);

      await navigation.open('path?foo=1&bar=2#index?a=1');

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).not.toHaveBeenCalled();
      expect(link1.activate).not.toHaveBeenCalled();
    });
  });

  describe('activation with custom weighing', () => {

    let link1: MockObject<Required<NavLink>>;
    let link2: MockObject<Required<NavLink>>;
    let link3: MockObject<Required<NavLink>>;
    let weigh: Mock<
        number,
        [{ link: NavLink; menu: NavMenu; page: Page }]>;

    beforeEach(() => {
      link1 = testLink('1');
      link2 = testLink('2');
      link3 = testLink('3');
      weigh = jest.fn(({ link: { href } }) => href.includes('2') ? 1 : 0);
    });

    it('activates nav link with highest weights', () => {
      new NavMenu([link1, link2, link3], { weigh }).bindTo(context);

      expect(link1.activate).not.toHaveBeenCalled();
      expect(link2.activate).toHaveBeenCalledTimes(1);
      expect(link3.activate).not.toHaveBeenCalled();
    });
  });

  function testLink(href: string): MockObject<Required<NavLink>> {
    return {
      href,
      supply: new Supply(),
      activate: jest.fn(() => new Supply()),
    };
  }

  function lastActivation(link: MockObject<Required<NavLink>>): Supply {

    const results = link.activate.mock.results;

    return results[results.length - 1].value as Supply;
  }
});

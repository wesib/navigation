import { jest } from '@jest/globals';
import { MockObject } from '@wesib/wesib/testing';
import { Page } from '../page';
import { PageParam } from '../page-param';

export function testPageParamHandle(
    state: { value: string } = { value: '' },
): MockObject<PageParam.Handle<string, string>> {
  return {
    get: jest.fn(() => state.value),
    put: jest.fn(newValue => {
      state.value = newValue;
    }),
    transfer: jest.fn(),
    enter: jest.fn(),
    stay: jest.fn(),
    leave: jest.fn(),
    forget: jest.fn(),
  };
}

export function testPageParam(
    value = '',
): [PageParam<string, string>, MockObject<PageParam.Handle<string, string>>] {

  const state = { value };
  const handle = testPageParamHandle(state);

  class TestParam extends PageParam<string, string> {

    create(_page: Page, initValue: string): PageParam.Handle<string, string> {
      state.value = initValue;
      return handle;
    }

  }

  return [new TestParam(), handle];
}

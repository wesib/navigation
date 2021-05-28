import { MockFn } from './mock-fn';

export type MockObject<T extends object> = T & {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? MockFn<T[K]> : T[K];
};

import { FunctionLike, Mock } from 'jest-mock';

export type MockObject<T extends object> = T & {
  [K in keyof T]: T[K] extends FunctionLike ? Mock<T[K]> : T[K];
};

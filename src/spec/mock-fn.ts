import { Mock } from 'jest-mock';

export type MockFn<T extends (...args: any[]) => any> = T extends (...args: any[]) => any
    ? Mock<ReturnType<T>, Parameters<T>>
    : never;

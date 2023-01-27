import { configureJest } from '@run-z/project-config';

export default await configureJest({
  restoreMocks: true,
  setupFiles: ['cross-fetch/polyfill'],
  testEnvironment: 'jsdom',
});

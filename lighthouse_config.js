export const RUNNER_CONFIG = {
  RUNS: 3, // Number of runs per page
  TARGET: 'SYSTEM', // could be live, dev or some other system
  CHROME: {
    START: true,
    HEADLESS: true,
    ADD_HEADER: false,
    PORT: 55542
  },
  SETUP: {
    SYSTEM: {
      AUTH_HEADER: null, // if your test system needs an auth
      PAGES: [] // list of urls to test
    },
  },
  LIGHTHOUSE: {
    CATEGORIES: ['accessibility'], // categories to test (seo, performance...)
    AUDITS: [], // could be only "largest-contenful-paint" for performance
  }
}

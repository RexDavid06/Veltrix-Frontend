export default {
  test: {
    environment: 'jsdom',
    globals: true,
    environmentOptions: {
      url: 'http://localhost:3000',
    },
    setupFiles: ['./vitest.setup.js'],
  },
}

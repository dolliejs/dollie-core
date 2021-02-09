import { defineConfig } from 'dumi';

export default defineConfig({
  title: 'Dollie',
  outputPath: 'docs/dist',
  mode: 'doc',
  publicPath: '/',
  base: 'docs',
  locales: [
    ['en', 'English'],
    ['zh', '中文'],
  ],
  copy: [
    {
      from: 'docs/public',
      to: 'public'
    },
  ],
  theme: {
    '@c-primary': '#457B9D',
  },
  favicon: '/public/images/favicon.ico',
  resolve: {
    includes: ['docs'],
    previewLangs: [],
  },
  navs: {
    en: [
      null,
      {
        title: 'GitHub',
        path: 'https://github.com/dolliejs/dollie',
      },
    ],
    zh: [
      null,
      {
        title: 'GitHub',
        path: 'https://github.com/dolliejs/dollie',
      },
    ],
  },
  logo: '/public/images/dollie.svg',
  exportStatic: {},
});

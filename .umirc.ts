import { defineConfig } from 'dumi';

export default defineConfig({
  title: 'Dollie',
  outputPath: 'docs/dist',
  mode: 'site',
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
  styles: [
    'img { max-width: 720px !important; }',
    '.__dumi-default-locale-select, .__dumi-default-search-input { border-radius: 0 !important; }',
    '.__dumi-default-locale-select, .__dumi-default-search-input:focus { border: 1px solid rgba(255, 255, 255, .4) !important; }',
    '.__dumi-default-menu-doc-locale { display: none !important; }',
    '.__dumi-default-navbar { background-color: #0b0f13 !important; box-shadow: 0 0 0.2rem rgb(0 0 0 / 10%), 0 0.2rem 0.4rem rgb(0 0 0 / 20%) !important; }',
    '.__dumi-default-search-input { background-color: rgba(255, 255, 255, .1) !important; color: rgba(255, 255, 255, .8) !important; }',
    '.__dumi-default-navbar-logo { font-size: 22px !important; color: white !important; }',
    '.__dumi-default-navbar nav > span > a:not(.active) { color: rgba(255, 255, 255, .6) !important; }',
    '.__dumi-default-navbar nav > span > a:not(.active):hover { color: rgba(255, 255, 255, .8) !important; }',
    '.__dumi-default-navbar nav > span > a.active::after { display: none !important; }',
    '.__dumi-default-locale-select:hover { background-color: transparent !important; }',
  ],
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

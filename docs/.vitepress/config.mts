/// <reference types="node" />  // 👈 keep this if you use TypeScript

import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'

// ⚠️ make sure this matches your repo name exactly
const repoName = 'myPortfolio'

export default defineConfig({
  title: 'Portfolio',
  description: 'A VitePress Site',

  // GitHub Pages project site: https://<user>.github.io/<repo>/
  base: isProd ? `/${repoName}/` : '/',

  themeConfig: {
    nav: [
      // ❌ no BASE_URL here, just plain paths
      { text: 'Home',  link: '/' },
      { text: 'about', link: '/about/' },
      { text: 'works', link: '/works/' },
    ],
  },

  head: [
    [
      'link',
      {
        rel: 'stylesheet',
        href:
          'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=Roboto+Mono:wght@400;500;600;700&display=swap'
      }
    ]
  ]
})

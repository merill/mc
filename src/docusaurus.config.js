// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'M365 Message Center Archive',
  tagline: 'A place to find all the M365 Message Center messages',
  favicon: 'img/favicon.svg',

  // Set the production url of your site here
  url: 'https://mc.merill.net',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'merill', // Usually your GitHub org/user name.
  projectName: 'mc', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'M365 Message Center Archive',
        logo: {
          alt: 'MC Archive Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            href: 'https://cmd.ms',
            label: 'cmd.ms'
          },
          {
            href: 'https://merill.net',
            label: 'merill.net',
          },
          {
            href: 'https://entra.news',
            label: 'entra.news',
          },
          {
            href: '/about',
            label: 'About',
            position: 'right',
          },
          {
            href: 'https://github.com/merill/aka',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
            position: 'right',
          },
          {
            href: 'https://twitter.com/merill',
            className: 'header-twitter-link',
            'aria-label': 'Twitter',
            position: 'right',
          }
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Learn',
            items: [
              {
                label: 'About me',
                to: 'https://merill.net/about/',
              },
            ],
          },
          {
            title: 'My Projects',
            items: [
              {
                label: 'Graph X-Ray',
                href: 'https://graphxray.merill.net',
              },
              {
                label: 'Graph Permissions Explorer',
                href: 'https://graphpermissions.merill.net',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: 'https://merill.net',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/merill',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Merill Fernando.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),

    plugins: [
      async function myPlugin(context, options) {
        return {
          name: "docusaurus-tailwindcss",
          configurePostCss(postcssOptions) {
            // Appends TailwindCSS and AutoPrefixer.
            postcssOptions.plugins.push(require("tailwindcss"));
            postcssOptions.plugins.push(require("autoprefixer"));
            return postcssOptions;
          },
        };
      },
    ],
};

export default config;

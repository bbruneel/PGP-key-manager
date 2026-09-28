import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'PGP Key Manager',
    description:
      'Manage OpenPGP keys, team vaults, SSH setup packs, and BYO storage connections.',
    base: '/PGP-key-manager/',
    cleanUrls: true,
    ignoreDeadLinks: [
      // Redoc is copied into dist/api after the VitePress build
      /^\/api\/?/,
      // Local dev URLs in setup / QA docs
      /^https?:\/\/localhost/,
    ],
    themeConfig: {
      siteTitle: 'PGP Key Manager',
      nav: [
        { text: 'User guide', link: '/user/getting-started' },
        { text: 'Develop', link: '/develop/local-setup' },
        { text: 'API', link: '/api/overview' },
        { text: 'Changelog', link: '/changelog/phases' },
        {
          text: 'OpenAPI',
          link: '/api/',
          target: '_blank',
        },
      ],
      sidebar: {
        '/user/': [
          {
            text: 'User guide',
            items: [
              { text: 'Getting started', link: '/user/getting-started' },
            ],
          },
          {
            text: 'Keys',
            items: [
              { text: 'Create a primary key', link: '/user/keys/create' },
              { text: 'Import and preview', link: '/user/keys/import-and-preview' },
              { text: 'List and filters', link: '/user/keys/list-and-filters' },
              { text: 'Key detail', link: '/user/keys/detail' },
              { text: 'Subkeys', link: '/user/keys/subkeys' },
              { text: 'Export public', link: '/user/keys/export-public' },
              { text: 'Export private', link: '/user/keys/export-private' },
              { text: 'SSH setup', link: '/user/keys/ssh-setup' },
              { text: 'Revoke and certificates', link: '/user/keys/revoke-and-certs' },
              { text: 'Transfer ownership', link: '/user/keys/transfer-ownership' },
            ],
          },
          {
            text: 'Teams',
            items: [
              { text: 'Team vaults', link: '/user/teams/vaults' },
              { text: 'Members and invites', link: '/user/teams/members-and-invites' },
            ],
          },
          {
            text: 'Settings',
            items: [
              {
                text: 'Storage connections',
                link: '/user/settings/storage-connections',
              },
            ],
          },
          {
            text: 'Concepts',
            items: [
              { text: 'Primary vs subkey', link: '/user/concepts/primary-vs-subkey' },
              { text: 'Vault ownership', link: '/user/concepts/vault-ownership' },
            ],
          },
        ],
        '/develop/': [
          {
            text: 'Develop',
            items: [
              { text: 'Local setup', link: '/develop/local-setup' },
              { text: 'Auth0', link: '/develop/auth0' },
              { text: 'Database', link: '/develop/database' },
              { text: 'Frontend', link: '/develop/frontend' },
              { text: 'Backend', link: '/develop/backend' },
              { text: 'Architecture', link: '/develop/architecture' },
              { text: 'Storage ref URI', link: '/develop/storage-ref' },
              { text: 'Manual QA', link: '/develop/manual-qa' },
              { text: 'Contributing', link: '/develop/contributing' },
            ],
          },
        ],
        '/api/': [
          {
            text: 'API',
            items: [
              { text: 'Overview', link: '/api/overview' },
              { text: 'OpenAPI reference', link: '/api/' },
            ],
          },
        ],
        '/changelog/': [
          {
            text: 'Changelog',
            items: [{ text: 'Phase history', link: '/changelog/phases' }],
          },
        ],
      },
      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/bbruneel/PGP-key-manager',
        },
      ],
      search: {
        provider: 'local',
      },
      editLink: {
        pattern:
          'https://github.com/bbruneel/PGP-key-manager/edit/main/docs/:path',
        text: 'Edit this page on GitHub',
      },
      footer: {
        message: 'PGP Key Manager documentation',
        copyright: 'Unlicense',
      },
    },
    mermaid: {},
  }),
)

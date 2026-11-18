// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';

// The one place the public address lives: canonical URLs, the sitemap, llms.txt and the changelog feed derive from it.
const site = 'https://docs.colophon.404human.dev';
const repo = 'https://github.com/akira-shirase-oss/colophon-docs';

export default defineConfig({
	site,
	trailingSlash: 'always',
	output: 'static',
	integrations: [
		starlight({
			title: 'Colophon Docs',
			description:
				'Documentation for Colophon, the open-source headless CMS that records what it published: quick start, the Studio, the delivery and management APIs, API tokens, the SDK, the CLI and self-hosting.',
			logo: { light: './src/assets/colophon-mark-light.svg', dark: './src/assets/colophon-mark-dark.svg', alt: 'Colophon' },
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'Colophon on GitHub', href: 'https://github.com/akira-shirase-oss/colophon-cms' },
			],
			editLink: { baseUrl: `${repo}/edit/main/` },
			lastUpdated: true,
			pagination: true,
			credits: false,
			titleDelimiter: '·',
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			customCss: ['./src/styles/theme.css'],
			head: [
				{ tag: 'link', attrs: { rel: 'preload', href: '/fonts/geist-400.woff2', as: 'font', type: 'font/woff2', crossorigin: '' } },
				{ tag: 'link', attrs: { rel: 'preload', href: '/fonts/dm-sans-600.woff2', as: 'font', type: 'font/woff2', crossorigin: '' } },
				{ tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'Colophon changelog', href: `${site}/changelog/rss.xml` } },
				{ tag: 'meta', attrs: { property: 'og:image', content: `${site}/og.png` } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
			],
			expressiveCode: {
				themes: ['github-dark-default', 'github-light-default'],
				styleOverrides: {
					borderRadius: '0.5rem',
					codeFontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
					uiFontFamily: 'Geist, system-ui, sans-serif',
				},
			},
			components: {
				PageTitle: './src/components/PageTitle.astro',
				Footer: './src/components/Footer.astro',
			},
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ label: 'Introduction', slug: 'index' },
						{ label: 'Quick start', slug: 'quick-start' },
						{ label: 'Installation', slug: 'installation' },
						{ label: 'Core concepts', slug: 'concepts' },
					],
				},
				{
					label: 'Using the Studio',
					collapsed: true,
					items: [
						{ label: 'Writing and autosave', slug: 'studio/writing' },
						{ label: 'Rich text and images', slug: 'studio/rich-text-and-images' },
						{ label: 'Media library', slug: 'studio/media-library' },
						{ label: 'Preview', slug: 'studio/preview' },
						{ label: 'Publishing and review', slug: 'studio/publishing' },
						{ label: 'Scheduling', slug: 'studio/scheduling' },
						{ label: 'History and restore', slug: 'studio/history' },
						{ label: 'Rollback', slug: 'studio/rollback' },
						{ label: 'Comments and tasks', slug: 'studio/comments-and-tasks' },
						{ label: 'Languages', slug: 'studio/languages' },
						{ label: 'Linked entries', slug: 'studio/linked-entries' },
						{ label: 'Settings', slug: 'studio/settings' },
						{ label: 'Members and roles', slug: 'studio/members-and-roles' },
					],
				},
				{
					label: 'APIs',
					items: [
						{ label: 'Overview', slug: 'api' },
						{ label: 'Authentication & API tokens', slug: 'api/authentication' },
						{ label: 'Delivery API', slug: 'api/delivery' },
						{ label: 'Management API', slug: 'api/management' },
						{ label: 'GraphQL', slug: 'api/graphql' },
						{ label: 'Website connections & receipts', slug: 'api/website-connections' },
						{ label: 'Live events', slug: 'api/live-events' },
						{ label: 'Errors', slug: 'api/errors' },
						{ label: 'Rate limits', slug: 'api/rate-limits' },
						{ label: 'API reference', link: '/api/reference/', attrs: { 'data-reference': '' } },
					],
				},
				{
					label: 'Tools',
					items: [
						{ label: 'TypeScript SDK', slug: 'sdk' },
						{ label: 'CLI', slug: 'cli' },
						{ label: 'MCP server for agents', slug: 'mcp' },
					],
				},
				{
					label: 'Self-hosting',
					collapsed: true,
					items: [
						{ label: 'Configuration', slug: 'self-hosting/configuration' },
						{ label: 'Database TLS', slug: 'self-hosting/database-tls' },
						{ label: 'Backups and restore', slug: 'self-hosting/backups' },
						{ label: 'Monitoring', slug: 'self-hosting/monitoring' },
						{ label: 'Security notes', slug: 'self-hosting/security' },
					],
				},
				{ label: 'Changelog', link: '/changelog/' },
			],
			plugins: [
				starlightLinksValidator({ errorOnLocalLinks: true, exclude: ['/api/reference/', '/changelog/', '/changelog/**'] }),
				starlightLlmsTxt({
					projectName: 'Colophon',
					description:
						'Colophon is an open-source headless CMS (Rust server, SvelteKit Studio) where every publish is a numbered release with a receipt. Public reads go through the anonymous delivery API at /content/v1; scripts and tools write through the management API at /api/v1 with a project API token.',
					customSets: [
						{ label: 'APIs', description: 'Authentication, API tokens, delivery, management, GraphQL, live events, errors and rate limits.', paths: ['api/**'] },
						{ label: 'Studio', description: 'The editor guide.', paths: ['studio/**'] },
						{ label: 'Self-hosting', description: 'Configuration, TLS, backups, monitoring and security.', paths: ['self-hosting/**'] },
					],
				}),
			],
		}),
	],
});

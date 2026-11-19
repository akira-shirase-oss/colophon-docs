// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import { focusableCode } from './src/lib/focusable-code.mjs';

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
			// Inter (the Studio's own package and axis), the tokens (a byte copy of colophon-cms design/tokens.css,
			// D-210) and the theme that maps them onto Starlight.
			customCss: ['@fontsource-variable/inter/opsz.css', './src/styles/tokens.css', './src/styles/theme.css'],
			head: [
				{ tag: 'link', attrs: { rel: 'preload', href: '/fonts/geist-pixel-latin.woff2', as: 'font', type: 'font/woff2', crossorigin: '' } },
				// The tokens name their dark theme `.dark` (as the Studio does); Starlight names it data-theme="dark".
				// This keeps the class in step from the first paint and on every switch, so each Starlight
				// variable maps to one token role (src/styles/theme.css). Without JavaScript the page is light.
				{
					tag: 'script',
					content:
						"(()=>{const r=document.documentElement,s=()=>r.classList.toggle('dark',r.dataset.theme==='dark');s();new MutationObserver(s).observe(r,{attributes:true,attributeFilter:['data-theme']})})();",
				},
				{ tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'Colophon changelog', href: `${site}/changelog/rss.xml` } },
				{ tag: 'meta', attrs: { property: 'og:image', content: `${site}/og.png` } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				// An accessibility fix to Starlight's output: the search button shows "Search" and its
				// shortcut (⌘K or Ctrl K), so its name says both, as speech input reads them (WCAG 2.5.3).
				// Starlight swaps ⌘ for Ctrl off a Mac, sometimes after this runs, so the name follows
				// the shortcut's text whenever it changes; and a space separates the visible words
				// ("Search Ctrl K", not "SearchCtrlK"), so the name contains what is shown.
				// (Wide tables and code blocks take keyboard focus from the build instead, WCAG 2.1.1:
				// src/lib/focusable-code.mjs and scripts/focusable-tables.mjs, so they do without JavaScript too.)
				{
					tag: 'script',
					content:
						"document.addEventListener('DOMContentLoaded',()=>{for(const b of document.querySelectorAll('button[data-open-modal]')){const n=()=>{const p=[b.querySelector('span'),...b.querySelectorAll('kbd kbd')];for(const e of p.slice(0,-1))if(e&&e.nextSibling?.nodeValue!==' ')e.after(' ');const k=[...b.querySelectorAll('kbd kbd')].map(e=>e.textContent.trim()).join(' ');if(k)b.setAttribute('aria-label','Search '+k)};n();const s=b.querySelector('kbd');if(s)new MutationObserver(n).observe(s,{subtree:true,childList:true,characterData:true})}});",
				},
			],
			expressiveCode: {
				plugins: [focusableCode()],
				themes: ['github-dark', 'github-light'],
				styleOverrides: {
					// The Studio's code: GitHub's light and dark themes (as its highlighter), its shapes and type.
					borderRadius: 'calc(var(--radius) - 4px)',
					borderColor: 'var(--border)',
					codeFontFamily: 'var(--font-mono)',
					uiFontFamily: 'var(--font-sans)',
				},
			},
			components: {
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
				Footer: './src/components/Footer.astro',
				SocialIcons: './src/components/SocialIcons.astro',
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

// Structured data for search engines: built as objects, serialised once. Never concatenate strings
// into a JSON-LD block. `JSON.stringify` leaves `</script>` and `<!--` as they are, so a title
// holding either would end the block early, and the rest would be read as markup. Writing `<`, `>`
// and `&` as \u escapes keeps them out of the HTML while the parsed data stays exactly the same.

/** The body of a `<script type="application/ld+json">` block. */
export function jsonLd(data) {
	return (JSON.stringify(data) ?? 'null').replace(/[<>&]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

// The product's website owns the organisation; the docs refer to it by @id. The publisher is the
// project, never a person.
export const LANDING = 'https://colophon.404human.dev/';
export const ORGANIZATION_ID = `${LANDING}#organization`;
const organization = { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'Colophon CMS', url: LANDING };

/**
 * The JSON-LD blocks for one docs page.
 * @param {{ site: string, path: string, title: string, description?: string, lastUpdated?: Date }} page
 *   `path` is the page's own path with its trailing slash ('/' for the introduction).
 */
export function docsJsonLd({ site, path, title, description, lastUpdated }) {
	const home = new URL('/', site).href;
	const url = new URL(path, site).href;
	const website = { '@type': 'WebSite', '@id': `${home}#website`, name: 'Colophon Docs', url: home, inLanguage: 'en', publisher: organization };
	if (path === '/') return [{ '@context': 'https://schema.org', ...website, description }];

	// Docs › (API, for pages under /api/, whose overview is a page) › this page.
	const trail = [{ name: 'Docs', item: home }];
	if (path.startsWith('/api/') && path !== '/api/') trail.push({ name: 'APIs', item: new URL('/api/', site).href });
	trail.push({ name: title });
	const breadcrumbs = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: trail.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
	};
	const article = {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: title,
		...(description ? { description } : {}),
		url,
		mainEntityOfPage: url,
		inLanguage: 'en',
		...(lastUpdated ? { dateModified: lastUpdated.toISOString() } : {}),
		author: organization,
		publisher: organization,
		isPartOf: { '@id': website['@id'] },
	};
	return [breadcrumbs, article];
}

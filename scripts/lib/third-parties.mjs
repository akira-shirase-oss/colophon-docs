// The only hosts other than this site that any page may contact, and why. Keep this list, the
// content security policy in public/_headers and the privacy checks in step: check-dist fails if the
// policy names any other origin, and check-privacy fails if a page contacts any other host.
//
// Cloudflare Web Analytics (maintainer, 19 November 2026): cookieless page views and real-user Core
// Web Vitals, which Search needs and lab tests can't give. Cloudflare adds its beacon to every page
// it serves; the script comes from the first host and reports to the second. Nothing else (no other
// analytics, tag managers or pixels).
export const ANALYTICS_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
export const ANALYTICS_REPORT_ORIGIN = 'https://cloudflareinsights.com';
export const ALLOWED_THIRD_PARTY_HOSTS = Object.freeze([new URL(ANALYTICS_SCRIPT_ORIGIN).host, new URL(ANALYTICS_REPORT_ORIGIN).host]);

/**
 * The hosts in `contacted` that are neither the site's own nor on the allowlist. Exact host match
 * only: a subdomain or a look-alike of an allowed host is foreign.
 * @param {Iterable<string>} contacted hosts as `URL#host` gives them
 * @param {Iterable<string>} own the site's own hosts (and any test servers)
 */
export function foreignHosts(contacted, own) {
	const allowed = new Set([...own, ...ALLOWED_THIRD_PARTY_HOSTS]);
	return [...contacted].filter((host) => !allowed.has(host));
}

import type { APIRoute } from 'astro';
import spec from '../data/openapi.json?raw';

/** Colophon's OpenAPI document, byte for byte as colophon-cms `main` commits it (CI checks the copy). */
export const GET: APIRoute = () =>
	new Response(spec, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

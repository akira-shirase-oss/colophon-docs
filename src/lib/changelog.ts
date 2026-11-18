import { getCollection, type CollectionEntry } from 'astro:content';

export type Change = CollectionEntry<'changelog'>;

/** Newest first; entries on the same day keep a stable order by name. */
export async function changes(): Promise<Change[]> {
	const all = await getCollection('changelog');
	return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id));
}

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const monthOf = (date: Date) => MONTH.format(date);
export const dayOf = (date: Date) => DAY.format(date);
export const monthId = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** Group already-sorted entries by calendar month (UTC). */
export function byMonth(entries: Change[]): { id: string; label: string; entries: Change[] }[] {
	const months: { id: string; label: string; entries: Change[] }[] = [];
	for (const entry of entries) {
		const id = monthId(entry.data.date);
		let month = months.at(-1);
		if (month?.id !== id) {
			month = { id, label: monthOf(entry.data.date), entries: [] };
			months.push(month);
		}
		month.entries.push(entry);
	}
	return months;
}

/** The anchor of an entry on /changelog/: its file name without the extension. */
export const anchorOf = (entry: Change) => entry.id.replace(/\.md$/, '').split('/').pop() ?? entry.id;

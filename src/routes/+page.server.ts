import { publicCache } from '#lib/server/cache.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ setHeaders }) => {
	publicCache(setHeaders);
};

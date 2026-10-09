import { describe, expect, it } from 'vitest';
import { robotsTxt, sitemapXml } from './seo';

describe('sitemapXml', () => {
	it('lists every public path as an absolute URL', () => {
		const xml = sitemapXml('https://example.com', ['/', '/privacy']);
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain('<loc>https://example.com/</loc>');
		expect(xml).toContain('<loc>https://example.com/privacy</loc>');
	});
});

describe('robotsTxt', () => {
	it('allows public pages, blocks /api/, and points to the sitemap', () => {
		expect(robotsTxt('https://example.com')).toBe(
			'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://example.com/sitemap.xml\n'
		);
	});
});

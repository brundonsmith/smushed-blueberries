import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://smushed-blueberries.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/smushthemberries/'], // Block admin page from search engines
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
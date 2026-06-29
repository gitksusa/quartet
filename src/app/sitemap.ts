import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('slug')
    .eq('is_recruit_enabled', true)

  return (tenants ?? []).map((tenant) => ({
    url: `https://www.qrtt.jp/${tenant.slug}/recruit`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))
}

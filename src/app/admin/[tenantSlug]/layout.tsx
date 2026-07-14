import { notFound } from 'next/navigation'

import { assertTenantSlugAllowed } from '@/lib/tenant/access'
import {
  TenantAccessDeniedError,
  TenantNotFoundError,
} from '@/lib/tenant/errors'

/**
 * /admin/[tenantSlug] 配下の第一関門。
 * ここは唯一の関門ではない。データ書き込みを伴う Server Action / Route Handler は
 * 個別に assertTenantSlugAllowed を再検証すること（詳細は src/lib/tenant/access.ts 参照）。
 */
export default async function AdminTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params

  try {
    await assertTenantSlugAllowed(tenantSlug)
  } catch (err) {
    if (
      err instanceof TenantAccessDeniedError ||
      err instanceof TenantNotFoundError
    ) {
      notFound()
    }
    throw err
  }

  return <>{children}</>
}

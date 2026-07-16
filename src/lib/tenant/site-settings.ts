import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import { TenantNotFoundError } from './errors'

/**
 * getOwnerTenantSiteSettings の返り値。
 * templateType が null の場合は「site_settings 未作成」の正常系を意味する
 * （membership は OK だが tenant_site_settings 行がまだ作成されていない）。
 */
export type OwnerTenantSiteSettings = {
  tenantId: string
  templateType: string | null
}

/**
 * 認証済みユーザーが所有する tenant（URL の tenantSlug と一致）の
 * site_settings を取得する。
 *
 * 検証の流れ:
 *   1. requireAuth() で WorkOS 認証セッションを確立し workos_user_id を得る
 *   2. public.get_owner_tenant_site_settings_for_workos_user() SECURITY DEFINER
 *      RPC で workos_user_id + tenantSlug を起点に tenant_users → tenants →
 *      tenant_site_settings (LEFT JOIN) を辿り (tenant_id, template_type) を
 *      1 件取得する
 *   3. 0 件: 所属不整合として TenantNotFoundError を throw する
 *   4. 1 件: templateType を返す（null なら未設定・正常系）
 *
 * 検証方向の制約（access.ts と同じ原則）:
 *   URL の slug を起点に tenants / tenant_site_settings を検索する経路は書かない。
 *   起点は必ず認証済み workos_user_id 側であり、tenantSlug は RPC 内で AND
 *   条件として使うだけ。他テナントの存在推測に繋がる列挙経路を作らない。
 *
 * 認可の正しさは公開ページ用の tenant_site_settings_public_read policy に
 * 依存させない。専用の SECURITY DEFINER 関数（0005）経由でのみ取得する。
 *
 * 認可の階層方針（PR3 / PR4 の申し送りと同旨）:
 *   /admin/[tenantSlug]/layout.tsx が第一関門として assertTenantSlugAllowed で
 *   認可済み。本 helper は「認可通過後の read」として site_settings を取得する。
 *   ただし本 helper 自身も workos_user_id + tenantSlug を DB 内で再検証する
 *   ため、layout をバイパスして直接呼ばれた場合でも 0 件検出で認可失敗を返せる。
 *   PR8 以降で追加する Server Action / Route Handler も、この helper と同じ
 *   「認証 → workos_user_id 起点 → 認可専用 RPC」の pattern で実装すること。
 *
 * 0 件の扱い:
 *   0 件は「未設定」ではなく「所属不整合（認可失敗相当）」として扱い、必ず
 *   throw する。呼び出し側で null 変換して握りつぶさないこと。layout の第一
 *   関門を通過した後にここで 0 件が返るのは、race condition か実装バグ・データ
 *   不整合であり、UI で正常系として扱わず throw を素通しさせる。
 *
 * templateType が null の扱い:
 *   これは正常系（未設定）。呼び出し側で `templateType ?? '未設定'` などと
 *   フォールバックしてよい。throw しない。
 *
 * RPC 失敗時:
 *   generic Error を throw する。notFound() には丸めない（PR3 のエラー分類方針
 *   を踏襲）。呼び出し側 page.tsx は catch せず、Next.js の error boundary に
 *   処理を委ねる。
 *
 * 呼び出し制約: Server Component / Route Handler / Server Action からのみ
 * 呼び出す。Client Component からは呼び出さない（server-only）。
 */
export async function getOwnerTenantSiteSettings(
  tenantSlug: string,
): Promise<OwnerTenantSiteSettings> {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'get_owner_tenant_site_settings_for_workos_user',
    {
      p_workos_user_id: user.id,
      p_tenant_slug: tenantSlug,
    },
  )

  if (error) {
    throw new Error(
      `Failed to resolve tenant site settings via RPC: ${error.message} (code: ${error.code ?? 'unknown'})`,
    )
  }

  const rows = (data ?? []) as Array<{
    tenant_id: string
    template_type: string | null
  }>

  if (rows.length === 0) {
    throw new TenantNotFoundError(user.id)
  }

  const { tenant_id, template_type } = rows[0]
  return {
    tenantId: tenant_id,
    templateType: template_type,
  }
}

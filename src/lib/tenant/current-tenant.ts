import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import { TenantNotFoundError } from './errors'

/**
 * 認証済みユーザーが所有する tenant の slug を取得する。
 *
 * 検証の流れ:
 *   1. requireAuth() で WorkOS 認証セッションを確立し workos_user_id を得る
 *   2. public.get_owner_tenant_for_workos_user() SECURITY DEFINER RPC で
 *      workos_user_id を起点に tenant_users → tenants を JOIN し
 *      (tenant_id, slug) を1件取得する
 *   3. 0 件: 所属不整合として TenantNotFoundError を throw する
 *   4. 1 件: slug を返す
 *
 * 使用場面:
 *   ログイン後のリダイレクト先決定など、事前に slug を知らない状態から
 *   「認証済みユーザーが所有する tenant の slug」を取得したい場面で使う。
 *   URL 由来の slug が既にある場合の検証は access.ts の
 *   assertTenantSlugAllowed(tenantSlug) を使う（責務分離）。
 *
 * 検証方向の制約（access.ts / site-settings.ts と同じ原則）:
 *   起点は必ず認証済み workos_user_id 側。ハードコードした slug や URL 由来の
 *   slug から検索する経路は書かない。他テナントの存在推測に繋がる列挙経路を
 *   作らない。
 *
 * 認可の正しさは公開ページ用の RLS に依存させない。専用の SECURITY DEFINER
 * 関数（0004・access.ts が使っているのと同じ RPC）を再利用する。新規 RPC・
 * 新規 migration は追加しない。
 *
 * 0 件の扱い:
 *   0 件は「未所属」として TenantNotFoundError を throw する。呼び出し側で
 *   null 変換して握りつぶさないこと。呼び出し側は用途に応じて処理する
 *   （ルート page.tsx はエラー表示に変換する）。
 *
 * RPC 失敗時:
 *   generic Error を throw する。notFound() や redirect には丸めない
 *   （PR3 のエラー分類方針を踏襲）。呼び出し側は Next.js の error boundary
 *   に処理を委ねるか、用途に応じて表示する。
 *
 * 呼び出し制約: Server Component / Route Handler / Server Action からのみ
 * 呼び出す。Client Component からは呼び出さない（server-only）。
 */
export async function getOwnedTenantSlugForCurrentUser(): Promise<string> {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'get_owner_tenant_for_workos_user',
    {
      p_workos_user_id: user.id,
    },
  )

  if (error) {
    throw new Error(
      `Failed to resolve owned tenant slug via RPC: ${error.message} (code: ${error.code ?? 'unknown'})`,
    )
  }

  const rows = (data ?? []) as Array<{ tenant_id: string; slug: string }>

  if (rows.length === 0) {
    throw new TenantNotFoundError(user.id)
  }

  return rows[0].slug
}

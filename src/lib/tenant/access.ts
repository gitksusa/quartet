import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import { TenantAccessDeniedError, TenantNotFoundError } from './errors'

/**
 * URL の tenantSlug が認証済みユーザーの所属テナントの slug と一致するかを検証し、
 * 一致すれば tenant_id を返す。
 *
 * 検証の流れ:
 *   1. requireAuth() で WorkOS 認証セッションを確立し workos_user_id を得る
 *   2. public.get_owner_tenant_for_workos_user() SECURITY DEFINER RPC で
 *      workos_user_id を起点に tenant_users → tenants を JOIN し
 *      (tenant_id, slug) を1件取得する
 *   3. 取得した slug と URL の tenantSlug を文字列比較する
 *   4. 一致すれば tenant_id を返す
 *
 * 検証方向の制約:
 *   URL の slug を起点に tenants を検索する経路（例: from('tenants').eq('slug', urlSlug)）は
 *   書かない。起点は必ず認証済み workos_user_id 側であり、slug は結果の照合のみに使う。
 *   これにより他テナントの存在推測に繋がる列挙経路を作らない。
 *
 * 認可の正しさは公開ページ用の tenants anon RLS に依存させない。
 * このため専用の SECURITY DEFINER 関数（0004）経由でのみ tenant コンテキストを取得する。
 *
 * 認可の階層方針（重要・PR4 以降の実装者への申し送り）:
 *   PR3 の /admin/[tenantSlug]/layout.tsx はこの関数を「第一関門」として使うが、
 *   これで完結させない。PR4 以降で追加する各 Server Action / Route Handler では、
 *   受け取った tenantSlug（またはリソース ID から解決した slug）を用いて必ず
 *   この access.ts の関数で個別に再検証する。layout のガードだけを信じない
 *   （キャッシュ・並行実行・呼び出し漏れ・future リファクタでの外し忘れを想定）。
 *   RLS は最終防壁として維持する（3層目）。
 *
 * 不一致時の変換方針（PR3 時点）:
 *   layout 側で TenantAccessDeniedError を catch し notFound() へ変換する。
 *   403 レスポンスは PR4 以降で Server Action を追加する時に検討する。
 *
 * 呼び出し制約: Server Component / Route Handler / Server Action からのみ呼び出す。
 * Client Component からは呼び出さない（server-only）。
 */
export async function assertTenantSlugAllowed(tenantSlug: string): Promise<string> {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_owner_tenant_for_workos_user', {
    p_workos_user_id: user.id,
  })

  if (error) {
    throw new Error(
      `Failed to resolve tenant context via RPC: ${error.message} (code: ${error.code ?? 'unknown'})`,
    )
  }

  const rows = (data ?? []) as Array<{ tenant_id: string; slug: string }>
  if (rows.length === 0) {
    throw new TenantNotFoundError(user.id)
  }

  const { tenant_id, slug } = rows[0]

  if (slug !== tenantSlug) {
    throw new TenantAccessDeniedError(tenant_id, tenantSlug)
  }

  return tenant_id
}

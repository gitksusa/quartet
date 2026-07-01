import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import { TenantNotFoundError } from './errors'

/**
 * 現在ログイン中の WorkOS ユーザーに紐づく tenant_id を解決する。
 *
 * 設計拘束条件（docs/design/auth-tenant-access-control.md §5）:
 *   - 解決は public.get_tenant_id_for_workos_user() RPC 経由のみ。
 *     service_role は使わない。
 *   - workos_user_id は必ず requireAuth() の返却値を採用する。
 *     外部入力（クライアント・URL パラメータ等）を受け取らない。
 *   - 0件（tenant 未所属）の場合は TenantNotFoundError を throw し、黙って続行しない。
 *   - 2件以上のランタイム検出は PR2 では行わない
 *     （0003_tenant_lookup_function.sql の実行後確認[確認4] で手動検出）。
 *
 * 呼び出し制約:
 *   Server Component / Route Handler / Server Action からのみ呼び出す。
 *   Client Component の useEffect 内で呼び出さない（無限ループ事故防止）。
 */
export async function resolveTenantIdForCurrentUser(): Promise<string> {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_tenant_id_for_workos_user', {
    p_workos_user_id: user.id,
  })

  if (error) {
    throw new Error(
      `Failed to resolve tenant_id via RPC: ${error.message} (code: ${error.code ?? 'unknown'})`,
    )
  }

  if (!data) {
    throw new TenantNotFoundError(user.id)
  }

  return data as string
}

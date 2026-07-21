import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/session'
import { isMoodId, type MoodId } from '@/lib/constants/site-settings'
import { TenantNotFoundError } from './errors'

/**
 * getOwnerTenantSiteSettings の返り値。
 * templateType が null の場合は「site_settings 未作成」または「未設定」の正常系。
 * mood が null の場合は「未設定」または「DB に入っていた値がアプリ層の MOODS に
 * 含まれない未知値だったため isMoodId() で null に正規化された」の正常系。
 * 詳細は getOwnerTenantSiteSettings の doc および
 * docs/design/hp-db-schema.md 節1 の mood カラムの節参照。
 */
export type OwnerTenantSiteSettings = {
  tenantId: string
  templateType: string | null
  mood: MoodId | null
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
    mood: string | null
  }>

  if (rows.length === 0) {
    throw new TenantNotFoundError(user.id)
  }

  const { tenant_id, template_type, mood: rawMood } = rows[0]
  // mood は DB 側で列挙検証されない（0007 の CHECK 制約は NULL と長さのみ）ため、
  // 読み取り時に isMoodId() 型ガードで既知値へ正規化する。未知値は null 化する
  // （UI 上は「未設定」表示・STEP2 で保存すれば既知値に上書きされる）。unknown mood
  // の値そのものはログに残さない（CLAUDE.md セキュリティ制約・値内容の温存回避）。
  // template_type には対応する正規化を設けない。理由: 0006 の SECURITY DEFINER 関数が
  // DB 側で列挙検証をしており、不正値が書き込まれる経路が存在しない（非対称は意図的・
  // 詳細は src/lib/constants/site-settings.ts の isMoodId doc 参照）。
  const mood: MoodId | null =
    rawMood !== null && isMoodId(rawMood) ? rawMood : null
  return {
    tenantId: tenant_id,
    templateType: template_type,
    mood,
  }
}

/**
 * 認証済みユーザーが所有する tenant（URL の tenantSlug と一致）の
 * template_type を保存する（UPSERT）。
 *
 * 検証の流れ:
 *   1. requireAuth() で WorkOS 認証セッションを確立し workos_user_id を得る
 *   2. public.upsert_owner_tenant_template_type_for_workos_user() SECURITY DEFINER
 *      RPC で workos_user_id + tenantSlug + templateType を渡す
 *   3. RPC が 0 行返却（認可失敗）→ TenantNotFoundError を throw
 *   4. RPC が 1 行返却（認可 OK・UPSERT 完了）→ tenantId を返す
 *
 * 検証方向の制約（access.ts / getOwnerTenantSiteSettings の read 側と同じ原則）:
 *   起点は必ず認証済み workos_user_id 側。tenantSlug と templateType は RPC 内で
 *   AND 条件・許容値検証に使うだけで、他テナントの列挙経路を作らない。
 *
 * 認可の正しさは公開ページ用 RLS に依存させない。専用の SECURITY DEFINER 関数
 * （0006）経由でのみ書き込みを行う。
 *
 * template_type の許容値検証:
 *   RPC 側（0006）が 'atmosphere','gallery','staff','conversion','trust','brand'
 *   以外を受け取ると例外を throw する。呼び出し側（Server Action）で入力を絞る
 *   のと合わせた二重防御。
 *
 * 0 件の扱い（認可失敗）:
 *   layout の第一関門を通過した後にここで 0 件が返るのは、race condition か実装
 *   バグ・データ不整合であり、UI で正常系として扱わず throw を素通しさせる
 *   （既存 getOwnerTenantSiteSettings と同じ方針）。
 *
 * RPC 失敗時（例外含む）:
 *   generic Error を throw する。呼び出し側 Server Action は catch せず Next.js
 *   の error boundary に処理を委ねる。
 *
 * 呼び出し制約: Server Component / Route Handler / Server Action からのみ呼び出す。
 * Client Component からは呼び出さない（server-only）。
 */
export async function saveOwnerTenantTemplateType(
  tenantSlug: string,
  templateType: string,
): Promise<{ tenantId: string }> {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'upsert_owner_tenant_template_type_for_workos_user',
    {
      p_workos_user_id: user.id,
      p_tenant_slug: tenantSlug,
      p_template_type: templateType,
    },
  )

  if (error) {
    throw new Error(
      `Failed to save tenant template_type via RPC: ${error.message} (code: ${error.code ?? 'unknown'})`,
    )
  }

  const rows = (data ?? []) as Array<{ tenant_id: string }>

  if (rows.length === 0) {
    throw new TenantNotFoundError(user.id)
  }

  return { tenantId: rows[0].tenant_id }
}

/**
 * 認証済みユーザーが所有する tenant（URL の tenantSlug と一致）の
 * mood を保存する（UPDATE 専用・INSERT はしない）。
 *
 * 検証の流れ:
 *   1. requireAuth() で WorkOS 認証セッションを確立し workos_user_id を得る
 *   2. public.update_owner_tenant_mood_for_workos_user() SECURITY DEFINER RPC で
 *      workos_user_id + tenantSlug + mood を渡す
 *   3. RPC が 0 行返却 → TenantNotFoundError を throw
 *   4. RPC が 1 行返却（認可 OK・UPDATE 完了）→ tenantId を返す
 *
 * UPDATE 専用の理由:
 *   tenant_site_settings.template_type は NOT NULL DEFAULT なし（0001）。site_settings
 *   行が未作成のテナントで mood だけを UPSERT すると 23502 not_null_violation に
 *   なる。したがって本 helper は UPDATE のみを行い、site_settings 行の作成は PR8 の
 *   saveOwnerTenantTemplateType（0006 の UPSERT）に委ねる。詳細は 0007 SQL ヘッダ
 *   【UPDATE 専用にする設計判断】参照。
 *
 * 0 行返却の 2 意味（案 P・同一エラーで扱う）:
 *   (i) 認可 NG（owner 不一致 / slug 不一致 / deleted_at）
 *   (ii) 認可 OK だが site_settings 行が未作成（STEP1 未完了）
 *   両方 rows.length === 0 → TenantNotFoundError で throw（PR8 の
 *   saveOwnerTenantTemplateType と同じパターン）。UI 側（step2-mood-picker.tsx）で
 *   currentTemplateType === null 時に保存ボタンを事前 disabled しているため、
 *   (ii) は通常操作で到達しない。到達した場合は Next.js の error boundary が処理する。
 *
 * mood の許容値検証:
 *   RPC 側（0007）が NULL / 長さ 0 / 長さ 51 以上を受け取ると 22023 例外を throw する。
 *   列挙値検証は DB 側で行わない（mood 追加時 migration 不要の思想維持・詳細は
 *   src/lib/constants/site-settings.ts の doc 参照）。呼び出し側（Server Action）で
 *   MOODS 定数由来の値のみを渡すことでアプリ層バリデーションと組み合わせる。
 *
 * RPC 失敗時:
 *   generic Error を throw する。呼び出し側 Server Action は catch せず Next.js の
 *   error boundary に処理を委ねる。
 *
 * 呼び出し制約: Server Component / Route Handler / Server Action からのみ呼び出す。
 * Client Component からは呼び出さない（server-only）。
 */
export async function saveOwnerTenantMood(
  tenantSlug: string,
  mood: string,
): Promise<{ tenantId: string }> {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'update_owner_tenant_mood_for_workos_user',
    {
      p_workos_user_id: user.id,
      p_tenant_slug: tenantSlug,
      p_mood: mood,
    },
  )

  if (error) {
    throw new Error(
      `Failed to save tenant mood via RPC: ${error.message} (code: ${error.code ?? 'unknown'})`,
    )
  }

  const rows = (data ?? []) as Array<{ tenant_id: string }>

  if (rows.length === 0) {
    throw new TenantNotFoundError(user.id)
  }

  return { tenantId: rows[0].tenant_id }
}

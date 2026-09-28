'use server'

import { revalidatePath } from 'next/cache'

import { isMoodId } from '@/lib/constants/site-settings'
import { saveOwnerTenantMood, saveOwnerTenantTemplateType } from '@/lib/tenant/site-settings'

/**
 * STEP1: テンプレート選択の保存 Server Action。
 *
 * - 認可通過後 layout の内側から呼ばれる Client Component 経由で invoke される想定
 * - workos_user_id は saveOwnerTenantTemplateType() 内部で requireAuth() から取得。
 *   Server Action の引数からは受け取らない（外部入力を認可情報にしない原則）
 * - templateType の一次検証は saveOwnerTenantTemplateType 経由で 0006 RPC が担う
 * - 保存成功時は revalidatePath で /admin/[tenantSlug] を再検証し、page.tsx が
 *   最新の tenant_site_settings.template_type を再取得・再描画する
 * - トースト等の成功表示は実装しない（PR8 スコープ外）。ページ再描画による
 *   「選択済み」状態の反映で完了とする
 * - 失敗時は throw を素通しさせる。Next.js の error boundary が処理する
 */
export async function saveTemplateAction(
  tenantSlug: string,
  templateType: string,
): Promise<void> {
  await saveOwnerTenantTemplateType(tenantSlug, templateType)
  revalidatePath(`/admin/${tenantSlug}`)
}

/**
 * STEP2: mood 選択の保存 Server Action。
 *
 * - workos_user_id は saveOwnerTenantMood() 内部で requireAuth() から取得
 * - mood の列挙値検証は Server Action 冒頭の isMoodId() が担う。MOODS に無い値は
 *   ここで throw し、DB へ到達させない（0007 は NULL 拒否 + 長さ 1〜50 + 認可判定
 *   + UPDATE 専用を担うが、列挙検証はしない）
 * - template_type 側は 0006 RPC が DB で列挙検証するため Server Action に検証を
 *   置かない。mood のみ Server Action で検証するのはこの非対称を補うため
 * - 保存成功時は revalidatePath で /admin/[tenantSlug] を再検証し、page.tsx が
 *   最新の tenant_site_settings.mood を再取得・再描画する
 * - トースト等の成功表示は実装しない（PR8 と同じ）
 * - 失敗時は throw を素通しさせる。Next.js の error boundary が処理する
 * - 「認可 NG」と「site_settings 行なし（STEP1 未完了）」は helper 側で両方
 *   TenantNotFoundError として扱う（案 P・詳細は 0007 SQL ヘッダおよび
 *   saveOwnerTenantMood の doc 参照）。UI 側で currentTemplateType === null 時に
 *   事前 disabled しているため site_settings 行なしのケースは通常操作で到達しない
 */
export async function saveMoodAction(
  tenantSlug: string,
  mood: string,
): Promise<void> {
  if (!isMoodId(mood)) {
    throw new Error('Invalid mood')
  }

  await saveOwnerTenantMood(tenantSlug, mood)
  revalidatePath(`/admin/${tenantSlug}`)
}

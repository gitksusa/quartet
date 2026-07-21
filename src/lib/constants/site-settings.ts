/**
 * サイト設定の共有定数（Client / Server Action / Server Component から import 可能）。
 *
 * server-only は付けない。純粋定数モジュール（副作用なし・型と値のみ）。
 *
 * DB 側許容値との同期方針:
 *   - template_type: 0006 SQL 内でも重複定義（DB 側許容値検証・
 *     hp-template-patterns.md「mood との扱いの非対称性」参照）。テンプレ追加時は
 *     本ファイルと 0006 SQL の両方を更新する。DB 側が列挙検証するため不正値は
 *     書き込みで弾かれる。読み取り時のアプリ層正規化は行わない（非対称）
 *   - mood: DB 側は列挙検証を行わない（0007 の CHECK 制約は NULL と長さのみ）。
 *     本ファイルの MOODS 定数がアプリ層の許容値の Source of Truth。mood 追加は
 *     本ファイルの更新のみ（migration 不要）。読み取り時は isMoodId() で既知値へ
 *     正規化する（詳細は docs/design/hp-db-schema.md の mood カラムの節参照）
 */

export const TEMPLATE_TYPES = [
  { id: 'atmosphere', name: 'Atmosphere（世界観型）' },
  { id: 'gallery',    name: 'Gallery（作品型）' },
  { id: 'staff',      name: 'Staff / Artist（人物型）' },
  { id: 'conversion', name: 'Menu / Conversion（予約特化型）' },
  { id: 'trust',      name: 'Trust / Treatment（信頼・技術型）' },
  { id: 'brand',      name: 'Brand / Multi Service（ブランド・複数サービス型）' },
] as const

export type TemplateTypeId = (typeof TEMPLATE_TYPES)[number]['id']

export const MOODS = [
  { id: 'modern',  name: 'Modern（シャープ・都会的・直線的）' },
  { id: 'natural', name: 'Natural（柔らか・木質感・アイボリー基調）' },
  { id: 'elegant', name: 'Elegant（高級・落ち着き・深色）' },
] as const

export type MoodId = (typeof MOODS)[number]['id']

/**
 * テンプレごとの「おすすめ mood」順位（運営 / AI 選定の定数）。
 * 表示ラベルは「おすすめ」のみ。「人気」は使わない（景表法配慮・実データ集計は
 * 後続 PR での対応・docs/design/hp-template-patterns.md「おすすめ/人気ランキング」参照）。
 *
 * Record<TemplateTypeId, readonly MoodId[]> 型により、テンプレ追加時に対応 mood
 * を書かないとコンパイルエラー（対応漏れを型で防ぐ）。
 */
export const RECOMMENDED_MOODS_BY_TEMPLATE: Record<TemplateTypeId, readonly MoodId[]> = {
  atmosphere: ['natural', 'elegant', 'modern'],
  gallery:    ['modern', 'elegant', 'natural'],
  staff:      ['natural', 'modern', 'elegant'],
  conversion: ['modern', 'elegant', 'natural'],
  trust:      ['elegant', 'natural', 'modern'],
  brand:      ['modern', 'elegant', 'natural'],
} as const

export function isTemplateTypeId(value: string): value is TemplateTypeId {
  return TEMPLATE_TYPES.some((t) => t.id === value)
}

/**
 * DB から取得した mood 値がアプリ層で既知の MOODS に含まれるかを判定する型ガード。
 *
 * mood は DB 側で列挙検証を行わない設計のため、理論上 MOODS 以外の値が
 * tenant_site_settings.mood に入り得る（0007 の CHECK 制約は NULL と長さ 1〜50
 * のみ）。読み取り側で本ガードを通し、未知値は null に正規化してから UI へ渡す。
 *
 * template_type には対応する型ガードを設けない。理由: 0006 の SECURITY DEFINER
 * 関数が DB 側で列挙検証をしており、不正値が書き込まれる経路が存在しない。
 * mood との非対称は意図的（詳細は docs/design/hp-db-schema.md 節1 の mood カラム
 * 節参照）。
 */
export function isMoodId(value: string): value is MoodId {
  return MOODS.some((m) => m.id === value)
}

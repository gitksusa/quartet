# ADR-006: テナントページのURL構造（/s/プレフィックス廃止）

## ステータス
採用済み

## 背景
当初のURL設計では `/s/{slug}/` というプレフィックスを採用していた。
PR #2（fix: enu求人ページのURL是正）にて、Geminiの提案により `/s/` を廃止し
`/{slug}/` に変更した。

## 決定
テナントページのURLは `/{slug}/` 形式を正式採用する。

qrtt.jp/{slug}/          # サロン・クリニックHP
qrtt.jp/{slug}/recruit   # 求人ページ
qrtt.jp/{slug}/reserve   # 予約ページ

Next.jsのフォルダ構成は `src/app/[slug]/` とする。
ページコンポーネント内では `params.slug` でテナントのslugを取得する。

## 理由
- URLの可読性向上（`/s/` という意味のない文字が消える）
- enuオーナーへの説明がシンプルになる

## トレードオフ・リスク
- テナントslugとシステムルート（`/dashboard`・`/api`等）が同じ名前空間に混在する
- テナント登録時に以下のreserved slugsを拒否する仕組みが必要（将来実装）

### Reserved Slugs（テナント登録時に使用禁止）
dashboard, api, admin, login, signup, pricing, about, terms, privacy, help, support

## 影響範囲
- `src/app/[slug]/` 配下の全ページ
- テナント登録フォーム（将来実装時にバリデーション追加が必要）
- `docs/architecture.md` のURL構成節を更新済み

## 参照
- PR #2: fix: enu求人ページのURL是正・SEOメタデータ追加・UI改善
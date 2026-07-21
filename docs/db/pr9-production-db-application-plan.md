# PR9 本番DB適用計画

**Status**: 未実施
**Created**: 2026-07-21
**関連PR**: PR9（STEP2: mood 選択の保存 / 次回リリースタグは確定時に決定）
**関連migration**: `0007`（`0002` は依然対象外・後述）

---

## 背景（なぜこの計画書が必要か）

PR9 のコード（`src/lib/tenant/site-settings.ts` の `saveOwnerTenantMood()` 追記、`getOwnerTenantSiteSettings()` の返り値に mood 追加、および Server Action `saveMoodAction()`）は以下の DB 変更に依存する。

- `saveOwnerTenantMood()` → `public.update_owner_tenant_mood_for_workos_user()`（`0007` で新規追加）
- `getOwnerTenantSiteSettings()` → `public.get_owner_tenant_site_settings_for_workos_user()`（`0007` で **in-place 置換**・返り値型を拡張）
- `tenant_site_settings.mood` カラム（`0007` で ALTER TABLE 追加）+ CHECK 制約 `tenant_site_settings_mood_length_check`

本番 DB に `0007` の変更が反映されない状態で PR9 のコードが main へ出ると、次の症状が発生する:
- `/admin/[tenantSlug]` の初期表示: 置換前の 0005 は 2 列しか返さないため、helper 側の destructure で `mood` が undefined となり型不整合。実行時エラー（500）またはビルド時型エラー
- STEP2 の保存: update RPC 未存在で Server Action エラー

---

## 本番 DB の現状（想定・適用直前に必ず再確認）

**注意**: 以下は「想定」であり、実際に `0007` を本番へ適用する直前に SQL で必ず現状を確認すること。

想定として存在するもの:

- `public.tenants` テーブル + enu 1 行のシード
- `public.tenant_users` テーブル + enu owner の 1 行
- `public.tenant_site_settings` テーブル + enu 行あり（template_type='atmosphere'・PR8 で保存済み）
- `public.tenant_sections` / `public.tenant_images` テーブル
- `public.update_updated_at_column()` 関数
- `public.get_tenant_id_for_workos_user()`（0003）
- `public.get_owner_tenant_for_workos_user()`（0004）
- `public.get_owner_tenant_site_settings_for_workos_user()`（**0005・PR9 で in-place 置換される**）
- `public.upsert_owner_tenant_template_type_for_workos_user()`（0006 修正版）

想定として存在しないもの:

- `public.tenant_site_settings.mood` カラム
- `tenant_site_settings_mood_length_check` CHECK 制約
- `public.update_owner_tenant_mood_for_workos_user()`（0007 で追加）
- 0005 の拡張返り値（mood を含む）
- `auth.is_tenant_owner()`（0002・引き続き対象外）
- `auth.current_workos_user_id()`（認証実装フェーズ・未実装）

---

## PR9 に必要な最小 DB 契約

1. `0007_add_mood_replace_read_and_add_update_rpc.sql` — 以下 3 変更を単一トランザクション（BEGIN/COMMIT）で統合適用:
   - `ALTER TABLE public.tenant_site_settings ADD COLUMN mood text NULL` + CHECK 制約 `tenant_site_settings_mood_length_check`
   - 0005 の `get_owner_tenant_site_settings_for_workos_user()` を DROP → CREATE で in-place 置換（返り値型を `TABLE(tenant_id uuid, template_type text, mood text)` に拡張）+ REVOKE/REVOKE/GRANT で権限再設定
   - `CREATE FUNCTION public.update_owner_tenant_mood_for_workos_user(text, text, text) RETURNS TABLE(tenant_id uuid)` + REVOKE/REVOKE/GRANT

新規 seed は不要（enu の site_settings 行は既存・mood カラム追加時に自動的に NULL が入る）。

---

## 適用順序

```
0007 のみ
```

`0002` は依然除外（`auth.current_workos_user_id()` が本番に未実装のため）。

---

## トランザクション化の設計判断

**Part 1〜Part 3 全体を単一 BEGIN/COMMIT で囲む理由**:
- 部分適用状態を作らないため。Part 1 成功 → Part 2 失敗の場合、「mood カラムは存在するが read 関数は mood を返さない」中途半端な状態が残るのを避ける
- PostgreSQL の DDL はトランザクション対応で、COMMIT まで他セッションには古い状態が見え、COMMIT の瞬間に原子的に切り替わる
- 関数消失時間・カラム未存在時間は外部から観測されない → **本番適用は低トラフィック時に限定する必要はない**

**ロック時間の懸念**:
- `ALTER TABLE ADD COLUMN mood text NULL`（DEFAULT なし・NULL 許容）は既存行のテーブル書き換え不要（PostgreSQL 11+ の高速パス）
- 本番の tenant_site_settings 行は enu の 1 行のみ
- 関数の DROP → CREATE は ACCESS EXCLUSIVE ロックだが、本番の並行呼び出しはほぼ無い

**Supabase SQL Editor での適用**:
- 本ファイル全体を SQL Editor に貼り付けて 1 回実行すれば、BEGIN/COMMIT で囲まれた本体が単一トランザクションとして実行される
- エラーが出た場合は自動 ROLLBACK。手動リカバリの必要なし

---

## タイミング（重要 — 順序を厳守する）

PR9 のリリースは以下 5 段階（PR7・PR8 で確立した手順）:

1. **PR9 を develop へマージ**
2. **`0007` を本番 DB へ適用**（BEGIN/COMMIT で単一トランザクション実行）
3. **develop → main の PR をマージし、Vercel にデプロイ**
4. **`/admin/enu` STEP1 / STEP2 の実測確認**
5. 問題なければ **tag / GitHub Release**

区分:
- 「`0007` の本番適用」= main デプロイ**前**
- 「/admin/enu 実測確認」= main デプロイ**後**

---

## seed に関する前提

PR9 は既存 enu の site_settings 行に mood カラムを追加するのみ。新規 seed は不要。既存 enu 行の mood は NULL のまま維持され、STEP2 保存操作で初回 UPDATE が動作する。

---

## 実測確認項目（段階 4・main デプロイ後に実施）

`/admin/enu` に対する動作を実測し、以下を確認してから段階 5 へ進む:

- `/admin/enu` の初期表示: サイト設定に「テンプレート: atmosphere」「mood: 未設定」が表示される（enu は PR8 で atmosphere を保存済み、mood は 0007 で追加された NULL カラム）
- STEP1 表示: 6 テンプレ選択カード（PR8 実装）。選択中カードは反転色（背景 gray-900・文字 white）で強調表示される
- STEP2 表示: mood 3 カード（modern / natural / elegant）が表示される。おすすめ順（atmosphere → natural, elegant, modern の順）で並び、先頭 1 個に「おすすめ」バッジが付く
- 「先に STEP1 でテンプレートを保存してください」の案内は**表示されない**（既に STEP1 完了済みのため）
- 初回選択: mood（例: `natural`）を選択して保存 → エラーなく再描画される
- 保存後の反映: サイト設定の「mood」欄に `natural` が表示・STEP2 の該当カードが選択済み状態で復元・保存直後は保存ボタンが disabled
- 更新経路: 別の mood（例: `elegant`）を選択して再度保存 → UPDATE で反映
- `/admin/<別slug>`: 認証済みでも所属外のため `notFound()`（404）（PR4 layout の既存動作）
- `/enu/recruit`（公開ページ）: 影響なし

加えて `0007` の実行後確認 SQL で以下を確認済みであること（段階 2 完了時点）:
- mood カラム / CHECK 制約 / 置換後 0005 read 関数（返り値型・SECURITY DEFINER・EXECUTE 権限）/ update 関数の存在確認
- update 関数の挙動テスト（9a-9g）が期待通り
- 置換後 0005 read 関数の挙動テスト（10a-10c）が期待通り

---

## 実施タイミング

- 段階 2 の `0007` 適用は、Supabase の状態が安定していること・想定通りの状態を SQL で確認してから実施
- 段階 3 の main マージは、段階 2 完了直後に実施可能

---

## この計画の位置づけ

- PR9 は本計画の DB 契約（`0007` のみ）を満たし、`/admin/enu` STEP1 / STEP2 実測確認を終えてから tag / Release へ進む
- タイミングの誤り（`0007` 適用前に main デプロイしてしまう等）は `/admin/[tenantSlug]` 全体を壊すため、段階順序を厳守する

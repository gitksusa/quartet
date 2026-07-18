# PR8 本番DB適用計画

**Status**: 未実施
**Created**: 2026-07-18
**関連PR**: PR8（STEP1: テンプレート選択の保存 / 次回リリースタグは確定時に決定）
**関連migration**: `0006`（`0002` は依然対象外・後述）

---

## 背景（なぜこの計画書が必要か）

PR8 のコード（`src/lib/tenant/site-settings.ts` の `saveOwnerTenantTemplateType()` および Server Action `saveTemplateAction()`）は以下の RPC に依存する。

- `saveOwnerTenantTemplateType()` → `public.upsert_owner_tenant_template_type_for_workos_user()`（`0006`）

`/admin/[tenantSlug]` の STEP1（テンプレート選択）UI から呼ばれる Server Action が最終的に上記 RPC を呼ぶ。本番 DB に `0006` 関数が存在しない状態で PR8 のコードが main へ出ると、テンプレート保存操作が RPC 呼び出しに失敗する（コードと DB の契約が満たされないリリースになる）。

---

## 本番 DB の現状（想定・適用直前に必ず再確認）

**注意**: 以下は「想定」であり、実際に `0006` を本番へ適用する直前に SQL で必ず現状を確認すること。想定と乖離があれば作業を止めて原因を特定する。

想定として存在するもの:

- `public.tenants` テーブル + enu 1 行のシード
- `public.tenant_users` テーブル + enu owner の 1 行
- `public.tenant_site_settings` テーブル（0001 で作成済み・**enu 行は未作成想定**）
- `public.tenant_sections` / `public.tenant_images` テーブル
- `public.update_updated_at_column()` 関数
- `public.get_tenant_id_for_workos_user()`（0003）
- `public.get_owner_tenant_for_workos_user()`（0004）
- `public.get_owner_tenant_site_settings_for_workos_user()`（0005・PR7 で適用済み）

想定として存在しないもの:

- `public.upsert_owner_tenant_template_type_for_workos_user()`（`0006`・本 PR で適用）
- `auth.is_tenant_owner()`（0002・引き続き対象外）
- `auth.current_workos_user_id()`（認証実装フェーズ・未実装）

---

## PR8 に必要な最小 DB 契約

1. `0006_upsert_owner_tenant_template_type.sql` — `saveOwnerTenantTemplateType()` が呼ぶ RPC

新規 seed は不要（初回テンプレ選択操作で INSERT 経路が動く。enu の `tenant_site_settings` 行は本 PR のリリース後、実測時にオーナー本人が STEP1 で選択すると初めて作成される）。

---

## 適用順序

```
0006 のみ
```

`0002` は依然除外（`auth.current_workos_user_id()` が本番に未実装のため）。`0002` は「write policy フェーズ」として、`auth.current_workos_user_id()` 実装後に別途適用する。

---

## 既存 broken 版 0006 の置換手順

初回の 0006 本番適用時に UPSERT で 42702 column reference is ambiguous エラーが発生した（`ON CONFLICT (tenant_id)` の `tenant_id` が `RETURNS TABLE` の暗黙出力変数と衝突していた）。修正版は `ON CONFLICT ON CONSTRAINT tenant_site_settings_pkey` に変更し、関数シグネチャ（引数の型・順序・RETURN TYPE）は無変更。

**なぜ DROP → CREATE ではなく CREATE OR REPLACE か**:
- 修正版の関数シグネチャは broken 版と完全に同一
- `CREATE OR REPLACE FUNCTION` は同一シグネチャの関数を原子的に置換する
- DROP → CREATE の 2 段だと一瞬でも関数が消える瞬間があり、その間に呼び出しが来ると失敗する（本番運用では 0 秒でも避けたい）

**適用時の SQL**:
0006 migration は `CREATE OR REPLACE FUNCTION` で書かれているため、**ファイルの SQL をそのまま Supabase SQL Editor で実行できる**。本番に broken 版が存在していても同一シグネチャで原子的に置換される。手作業での書き換えは不要。

**適用後の再検証**:
実行後確認 SQL の [確認 4] 4a〜4e をすべて再実行し、以下を確認する:
- 4a: 42702 column reference ambiguous が出ず、UPSERT が INSERT 経路で成功すること
- 4b: UPDATE 経路も正常動作すること
- 4c-4e: 認可 NG / 許容値外 / NULL の判定は broken 版と同じく正常

これらが全て通ったら段階 3（develop → main の PR マージ）へ進む。

**再テスト後のクリーンアップ**:
4a / 4b でテスト行が作られるため、UI 実測（段階 4）の前に削除して未設定状態に戻す。実測時にオーナー本人が STEP1 で選択し、初回 INSERT 経路が動作することを検証したいため。

```sql
DELETE FROM public.tenant_site_settings
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'enu');
```

削除後、enu の行が消えていることを確認する（テーブル全体の件数ではなく対象テナントで確認する。将来テナントが増えた際に他テナントの行と混同しないため）:

```sql
SELECT count(*) AS enu_rows FROM public.tenant_site_settings
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'enu');
```
↑ enu_rows = 0 であること。

---

## タイミング（重要 — 順序を厳守する）

PR8 のリリースは以下 5 段階の順序で進める。**「DB 適用」と「UI 実測」を混同しない**（PR7 で確立した原則）。

1. **PR8 を develop へマージ**
2. **`0006` を本番 DB へ適用**（コード依存関数を用意する段階。UI 実測はまだできない — main にコードが出ていないため）
3. **develop → main の PR をマージし、Vercel にデプロイ**（このタイミングで初めて PR8 のコードが本番 URL に反映される）
4. **`/admin/enu` の STEP1 実測確認**（このタイミングで初めて PR8 の UI が本番に現れる。`0006` が既に本番にあるため RPC 呼び出しは成功する）
5. 問題なければ **tag / GitHub Release** を作成

区分を明確にすると:
- 「`0006` の本番適用」= **コード依存関数を用意する段階**（main デプロイ**前**）
- 「/admin/enu STEP1 実測確認」= **リリース後の検証段階**（main デプロイ**後**）

---

## seed に関する前提

PR8 は書き込み系のため新規 seed は不要。enu の `tenant_site_settings` 行が未作成のまま main デプロイし、実測時にオーナー本人が STEP1 でテンプレを選択することで初回 INSERT 経路が動く。**開発側で手動 seed を投入しない**（実測ステップで初回 INSERT が動作することも検証したいため）。

---

## 実測確認項目（段階 4・main デプロイ後に実施）

`/admin/enu` に対する動作を実測し、以下を確認してから段階 5（tag / Release）へ進む:

- `/admin/enu` の初期表示: enu オーナーで認証後、STEP1 の 6 テンプレ選択カードが表示され、いずれも未選択（enu の `tenant_site_settings` 行が未作成のため）。サイト設定の「テンプレート」欄は「未設定」表示
- 初回選択: いずれかのテンプレ（例: `atmosphere`）を選択して「保存」ボタンを押下 → エラーなくページが再描画される
- 保存後の反映: サイト設定の「テンプレート」欄に選択した識別子（`atmosphere`）が表示される。STEP1 では該当カードが選択済み状態で復元される
- **保存直後、STEP1 の保存ボタンが無効化される**（selected と currentTemplateType が一致するため）。ボタンが押せる状態のままなら state と再描画の同期に問題があるので報告する
- 更新経路: 別のテンプレ（例: `gallery`）を選択して再度保存 → UPDATE 経路で正しく更新され、サイト設定・STEP1 の両方で反映される
- `/admin/<別slug>`: 認証済みでも所属外のため `notFound()`（404）になる（PR4 layout の既存動作）
- `/enu/recruit`（公開ページ）: 影響なし（200・リダイレクトなし・副作用なし）

加えて `0006` の実行後確認 SQL で以下を確認済みであること（段階 2 完了時点で実施済み）:

- `prosecdef = true`・`search_path = public`・EXECUTE が anon のみ
- テストクエリで「認可 NG → 0 行返却」「認可 OK + 許容値内 → 1 行返却 + tenant_site_settings に UPSERT」「許容値外 → 22023 invalid_parameter_value 例外」の 3 パターンが期待通り

---

## 実施タイミング

- 段階 2 の `0006` 適用は、Supabase の状態が安定していること・0006 適用直前の SQL 現状確認で「想定」通りの状態であることを確認してから実施する
- 段階 3 の main マージは、段階 2 完了直後に実施可能（時間差を空ける必要はないが、段階 2 の結果 SQL は控えを残す）

---

## この計画の位置づけ

- PR8 は本計画の DB 契約（`0006` のみ）を満たし、`/admin/enu` STEP1 実測確認を終えてから tag / Release へ進む
- タイミングの誤り（`0006` 適用前に main デプロイしてしまう等）は STEP1 のテンプレ保存操作を壊すため、段階順序を厳守する

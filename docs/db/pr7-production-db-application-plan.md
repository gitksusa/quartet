# PR7 本番DB適用計画

**Status**: 未実施
**Created**: 2026-07-16
**関連PR**: PR7（tenant site_settings 読取ヘルパーとダッシュボード表示 / v0.13.0 予定）
**関連migration**: `0005`（`0002` は依然対象外・後述）

---

## 背景（なぜこの計画書が必要か）

PR7 のコード（`src/lib/tenant/site-settings.ts`）は以下の RPC に依存する。

- `site-settings.ts` → `public.get_owner_tenant_site_settings_for_workos_user()`（`0005`）

`/admin/[tenantSlug]` の page.tsx がこの helper を呼ぶため、本番 DB に `0005`
関数が存在しない状態で PR7 のコードが main へ出ると、認可通過後のダッシュボード
レンダリングが RPC 呼び出しに失敗する（コードと DB の契約が満たされないリリース
になる）。

---

## 本番 DB の現状（想定・適用直前に必ず再確認）

**注意**: 以下は「想定」であり、実際に `0005` を本番へ適用する直前に SQL で
必ず現状を確認すること。想定と乖離があれば作業を止めて原因を特定する。

想定として存在するもの:

- `public.tenants` テーブル + enu 1 行のシード
- `public.tenant_users` テーブル + enu owner の 1 行（PR3 本番適用時に seed 済み）
- `public.tenant_site_settings` テーブル（0001 で作成済み・enu 行は未作成想定）
- `public.tenant_sections` / `public.tenant_images` テーブル（0001 で作成済み）
- `public.update_updated_at_column()` 関数（0001 で作成済み）
- `public.get_tenant_id_for_workos_user()`（0003）
- `public.get_owner_tenant_for_workos_user()`（0004）

想定として存在しないもの:

- `public.get_owner_tenant_site_settings_for_workos_user()`（`0005`・本 PR で適用）
- `auth.is_tenant_owner()`（0002・引き続き対象外）
- `auth.current_workos_user_id()`（認証実装フェーズ・未実装）
- enu の `tenant_site_settings` 行（PR7 では作成不要・未設定状態で正常動作）

---

## PR7 に必要な最小 DB 契約

1. `0005_owner_site_settings_lookup_function.sql` — `site-settings.ts` が呼ぶ RPC

seed の追加は不要（site_settings が未作成でも `templateType = null` として
「未設定」表示するため）。

---

## 適用順序

```
0005 のみ
```

`0002` は依然除外（`auth.current_workos_user_id()` が本番に未実装のため）。
`0002` は「write policy フェーズ」として、`auth.current_workos_user_id()`
実装後に別途適用する。

---

## タイミング（重要 — 順序を厳守する）

PR7 のリリースは以下 5 段階の順序で進める。**「DB 適用」と「UI 実測」を混同しない**。

1. **PR7 を develop へマージ**
2. **`0005` を本番 DB へ適用**（コード依存関数を用意する段階。UI 実測はまだ
   できない — main にコードが出ていないため）
3. **develop → main の PR をマージし、Vercel にデプロイ**（このタイミングで
   初めて PR7 のコードが本番 URL に反映される）
4. **`/admin/enu` の実測確認**（このタイミングで初めて PR7 の表示内容が本番に
   現れる。`0005` が既に本番にあるため RPC 呼び出しは成功する）
5. 問題なければ **tag / GitHub Release** を作成

区分を明確にすると:
- 「`0005` の本番適用」= **コード依存関数を用意する段階**（main デプロイ**前**）
- 「/admin/enu 実測確認」= **リリース後の検証段階**（main デプロイ**後**）

以前の pr3-plan のように両方を「main マージ前」と書くと、main にコードが出て
いない段階では画面確認自体ができないため誤りである。順序を厳守すること。

---

## seed に関する前提

PR7 は read-only で新規 seed は不要。enu の `tenant_site_settings` 行が未作成
であっても、page.tsx は「テンプレート: 未設定」と表示して正常動作する。
テンプレート選択 UI は Phase 0b 後半（PR8+）で実装する予定であり、その時点で
初回選択フローを用意する。

---

## 実測確認項目（段階 4・main デプロイ後に実施）

`/admin/enu` に対する動作を実測し、以下を確認してから段階 5（tag / Release）へ進む:

- `/admin/enu`: enu オーナーで認証後、以下が表示される
  - Header: 「テナント / enu」
  - サイト設定: 「テンプレート: 未設定」（enu の `tenant_site_settings` 行が
    未作成のため。灰色表示）
  - 共通セクション: 12 種の名前が grid 表示される
  - 管理機能: 3 カード（テンプレート選択 / セクション編集 / 画像管理）が
    「準備中」バッジで表示される
- `/admin/<別slug>`: 認証済みでも所属外のため `notFound()`（404）になる
  （PR4 layout の既存動作）
- `/enu/recruit`（公開ページ）: 影響なし（200・リダイレクトなし・副作用なし）

加えて `0005` の実行後確認 SQL で以下を確認済みであること（段階 2 完了時点で
実施済み）:

- `prosecdef = true`・`search_path = public`・EXECUTE が anon のみ
- テストクエリで「所属不整合 → 0 行」「membership OK + 未設定 → 1 行 NULL」
  「membership OK + 設定済 → 1 行 実値」の 3 パターンが期待通り

---

## 実施タイミング

- 段階 2 の `0005` 適用は、Supabase の状態が安定していること・0005 適用直前の
  SQL 現状確認で「想定」通りの状態であることを確認してから実施する
- 段階 3 の main マージは、段階 2 完了直後に実施可能（時間差を空ける必要は
  ないが、段階 2 の結果 SQL は控えを残す）

---

## この計画の位置づけ

- PR7 は本計画の DB 契約（`0005` のみ）を満たし、`/admin/enu` 実測確認を終えて
  から tag / Release へ進む
- タイミングの誤り（`0005` 適用前に main デプロイしてしまう等）は
  /admin/[tenantSlug] 全体を壊すため、段階順序を厳守する

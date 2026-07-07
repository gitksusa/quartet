# PR3 本番DB適用計画

**Status**: 未実施（Supabase 障害収束後に実施予定）
**Created**: 2026-07-07
**関連PR**: PR3（tenant slug 認可検証と認可専用 RPC を追加 / v0.10.0 予定）
**関連migration**: `0001` / `0003` / `0004`（`0002` は対象外・後述）

---

## 背景（なぜこの計画書が必要か）

PR3 のコード（`src/lib/tenant/access.ts` / `src/lib/tenant/resolve.ts`）は、以下の RPC に依存する。

- `resolve.ts` → `public.get_tenant_id_for_workos_user()`（`0003`）
- `access.ts` → `public.get_owner_tenant_for_workos_user()`（`0004`）

PR3 を main にマージする前に、これらの RPC と依存テーブルが本番DBに存在していなければ、`/admin/[tenantSlug]` は本番で RPC 呼び出しに失敗する（コードとDBの契約が満たされないリリースになる）。

2026-07-07 時点で本番DBを調査した結果、**リポジトリの migration（`0001`〜`0004`）は本番DBに一度も適用されていない**ことが判明した。migration ファイルはリポジトリ上で完成・タグ付け済み（v0.8.x）だが、それは「ファイルが完成した」という意味であり「本番DBに適用された」という意味ではなかった。この認識のズレを、`0004` を本番適用しようとした際に発見した。

---

## 本番DBの現状（2026-07-07 調査結果）

存在するもの:

- `public.tenants` テーブル（`0001` の前提として、別途手動で作成済み）
  - カラム: `id` / `slug` / `name` / `plan` / `is_recruit_enabled` / `is_reservation_enabled` / `is_hpb_integration_enabled` / `is_line_integration_enabled` / `created_at` / `updated_at` / `deleted_at`
  - `deleted_at` カラムが存在する（`0004` が `t.deleted_at IS NULL` で参照する）
  - データ: enu テナント1行（slug: `enu`, name: `enu nailsalon`）が投入済み。**残すべきシードデータ**
  - ポリシー: `tenants_public_read`（SELECT / public）が1件
- `public.update_updated_at_column()` 関数（`0001` のトリガーが依存する共通関数）

存在しないもの:

- `public.tenant_users` / `public.tenant_site_settings` / `public.tenant_sections` / `public.tenant_images`（`0001` が作成する）
- `auth.is_tenant_owner()`（`0002`）
- `auth.current_workos_user_id()`（認証実装フェーズで実装予定・未実装）
- `public.get_tenant_id_for_workos_user()`（`0003`）
- `public.get_owner_tenant_for_workos_user()`（`0004`）
- `supabase_migrations.schema_migrations`（supabase CLI による migration 適用履歴テーブル。=CLI での正式適用は一度も行われていない）

**結論**: 本番DBは「`0001` を流す直前の、正しい前提状態」にほぼ一致している。`tenants` と `update_updated_at_column()` が既にあるため、`0001` 以降を順に流せばリポジトリと本番が一致する。DROP・作り直しは不要。既存の enu データはそのまま活きる。

---

## PR3 に必要な最小DB契約

PR3 のコードを本番で動かすために必要なのは、以下の4点のみ。

1. `0001_hp_template_system.sql` — 4テーブル（特に `tenant_users`）・RLS有効化・anon read policy・GRANT
2. **enu の `tenant_users` seed** — enu オーナーの `workos_user_id` + `role = 'owner'` を `tenant_users` に INSERT。これが無いと `0003` / `0004` が0件を返し、admin 画面に誰も入れない
3. `0003_tenant_lookup_function.sql` — `resolve.ts` が呼ぶ RPC
4. `0004_tenant_context_lookup_function.sql` — `access.ts` が呼ぶ RPC

---

## 適用順序

```
0001 → enu tenant_users seed → 0003 → 0004
```

各 migration ファイルの「実行前確認 SQL」「実行後確認 SQL」に従い、1本ずつ確認しながら流すこと。まとめて一気に流さない。

- `0003` は「`0001` 適用後・`0002` 適用前後どちらでも可」（`0003` ヘッダ記載）。auth 関数に依存しない
- `0004` は `tenant_users` と `tenants` があれば作れる。auth 関数に依存しない

---

## `0002` を除外する理由（重要）

`0002_rls_write_policy.sql` は **PR3 では適用しない**。

- `0002` は `auth.current_workos_user_id()` に依存する（`0002` の前提確認1・「これらの関数の実装が確定・テスト済みになるまで、このファイルを Supabase に適用してはならない」と明記）
- `auth.current_workos_user_id()` は本番に未実装（2026-07-07 確認で0件）
- `0002` は管理画面からのデータ**書き込み**を許可する write policy であり、PR3 の slug 境界チェック（**読み取り**側の認可）とは別契約
- したがって `0002` は「write policy フェーズ」として、`auth.current_workos_user_id()` 実装後に別途適用する

PR3 に必要なDB契約と、write policy のDB契約を分けて扱うこと。

---

## seed に関する前提

enu の `tenant_users` seed を投入するには、**enu オーナーの WorkOS `user.id`** が必要。

- seed する行: `tenant_id`（enu の `tenants.id`）+ `workos_user_id`（enu オーナーの WorkOS user.id）+ `role = 'owner'`
- 投入前に、WorkOS 側に enu オーナーのユーザーが作成済みで、その `user.id` を取得できる状態であることを確認する
- この計画書には実値を記載しない。適用時に `<ENU_OWNER_WORKOS_USER_ID>` を実値に置き換える

---

## 実測確認項目（適用後・PR3 マージ前に実施）

`/admin/enu` に対する動作を実測し、以下を確認してからマージする。

- `/admin/enu`: enu オーナーで認証後、自テナントとして正常に通る
- `/admin/<別slug>`: 認証済みでも所属外のため `notFound()`（404）になる
- `/enu/recruit`（公開ページ）: 影響なし（200・リダイレクトなし・副作用なし）

加えて、各 migration の実行後確認 SQL で以下を確認:

- `0003` / `0004`: `prosecdef = true`・`search_path = public`・EXECUTE が anon のみ
- `0004` [確認4] 相当: 複数 owner tenant を持つ `workos_user_id` が0件

---

## 実施タイミング

- Supabase の障害通知（「We are investigating a technical issue」）が収束してから実施する
- DB基盤が不安定な状態で複数 migration を流すと、途中失敗で中途半端な状態が残るリスクがあるため

---

## この計画の位置づけ

- PR3 は本計画のDB契約（最小4点）を満たし、`/admin/enu` 実測確認を終えてから main にマージする
- それまで PR3 はマージしない。v0.10.0 タグ / Release も延期する

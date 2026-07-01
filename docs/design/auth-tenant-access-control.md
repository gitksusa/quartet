# 認証・テナントアクセス制御設計

**Status**: Draft
**Owner**: k susa
**Decision date**: 2026-07
**前提ドキュメント**:
- `CLAUDE.md` セクション6（DB / マルチテナント）
- `docs/design/hp-db-schema.md`（tenant_sections / tenant_images / tenant_site_settings）
**Review trigger**:
- WorkOS AuthKit の実装着手時（`src/lib/auth/` 作成時）
- `tenant_users` テーブルのマイグレーション実行時
- RLS write policy を有効化する時
- 管理画面ルーティング実装着手時

---

## このドキュメントの目的

WorkOS AuthKit による認証と、マルチテナントのアクセス制御を設計する。`hp-db-schema.md` のRLS方針（設計のみ記載）を、具体的な実装方針に落とし込む。まだコード変更・migration・WorkOS設定の実装は行わない。

---

## 1. 認証・権限の全体構造

```
WorkOS（認証主体）
    |
    | JWT（workos_user_id + tenant_id を含む）
    v
src/lib/auth/          ← WorkOSとの接続・JWTの検証・セッション管理
    |
    v
src/lib/tenant/        ← tenant_id の解決・テナント境界の保証
    |
    v
Supabase RLS           ← auth.current_tenant_id() でテナントスコープを強制
    |
    v
tenant_sections / tenant_images / tenant_site_settings
```

**コンテンツのSSOTはSupabaseテーブルであり、アクセス制御の最終防衛線はRLS。**
アプリ層（`src/lib/auth/` / `src/lib/tenant/`）は利便性とDXのためのラッパーであり、
RLSを迂回する設計にしてはならない。

---

## 2. 新規テーブル: `tenant_users`

CLAUDE.md セクション6に記載の `Users ──< TenantUsers >── Tenants` 設計を具体化する。

```
id              uuid (PK, default gen_random_uuid())
tenant_id       uuid (FK -> tenants.id)
workos_user_id  text    not null   -- WorkOS側のユーザーID
role            text    not null   -- 'owner' | 'admin' | 'staff'
created_at      timestamptz default now()
updated_at      timestamptz default now()
deleted_at      timestamptz (nullable, soft delete)

unique制約: (tenant_id, workos_user_id) WHERE deleted_at IS NULL
```

### なぜ `tenants.owner_email` を使わないか

`tenants` テーブルに `owner_email` のような直接参照を置くと、「1テナント1オーナー固定」になる。将来「スタッフも管理画面に入れたい」「副オーナーを追加したい」となった瞬間に作り直しが必要になる。`tenant_users` を中間テーブルとして挟むことで、role（owner/admin/staff）の拡張にも、1人が複数テナントに所属するケースにも耐えられる。

### role の設計（Phase 0bの範囲）

| role | 想定ユーザー | 権限（Phase 0b） |
|------|------------|----------------|
| `owner` | サロンオーナー本人 | tenant_sections / tenant_images / tenant_site_settings の読み書き全て |
| `admin` | 将来の副管理者（Phase 0bでは未使用） | 予約として定義のみ |
| `staff` | 将来のスタッフ（Phase 0bでは未使用） | 予約として定義のみ |

Phase 0bでは `owner` のみを実装対象とする。`admin` / `staff` はテーブル定義としては存在するが、アクセス制御のポリシーは今は書かない。

### `role` も Postgres enum を避け、Zod でバリデーション

`section_id` / `classification` と同じ方針。後から role を追加する際にマイグレーション不要。

---

## 3. WorkOS AuthKit と tenant_users の対応

### 認証フロー（想定）

```
1. サロンオーナーが管理画面のログインページを開く
2. WorkOS AuthKit の画面にリダイレクト（メール/Google等でログイン）
3. WorkOS が認証完了後、JWT（Access Token）を発行
4. Next.js 側（src/lib/auth/）がJWTを検証
5. JWTに含まれる workos_user_id を使って tenant_users を検索
6. tenant_id を取得し、src/lib/tenant/ がセッションに設定
7. 以降のSupabaseクエリはRLSが tenant_id でスコープを強制
```

### JWTへの tenant_id 埋め込みについて

WorkOS の JWT カスタムクレームに `tenant_id` を含める方法と、
JWT には `workos_user_id` だけ含め、アプリ層で `tenant_users` を都度引く方法がある。

**Phase 0b では後者（都度引く）を採用する。**

理由:
- Phase 0b では1ユーザー = 1テナントが前提のため、複雑なクレーム設計が不要
- JWT へのカスタムクレーム埋め込みは WorkOS の設定が必要で、実装コストが高い
- `src/lib/tenant/` で `workos_user_id → tenant_id` を解決するシンプルな実装で十分
- 将来1ユーザーが複数テナントを持つケースになった時に、クレーム設計を見直す方が自然

この判断は、実装着手時に WorkOS の仕様を確認した上で再検討してよい（Review trigger に記載）。

---

## 4. RLS 設計

### 4.1 `auth.current_tenant_id()` 関数

CLAUDE.md セクション6に記載の通り、RLSポリシーは `auth.current_tenant_id()` を使って tenant_id をセッションから取得する。この関数は WorkOS JWT のクレームまたはSupabaseセッション変数から tenant_id を抽出する想定。具体的な実装は認証実装フェーズで確定する。

### 4.2 公開HP表示用 read policy（3テーブル共通方針）

対象ロール: `anon`（未認証の公開アクセス）

```sql
-- tenant_sections の read policy（想定）
CREATE POLICY "public_read_visible_sections"
ON tenant_sections FOR SELECT
TO anon
USING (is_visible = true);

-- tenant_images の read policy（想定）
CREATE POLICY "public_read_images"
ON tenant_images FOR SELECT
TO anon
USING (deleted_at IS NULL);

-- tenant_site_settings の read policy（想定）
CREATE POLICY "public_read_site_settings"
ON tenant_site_settings FOR SELECT
TO anon
USING (true);  -- 全行。tenant_site_settingsはテナントスコープ内で全て公開でよい
```

**これらはまだ実行しない。認証実装フェーズで確定・適用する。**

### 4.3 管理画面用 write policy

対象ロール: 認証済みユーザーのうち、当該 tenant_id の `owner`（または将来の `admin`）

```sql
-- tenant_sections の write policy（想定）
CREATE POLICY "owner_write_sections"
ON tenant_sections FOR ALL
TO authenticated
USING (tenant_id = auth.current_tenant_id())
WITH CHECK (tenant_id = auth.current_tenant_id());

-- tenant_images / tenant_site_settings も同様の方針
```

**この write policy は WorkOS AuthKit によるテナント認証が完成して初めて意味を持つ。**
現時点では書き込みは service_role 経由（開発者操作）のみ。
エンドユーザー向けの write policy は認証実装フェーズで有効化する。

### 4.4 read / write の分離原則

| 操作 | ロール | 条件 |
|------|--------|------|
| 公開HP表示 (SELECT) | `anon` | `is_visible = true` / `deleted_at IS NULL` |
| 管理画面表示 (SELECT) | `authenticated` | `tenant_id = auth.current_tenant_id()` |
| コンテンツ編集 (INSERT/UPDATE/DELETE) | `authenticated` | `tenant_id = auth.current_tenant_id()` かつ `role = 'owner'`（Phase 0b） |
| 開発者操作 | `service_role` | RLS bypass（本番では厳重管理） |

---

## 5. `src/lib/auth/` と `src/lib/tenant/` の責務分担

### `src/lib/auth/`（認証主体）

WorkOS AuthKit との接続・JWTの検証・セッション管理を担う。**「誰がログインしているか」を解決する。**

責務:
- WorkOS SDK の初期化・設定
- JWT の検証（署名・有効期限）
- ログイン・ログアウトのリダイレクト処理
- `workos_user_id` の取得

責務外:
- `tenant_id` の解決（これは `src/lib/tenant/` の責務）
- テナントデータへのアクセス（これはSupabaseクライアントの責務）

### `src/lib/tenant/`（テナント境界の保証）

「ログインしているユーザーがどのテナントに属するか」を解決し、テナント境界を守る。**「誰が何のテナントを触れるか」を解決する。**

責務:
- `workos_user_id → tenant_id` の解決（`tenant_users` テーブルを参照）
- 現在の `tenant_id` をセッション/コンテキストに設定
- テナント境界チェック（リクエストの `tenant_id` と認証済み `tenant_id` の一致検証）
- `slug → tenant_id` の解決（公開HP表示時）

責務外:
- WorkOS との通信（これは `src/lib/auth/` の責務）
- コンテンツデータの取得・更新（これはSupabaseクライアントの責務）

### 依存方向

```
src/lib/auth/     ← WorkOS SDK に依存
    |
    v（workos_user_id を渡す）
src/lib/tenant/   ← Supabase（tenant_users テーブル）に依存
    |
    v（tenant_id をセッションに設定）
Supabase RLS      ← auth.current_tenant_id() でスコープ強制
```

`src/lib/tenant/` が `src/lib/auth/` に依存することは許容する（下流→上流の参照）。
逆方向（`src/lib/auth/` が `src/lib/tenant/` に依存）は禁止。

---

## 6. Phase 0b で実装する範囲 / 将来に回す範囲

### Phase 0b で実装する（今回の対象）

- `tenant_users` テーブルの作成（migration）
- WorkOS AuthKit の基本設定（組織・ユーザー登録）
- `src/lib/auth/` の基本実装（JWT検証・セッション管理）
- `src/lib/tenant/` の基本実装（workos_user_id → tenant_id 解決）
- 管理画面ルーティング（`/admin/[slug]/` 配下）の認証ガード
- `anon` 向けの read policy（tenant_sections / tenant_images / tenant_site_settings）
- `owner` 向けの write policy（同上）
- enu テナントへの初期 `tenant_users` レコード追加（seed）

### 将来に回す

- `admin` / `staff` ロールの write policy 実装（実際のニーズが出てから）
- 1ユーザーが複数テナントを持つケースの実装（テナント切り替えUI等）
- JWT へのカスタムクレーム（tenant_id）埋め込み（スケールした時点で検討）
- 顧客向けアカウント（サロン利用者のアカウント）は Phase 3 以降

---

## 未決事項

### `auth.current_tenant_id()` の具体的な実装方法

WorkOS JWT のクレームから取得するか、Supabase セッション変数から取得するか、
`tenant_users` を毎回引くか。認証実装フェーズで WorkOS の仕様を確認した上で確定する。

### 管理画面URLの設計（`/admin/[slug]/` か `/dashboard/` か）

管理画面のルーティングは、この設計ドキュメントでは確定しない。
管理画面UI設計（次フェーズ）で決める。

---

## 次フェーズへの引き継ぎ

この認証・権限設計を踏まえ、次のフェーズ（管理画面UI設計）では以下を決める:

1. 管理画面のURL構造（`/admin/[slug]/` か `/dashboard/` か）
2. 管理画面の画面一覧（テンプレート選択・各セクション編集・画像管理・ON/OFF切り替え）
3. `tenant_sections` と `tenant_images` の同時編集UIのデータフロー
4. 初回テンプレート選択時のシード処理（`hp-template-patterns.md` の対応表から初期レコードを生成）

**このドキュメントはまだ Draft。実装着手時に WorkOS の仕様確認・RLSポリシーの詳細確定で更新する。**

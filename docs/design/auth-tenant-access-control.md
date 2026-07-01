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
    | JWT（workos_user_id のみ含む。tenant_id は JWT に含めない）
    v
src/lib/auth/          ← WorkOSとの接続・JWTの検証・セッション管理
    |                     workos_user_id を取得する
    | workos_user_id
    v
src/lib/tenant/        ← tenant_users を参照して workos_user_id → tenant_id を解決
    |                     テナント境界チェック・現在の tenant_id をセッションに設定
    v
Supabase RLS           ← auth.is_tenant_owner() でテナント所属 + role = 'owner' を確認
    |                     （auth.current_workos_user_id() + tenant_users への直接スキャン）
    v
tenant_sections / tenant_images / tenant_site_settings
```

**コンテンツのSSOTはSupabaseテーブルであり、アクセス制御の最終防衛線はRLS。**
アプリ層（`src/lib/auth/` / `src/lib/tenant/`）は利便性とDXのためのラッパーであり、
RLSを迂回する設計にしてはならない。
JWT には `workos_user_id` のみを含め、`tenant_id` はアプリ層で `tenant_users` を都度参照して解決する（セクション3参照）。

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

### 4.1 RLS / アプリ層で使用する認可補助関数

write policy は ①② の2関数に依存する。③は RLS から呼ばず、Next.js アプリ層から tenant_id 解決のために呼び出す RPC 関数である。いずれも認証実装フェーズで実装・テスト済みになってから適用する。

**① `auth.current_workos_user_id()`**
WorkOS JWT から `workos_user_id` を取得する関数。セクション3の方針（JWT には workos_user_id のみ含め、tenant_id はアプリ層で解決）に従い、この関数が JWT の直接の読み取り役を担う。具体的な実装方法（JWT クレームから読む Supabase 関数として実装するのか等）は WorkOS の仕様確認後に認証実装フェーズで確定する。

**② `auth.is_tenant_owner(target_tenant_id uuid)` — SECURITY DEFINER 関数**
`0002_rls_write_policy.sql` で定義する。`auth.current_workos_user_id()` で得た workos_user_id を使い、`tenant_users` テーブルへの直接スキャン（RLS バイパス）で「テナント所属 + role = 'owner'」を確認する。SECURITY DEFINER で実行することで、write policy の USING/WITH CHECK 式から tenant_users を参照する際の RLS 再帰評価を回避する。

```sql
CREATE OR REPLACE FUNCTION auth.is_tenant_owner(target_tenant_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id      = target_tenant_id
      AND workos_user_id = auth.current_workos_user_id()
      AND role           = 'owner'
      AND deleted_at     IS NULL
  );
$$;
```

**`auth.current_tenant_id()` について**
`database.md` セクション2.1 に定義があるが、Phase 0b の write policy では使用しない。将来 admin/staff ロールの write policy を追加する際や、JWT に tenant_id を含めるアーキテクチャに移行する際に再検討する（auth-tenant-access-control.md Review trigger 参照）。

**③ `public.get_tenant_id_for_workos_user(p_workos_user_id text)` — アプリ層 RPC 専用・SECURITY DEFINER 関数**
`0003_tenant_lookup_function.sql` で定義する。①② と異なり RLS ポリシーから呼ばれるのではなく、Next.js の `src/lib/tenant/` から `supabase.rpc()` で呼び出すアプリ層専用関数。`workos_user_id` を受け取り `tenant_id` を返す（①② とは入出力が逆）。

- **anon ロールへの EXECUTE 付与の理由**: Next.js の Supabase server client は anon キーで接続するため（WorkOS セッションは Supabase Auth とは独立）。
- **呼び出し元の必須制約**: `p_workos_user_id` には必ず WorkOS の検証済みサーバーセッション（`withAuth()` の返却値）から取得した値を渡すこと。クライアント入力・URL パラメータ・ブラウザ状態・ログ由来の値を絶対に渡してはならない。関数自体は呼び出し元が当該 workos_user_id の本人かを検証しない。
- **リスクの範囲**: 仮に第三者が有効な workos_user_id を知っていたとしても、取得した tenant_id だけではデータ書き込みはできない（write policy が守る）。workos_user_id はブルートフォース列挙が非現実的な不透明文字列。
- **将来の移行余地**: Supabase Auth と WorkOS を統合する場合、EXECUTE を `authenticated` のみに限定できる（セクション6「将来に回す」参照）。

### 4.2 公開HP表示用 read policy（3テーブル共通方針）

対象ロール: `anon`（未認証の公開アクセス）

`0001_hp_template_system.sql` で適用済み（ポリシー名は以下の通り）。

```sql
-- tenant_site_settings: 全行公開
CREATE POLICY "tenant_site_settings_public_read"
ON public.tenant_site_settings FOR SELECT TO anon USING (true);

-- tenant_sections: 表示中のセクションのみ公開
CREATE POLICY "tenant_sections_public_read"
ON public.tenant_sections FOR SELECT TO anon USING (is_visible = true);

-- tenant_images: ソフトデリートされていない画像のみ公開
CREATE POLICY "tenant_images_public_read"
ON public.tenant_images FOR SELECT TO anon USING (deleted_at IS NULL);
```

### 4.3 管理画面用 write policy

対象ロール: authenticated（WorkOS AuthKit でログイン済みユーザー）のうち role = 'owner' のみ

`0002_rls_write_policy.sql` で適用する（WorkOS AuthKit 認証実装フェーズ完了後）。

```sql
-- 代表例: tenant_sections の write policy
CREATE POLICY "tenant_sections_owner_all"
ON public.tenant_sections FOR ALL
TO authenticated
USING     (auth.is_tenant_owner(tenant_id))
WITH CHECK (auth.is_tenant_owner(tenant_id));

-- tenant_site_settings / tenant_images も同じパターン
-- tenant_users への write policy は設けない（write は service_role のみ。
-- 理由: docs/future-architecture.md 5.2 経営管理ドメイン参照）
```

`auth.is_tenant_owner()` が workos_user_id・role・deleted_at を一括確認するため、将来 staff/admin が `tenant_users` に追加されても意図せず書き込み権限を持たない。

**この write policy は WorkOS AuthKit によるテナント認証が完成して初めて意味を持つ。**
現時点では書き込みは service_role 経由（開発者操作）のみ。

### 4.4 read / write の分離原則

| 操作 | ロール | 条件 |
|------|--------|------|
| 公開HP表示 (SELECT) | `anon` | `is_visible = true` / `deleted_at IS NULL` |
| 管理画面表示 (SELECT) | `authenticated` | `auth.is_tenant_owner(tenant_id)` = true |
| コンテンツ編集 (INSERT/UPDATE/DELETE) | `authenticated` | `auth.is_tenant_owner(tenant_id)` = true（role = 'owner' を関数内で確認） |
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
Supabase RLS      ← auth.is_tenant_owner() でテナント所属 + role = 'owner' を確認
```

`src/lib/tenant/` が `src/lib/auth/` に依存することは許容する（下流→上流の参照）。
逆方向（`src/lib/auth/` が `src/lib/tenant/` に依存）は禁止。

### 実装上の制約：クライアントサイドでの呼び出し禁止

`src/lib/tenant/`（workos_user_id → tenant_id の解決）は、Server Component または Route Handler 内でのみ呼び出す。Client Component の useEffect 内でこの解決処理を行ってはならない。

理由: 依存配列の設定を誤ると（例: 解決結果をstateに入れ、そのstateを依存配列に含めてしまう等）、無限レンダリングループが発生し、Supabaseへのリクエストが際限なく発行される事故につながる。RLSで守られているとはいえ、リクエスト数自体の高騰（レイテンシ・レート制限・コスト）を防ぐため、この解決処理はサーバーサイドに閉じる。

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
- 1ユーザーが複数テナントを持つケースの実装（テナント切り替えUI等）。実装時は `public.get_tenant_id_for_workos_user()` の `LIMIT 1`（Phase 0b の1ユーザー=1テナント前提による）を複数テナント対応の設計に置き換えること（`0003_tenant_lookup_function.sql` 参照）
- JWT へのカスタムクレーム（tenant_id）埋め込み（スケールした時点で検討）
- 顧客向けアカウント（サロン利用者のアカウント）は Phase 3 以降

---

## 未決事項

### JWT に `tenant_id` を直接含める方式への移行（将来検討）

Phase 0b では `auth.current_workos_user_id()` + `auth.is_tenant_owner()` 方式を採用しており（セクション3・4.1参照）、この項目は現在の実装には影響しない。将来、スケールアップにより JWT に `tenant_id` カスタムクレームを直接埋め込む方式へ移行する場合に、`auth.current_tenant_id()` の実装方法（JWT クレームから取得するか、Supabase セッション変数から取得するか）を改めて検討する。

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

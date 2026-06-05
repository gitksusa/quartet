# Database Design (v1 - v3 Roadmap Compatible)

## 1. 共通設計ルール

### 1.1 必須共通カラム
システムテーブル（`users`, `tenants`）を除く、すべてのドメインテーブルに以下のカラムを必須とする。

| カラム名 | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | 一意の識別子 |
| `tenant_id` | `UUID` | `NOT NULL`, `REFERENCES tenants(id)` | マルチテナント分離用 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | 作成日時 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | 更新日時 |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | 論理削除日時 |

### 1.2 updated_at 自動更新トリガー
アプリケーション側での更新漏れを防ぐため、DBレイヤーで `updated_at` を自動更新する。

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

※各テーブル作成後、必ず `CREATE TRIGGER` を適用すること。（後述）

### 1.3 Soft Delete × 部分一意インデックス
通常の `UNIQUE` 制約は使用せず、生存データ（`deleted_at IS NULL`）のスコープ内でのみ
一意性を保証する部分一意インデックス（Partial Unique Index）を厳格に適用する。

---

## 2. 認証・認可・マルチテナント基盤 (RLS)

### 2.1 RLS抽出ヘルパー関数
WorkOSのJWTから `tenant_id` を安全に抽出する関数。

```sql
CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'app_metadata'->>'tenant_id',
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  )::uuid;
$$ LANGUAGE sql STABLE;
```

---

## 3. コアテーブル定義 (DDL)

> **注：これは v1〜v3 を見据えた全体の参照スキーマ。実装順序は `docs/roadmap.md` に従う。**
> **全テーブルを一度に作る指示ではない。各テーブルは該当フェーズで作成する。**
> 例：Phase 0-1（HP・フォーム受付）では予約ドメインテーブル（`reservations` 等）を作らない。
> 予約系は Phase 2（予約基盤）で、`records` は Phase 6（カルテ）で作成する。

### [1/13] tenants（テナント）

```sql
CREATE TABLE tenants (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       VARCHAR(50)  NOT NULL,
    name       VARCHAR(100) NOT NULL,
    plan       VARCHAR(20)  NOT NULL DEFAULT 'trial',
    -- Feature Flags (ADR-005に基づくDBカラム管理)
    is_recruit_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    is_reservation_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    is_hpb_integration_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    is_line_integration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX tenants_slug_unique_idx
    ON tenants (slug) WHERE deleted_at IS NULL;
```

### [2/13] users（システムユーザー）

```sql
CREATE TABLE users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    workos_user_id  VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_workos_user_id_unique_idx
    ON users (workos_user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_email_unique_idx
    ON users (email) WHERE deleted_at IS NULL;
```

### [3/13] tenant_users（システムアクセス権限）
1人のユーザーが複数テナントを管理するケースに対応する多対多中間テーブル。

```sql
CREATE TABLE tenant_users (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL DEFAULT 'staff_member',
    -- owner, manager, staff_member
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX tenant_users_user_tenant_unique_idx
    ON tenant_users (user_id, tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX tenant_users_user_id_idx ON tenant_users (user_id);
```

### [4/13] staff（ビジネスリソース・ヒト）
予約・カルテ・勤怠の担当者として記録されるビジネス上のリソース。
システムログイン権限はtenant_usersで管理するため、roleカラムは持たない。

```sql
CREATE TABLE staff (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id      UUID         REFERENCES users(id),
    -- ログイン不要スタッフ（アシスタント等）はNULL
    name         VARCHAR(100) NOT NULL,
    position     VARCHAR(100),
    -- 例: トップネイリスト・アシスタント
    is_reservable BOOLEAN     NOT NULL DEFAULT TRUE,
    -- 予約受付対象か
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMPTZ
);
CREATE INDEX staff_tenant_id_idx ON staff (tenant_id);
CREATE INDEX staff_user_id_idx   ON staff (user_id);
```

### [5/13] customers（顧客・患者）

```sql
CREATE TABLE customers (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    name_kana    VARCHAR(100),
    email        VARCHAR(255),
    phone_number VARCHAR(20),
    note         TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX customers_email_tenant_unique_idx
    ON customers (tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX customers_phone_tenant_idx
    ON customers (tenant_id, phone_number) WHERE deleted_at IS NULL;
```

### [6/13] menus（施術・診療メニュー）

```sql
CREATE TABLE menus (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    price            INTEGER      NOT NULL,
    duration_minutes INTEGER      NOT NULL,
    description      TEXT,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMPTZ
);
CREATE INDEX menus_tenant_id_idx ON menus (tenant_id);
```

### [7/13] reservations（予約）
自社LINE予約・HPB等の外部連携予約を統合管理する。

```sql
CREATE TABLE reservations (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id      UUID         NOT NULL REFERENCES customers(id),
    staff_id         UUID         REFERENCES staff(id),
    -- 指名なし予約を許容
    menu_id          UUID         REFERENCES menus(id),
    start_at         TIMESTAMPTZ  NOT NULL,
    end_at           TIMESTAMPTZ  NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'confirmed',
    -- pending, confirmed, cancelled, completed
    source           VARCHAR(20)  NOT NULL DEFAULT 'direct',
    -- direct, line, hpb
    integration_key  VARCHAR(100),
    -- HPB等の予約番号（ADR-004）
    idempotency_key  VARCHAR(100),
    -- API重複リクエスト防止用
    note             TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMPTZ
);
CREATE UNIQUE INDEX reservations_integration_key_unique_idx
    ON reservations (tenant_id, integration_key)
    WHERE deleted_at IS NULL AND integration_key IS NOT NULL;
CREATE UNIQUE INDEX reservations_idempotency_key_unique_idx
    ON reservations (tenant_id, idempotency_key)
    WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL;
CREATE INDEX reservations_schedule_perf_idx
    ON reservations (tenant_id, start_at, end_at) WHERE deleted_at IS NULL;
CREATE INDEX reservations_customer_id_idx ON reservations (customer_id);
CREATE INDEX reservations_staff_id_idx    ON reservations (staff_id);
```

### [8/13] records（電子カルテ）

```sql
CREATE TABLE records (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id    UUID        NOT NULL REFERENCES customers(id),
    reservation_id UUID        REFERENCES reservations(id),
    -- 予約なしの記入も許容
    staff_id       UUID        REFERENCES staff(id),
    content        TEXT        NOT NULL,
    photo_urls     TEXT[],
    -- v1では配列で許容。v2実装時にrecord_photosテーブルへ分離予定
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX records_customer_id_idx ON records (customer_id);
CREATE INDEX records_tenant_id_idx   ON records (tenant_id);
```

### [9/13] attendance（勤怠管理）

```sql
CREATE TABLE attendance (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id      UUID        NOT NULL REFERENCES staff(id),
    target_date   DATE        NOT NULL,
    clock_in      TIMESTAMPTZ NOT NULL,
    clock_out     TIMESTAMPTZ,
    break_minutes INTEGER     NOT NULL DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'working',
    -- working, completed, approved
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX attendance_staff_date_unique_idx
    ON attendance (tenant_id, staff_id, target_date) WHERE deleted_at IS NULL;
```

### [10/13] sales（売上管理）

```sql
CREATE TABLE sales (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reservation_id UUID        REFERENCES reservations(id),
    -- 物販のみなど予約外売上を許容
    customer_id    UUID        REFERENCES customers(id),
    -- 一見客を許容
    staff_id       UUID        REFERENCES staff(id),
    amount         INTEGER     NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    -- credit_card, cash, paypay
    status         VARCHAR(20) NOT NULL DEFAULT 'completed',
    -- pending, completed, refunded
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX sales_tenant_date_idx
    ON sales (tenant_id, created_at) WHERE deleted_at IS NULL;
```

### [11/13] page_blocks（ブロックエディタ・v後半／エディタと同時に実装。v1では作らない）
HP・求人ページのブロック構成（並べ替え順・ON/OFF）をテナントごとに保存する想定のテーブル。

**v1では作らない。** v1のHPは props 化した React コンポーネントで構成し、
セクションの ON/OFF は `tenants` の boolean フラグ（`is_recruit_enabled` 等）で制御する。
ブロックエディタUI（ドラッグ並べ替え・ON/OFF・テーマ切替）を作る最終フェーズ
（roadmap.md の page_blocks / block editor フェーズ）で、下記のコメントアウトを解除する。

```sql
-- v後半（ブロックエディタ実装時）にコメントアウトを解除する。v1では作らない。
/*
CREATE TABLE page_blocks (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    page_type  VARCHAR(20) NOT NULL,
    -- hp, recruit, reserve
    block_type VARCHAR(50) NOT NULL,
    -- hero, gallery, faq, map, staff_intro,
    -- owner_message, features, steps, recruit_info, cta
    sort_order INTEGER     NOT NULL,
    is_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    content    JSONB       NOT NULL DEFAULT '{}',
    -- ブロックごとの設定値（テキスト・写真URL等）
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX page_blocks_tenant_page_idx
    ON page_blocks (tenant_id, page_type, sort_order) WHERE deleted_at IS NULL;
*/
```

### [12/13] consultation_items（症例・悩み写真カタログ・v2）
フローチャート式カウンセリングで使用する症例写真・希望施術カタログ。
parent_idで階層構造（フローチャート）を表現する。

```sql
-- v2実装時にコメントアウトを解除する
/*
CREATE TABLE consultation_items (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category   VARCHAR(50)  NOT NULL,
    -- concern（悩み）, style（希望施術）
    title      VARCHAR(100) NOT NULL,
    photo_url  TEXT,
    -- S3パス
    parent_id  UUID         REFERENCES consultation_items(id),
    -- フローチャート階層
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX consultation_items_tenant_category_idx
    ON consultation_items (tenant_id, category) WHERE deleted_at IS NULL;
CREATE INDEX consultation_items_parent_id_idx
    ON consultation_items (parent_id);
*/
```

### [13/13] consultations（顧客の事前カウンセリング回答・v2）
顧客が予約前に選択した悩み・希望施術の回答を保存する。

```sql
-- v2実装時にコメントアウトを解除する
/*
CREATE TABLE consultations (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reservation_id      UUID        REFERENCES reservations(id),
    customer_id         UUID        REFERENCES customers(id),
    selected_item_ids   UUID[],
    -- 選択した症例・希望のID配列
    customer_photo_url  TEXT,
    -- 顧客が送った悩み箇所の写真（S3パス）
    note                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX consultations_reservation_id_idx ON consultations (reservation_id);
CREATE INDEX consultations_customer_id_idx    ON consultations (customer_id);
*/
```

---

## 4. 全テーブルへの制約・ポリシー適用

> 各 `CREATE TRIGGER` / RLS は、対応するテーブルを実際に作成したフェーズで適用する。
> `page_blocks` / `consultation_items` / `consultations` はまだ作らないため、ここには含めない
> （該当フェーズでテーブルのコメントアウト解除と同時に追記する）。

### 4.1 updated_at 自動更新トリガーの適用

```sql
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_users_updated_at
    BEFORE UPDATE ON tenant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_records_updated_at
    BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Row Level Security (RLS) の適用

```sql
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales        ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_users_isolation_policy ON tenant_users
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY staff_isolation_policy ON staff
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY customers_isolation_policy ON customers
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY menus_isolation_policy ON menus
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY reservations_isolation_policy ON reservations
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY records_isolation_policy ON records
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY attendance_isolation_policy ON attendance
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
CREATE POLICY sales_isolation_policy ON sales
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());
```

---

## 5. 将来の拡張性への考慮

### v後半：ブロックエディタ
- `page_blocks` テーブルのコメントアウトを解除し、トリガーとRLSを追加する
- それまでは HP は React コンポーネント、ON/OFF は `tenants` の boolean フラグで制御

### v2：カウンセリング機能
- `consultation_items`・`consultations`テーブルのコメントアウトを解除する
- `records.photo_urls`（TEXT[]）を`record_photos`子テーブルに分離する

### v3：経営数値ダッシュボード
- `sales`テーブルは`reservation_id`をNULL許容にしているため
  物販のみの売上も独立して計上できる設計になっている
- 売上集計はインデックス（`sales_tenant_date_idx`）で高速化済み
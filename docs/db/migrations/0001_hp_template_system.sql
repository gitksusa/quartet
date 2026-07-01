-- ================================================================
-- Migration : 0001_hp_template_system
-- Created   : 2026-07-01
-- Scope     : Phase 0b – HP テンプレートシステム（テーブル・インデックス・トリガー・RLS有効化・公開read policy・GRANT）
--             tenant_users / tenant_site_settings / tenant_sections / tenant_images
-- Apply     : Supabase SQL Editor で手動実行（実行前確認 SQL を先に流すこと）
-- Design    : docs/design/hp-db-schema.md
--             docs/design/auth-tenant-access-control.md
--             docs/design/hp-template-patterns.md
--             .claude/playbooks/content-image-policy.md
-- ================================================================
--
-- 【このファイルに含まれるもの / 含まれないもの】
--   ✓ テーブル作成（1–4）
--   ✓ インデックス・updated_at トリガー
--   ✓ RLS 有効化（5）
--   ✓ 公開 read policy（anon 向け）（6）
--   ✓ GRANT（7）
--   ✗ 管理 write policy（authenticated 向け） → 0002_rls_write_policy.sql
--     （auth.current_workos_user_id() + auth.is_tenant_owner() 実装後に別途適用。WorkOS AuthKit 認証実装フェーズ）
--
-- 【制約事項】
--   - DROP / TRUNCATE は含まない（destructive 変更は別 migration で管理）
--   - 既存の tenants テーブルへのカラム追加なし
--   - PostgreSQL enum は使わない。section_id / template_type / image_role /
--     classification / role はすべて text 型で保持し、アプリ層（Zod）でバリデーション
--
-- 【前提（実行前に確認）】
--   1. update_updated_at_column() 関数が存在すること（database.md セクション1.2）
--   2. public.tenants テーブルが存在すること
-- ================================================================


-- ================================================================
-- 実行前確認 SQL（Supabase SQL Editor で一行ずつ確認してから本体を流す）
-- ================================================================

-- [前提確認 1] update_updated_at_column() の存在
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_updated_at_column';

-- [前提確認 2] tenants テーブルの存在
-- SELECT count(*) FROM public.tenants;

-- [冪等性確認] このテーブルが既に存在する場合は実行しない
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   );


-- ================================================================
-- 1. tenant_users（システムアクセス権限）
-- ================================================================
-- Users ──< TenantUsers >── Tenants の多対多中間テーブル（CLAUDE.md セクション6）。
-- Phase 0b では workos_user_id を直接保持する（users テーブルは将来フェーズで分離）。
-- role は text 型。許可値 'owner' | 'admin' | 'staff' は Zod で検証。
-- admin / staff ロールは Phase 0b では使用しないが、テーブル定義には含める。
-- ================================================================

CREATE TABLE public.tenant_users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    workos_user_id  TEXT        NOT NULL,
    role            TEXT        NOT NULL DEFAULT 'owner',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ
);

-- 同一テナントに同一 WorkOS ユーザーを重複登録しない（生存行のみ）
CREATE UNIQUE INDEX tenant_users_workos_user_tenant_uidx
    ON public.tenant_users (tenant_id, workos_user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX tenant_users_tenant_id_idx
    ON public.tenant_users (tenant_id);
CREATE INDEX tenant_users_workos_user_id_idx
    ON public.tenant_users (workos_user_id);

CREATE TRIGGER update_tenant_users_updated_at
    BEFORE UPDATE ON public.tenant_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- 2. tenant_site_settings（公開 HP 設定：テンプレート選択等）
-- ================================================================
-- docs/design/hp-db-schema.md B案採用。
-- tenant_id を PK にし 1テナント1行を保証する（database.md の id UUID PK ルールからの
-- 意図的な例外。理由: 1:1 テーブルで JOIN が単純になる・肥大化した tenants から責務を分離）。
-- template_type は text 型。許可値（'atmosphere' | 'gallery' | 'staff' |
-- 'conversion' | 'trust' | 'brand'）は Zod で検証する。
-- 将来の拡張先（theme / seo_title / seo_description / published_at / custom_domain）は
-- このテーブルに追加する（tenants テーブルには追加しない）。
-- deleted_at は持たない。テナント削除時は CASCADE で消える。
-- ================================================================

CREATE TABLE public.tenant_site_settings (
    tenant_id       UUID        PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_type   TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_tenant_site_settings_updated_at
    BEFORE UPDATE ON public.tenant_site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- 3. tenant_sections（コンテンツのSSOT）
-- ================================================================
-- section_id は共通セクションID（hp-template-patterns.md で定義）。
-- 例: 'hero' | 'concept' | 'gallery' | 'menu' | 'staff' | 'voice' |
--     'access' | 'reservation' | 'campaign' | 'faq' | 'recruit_cta'
-- Postgres enum は使わず text で保持。Zod でバリデーション。
--
-- content は jsonb。セクションごとに構造が異なるテキスト系データを格納する。
-- 【重要】content に画像 URL を直接埋め込んではならない。
--   画像は tenant_images テーブルで独立管理し、tenant_id + section_id で紐付ける。
--   理由: 画像の差し替え・削除・分類管理を content jsonb の外側で完結させるため。
--         docs/design/hp-db-schema.md セクション4（採用した案2）参照。
--
-- deleted_at は持たない。「非表示」は is_visible = false で表現する。
-- 理由: セクションのソフトデリートは実用上のメリットが薄い（hp-db-schema.md 参照）。
-- ================================================================

CREATE TABLE public.tenant_sections (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    section_id      TEXT        NOT NULL,
    content         JSONB       NOT NULL DEFAULT '{}',
    is_visible      BOOLEAN     NOT NULL DEFAULT TRUE,
    display_order   INTEGER     NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1テナントに同一 section_id を重複させない
CREATE UNIQUE INDEX tenant_sections_tenant_section_uidx
    ON public.tenant_sections (tenant_id, section_id);

-- 公開 HP 描画時のクエリ（tenant_id + is_visible + display_order での絞り込み）に対応
CREATE INDEX tenant_sections_tenant_visible_order_idx
    ON public.tenant_sections (tenant_id, is_visible, display_order);

CREATE TRIGGER update_tenant_sections_updated_at
    BEFORE UPDATE ON public.tenant_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- 4. tenant_images（画像のSSOT）
-- ================================================================
-- 画像は tenant_sections.content に直接埋め込まず、このテーブルで独立管理する。
-- section_id + image_role の組み合わせで「どのセクションの何の役割か」を識別する。
-- 例: image_role = 'hero_background' / 'gallery_item' / 'staff_photo'
--
-- classification は content-image-policy.md の3分類に対応する（text 型・Zod で検証）:
--   'background_atmosphere' : 背景・雰囲気画像（Unsplash/Pexels 可）
--   'actual_content'        : 実写コンテンツ（テナント実写真のみ）
--   'treatment_result'      : 施術結果画像（テナント実写真のみ・出典管理必須）
--
-- alt_text  : アクセシビリティ用の代替テキスト（<img alt="...">）
-- caption   : 画面表示用の短い説明文（ギャラリーキャプション等）。nullable。
--             両者は目的が異なるため別カラムで管理する。
--
-- source_note : 出典・同意情報。classification = 'treatment_result' の場合は
--               景品表示法対応のためアプリ層で実質必須として扱う。
--
-- deleted_at を持つ（tenant_sections と異なりソフトデリートを設ける理由:
--   画像は「差し替えられて使われなくなる」ケースが自然に発生し、誤操作からの
--   復旧や将来の利用履歴監査に備えるため。hp-db-schema.md セクション3参照）。
-- ================================================================

CREATE TABLE public.tenant_images (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    section_id      TEXT        NOT NULL,
    image_role      TEXT        NOT NULL,
    url             TEXT        NOT NULL,
    alt_text        TEXT,
    caption         TEXT,
    classification  TEXT        NOT NULL,
    source_note     TEXT,
    display_order   INTEGER     NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ
);

-- 公開 HP 描画時のクエリ（tenant_id + section_id + display_order, 生存行のみ）に対応
CREATE INDEX tenant_images_tenant_section_order_idx
    ON public.tenant_images (tenant_id, section_id, display_order)
    WHERE deleted_at IS NULL;

CREATE INDEX tenant_images_tenant_id_idx
    ON public.tenant_images (tenant_id);

CREATE TRIGGER update_tenant_images_updated_at
    BEFORE UPDATE ON public.tenant_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- 5. Row Level Security（RLS）有効化
-- ================================================================

ALTER TABLE public.tenant_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_images        ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- 6. RLS ポリシー：公開 read（anon 向け）
-- ================================================================

-- tenant_users は公開不要（ユーザー情報は非公開）

-- tenant_site_settings: HP 表示のためテナント設定を全行公開
CREATE POLICY "tenant_site_settings_public_read"
    ON public.tenant_site_settings FOR SELECT
    TO anon
    USING (true);

-- tenant_sections: is_visible = true の行のみ公開（非表示セクションは見せない）
CREATE POLICY "tenant_sections_public_read"
    ON public.tenant_sections FOR SELECT
    TO anon
    USING (is_visible = true);

-- tenant_images: ソフトデリートされていない画像のみ公開
CREATE POLICY "tenant_images_public_read"
    ON public.tenant_images FOR SELECT
    TO anon
    USING (deleted_at IS NULL);


-- ================================================================
-- 7. GRANT（RLS だけでなくロールへの権限付与も必要。database.md セクション1.4）
-- ================================================================

-- anon（公開 HP 表示）に SELECT を許可
GRANT SELECT ON public.tenant_site_settings TO anon;
GRANT SELECT ON public.tenant_sections      TO anon;
GRANT SELECT ON public.tenant_images        TO anon;
-- tenant_users は anon に SELECT を付与しない

-- authenticated（管理画面）に読み書きを許可
-- ※ write policy は 0002_rls_write_policy.sql で別途適用する
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_users         TO authenticated;
-- 注: tenant_users は GRANT 済みだが RLS が有効で authenticated 向けの policy が存在しない。
--   RLS は policy なしでは全行を拒否するため、authenticated からの read/write は
--   実質不可となる（意図的な設計。write は service_role 経由のみ）。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_site_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_sections      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_images        TO authenticated;


-- ================================================================
-- 実行後確認 SQL（逐次実行して正常に適用されたことを検証する）
-- ================================================================

-- [確認 1] 4テーブルが存在すること
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY table_name;

-- [確認 2] カラム一覧（tenant_images で代表確認）
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'tenant_images'
-- ORDER BY ordinal_position;

-- [確認 3] インデックス一覧
-- SELECT tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY tablename, indexname;

-- [確認 4] トリガー一覧
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND event_object_table IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY event_object_table, trigger_name;

-- [確認 5] RLS が有効であること（rowsecurity = true）
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY tablename;

-- [確認 6] ポリシー一覧（anon 向け read policy 3件のみ存在すること）
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY tablename, policyname;

-- [確認 7] GRANT 確認（anon / authenticated の権限）
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY table_name, grantee, privilege_type;

-- [確認 8] CHECK 制約の確認（display_order >= 0）
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid IN (
--   'public.tenant_sections'::regclass,
--   'public.tenant_images'::regclass
-- )
-- AND contype = 'c';

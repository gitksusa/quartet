-- ================================================================
-- Migration : 0002_rls_write_policy
-- Created   : 2026-07-01
-- Scope     : Phase 0b – 管理 write policy（authenticated 向け RLS）
--             auth.is_tenant_owner() 関数 + 3テーブルへの write policy 適用
--             tenant_site_settings / tenant_sections / tenant_images
--             （tenant_users は対象外。write は service_role のみ）
-- Apply     : WorkOS AuthKit 認証実装フェーズ完了後に Supabase SQL Editor で手動実行
-- Design    : docs/design/auth-tenant-access-control.md セクション4
-- ================================================================
--
-- 【適用条件（このファイルを実行する前に必ず確認）】
--   1. 0001_hp_template_system.sql が適用済みであること
--      （4テーブル・RLS有効化・anon read policy・GRANT が完了していること）
--   2. auth.current_workos_user_id() 関数が実装・テスト済みであること
--      （WorkOS JWT から workos_user_id を返す関数。auth.is_tenant_owner() が内部で呼び出す）
--   3. enu テナントへの初期 tenant_users レコードが投入済みであること
--      （seed: enu オーナーの workos_user_id + role = 'owner' を tenant_users に INSERT）
--   4. src/lib/auth/ および src/lib/tenant/ の実装が完了していること
--      （WorkOS AuthKit との接続・JWT 検証・セッション管理）
--
-- 【auth 関数の実装方針について（auth-tenant-access-control.md セクション3との整合）】
--   auth-tenant-access-control.md の方針:
--   「JWT には workos_user_id のみを含め、tenant_id はアプリ層で tenant_users を都度引いて解決する」
--
--   このファイルの write policy は以下の 2関数に依存する:
--   ① auth.current_workos_user_id() : JWT から workos_user_id を取得（認証フェーズで実装）
--   ② auth.is_tenant_owner()        : このファイル内で定義する SECURITY DEFINER 関数
--
--   auth.current_tenant_id() は write policy では使用しない。
--   auth.current_workos_user_id() の具体的な実装方法（JWT クレームから読む関数として
--   実装するのか等）は WorkOS の仕様確認後に認証実装フェーズで確定する。
--   これらの関数の実装が確定・テスト済みになるまで、このファイルを Supabase に適用してはならない。
--
-- 【このファイルが担う責務】
--   ① auth.is_tenant_owner() SECURITY DEFINER 関数の作成
--   ② authenticated ロールが「自テナントのデータのみ、かつ role = 'owner' の場合のみ」
--      書き込めるよう RLS write policy を 3テーブルに適用する。
--
-- 【注意】
--   このファイルを適用するまで、エンドユーザーからの書き込みは不可（service_role 経由のみ）。
--   0001 適用後に管理画面 UI だけ先に動かしたい場合、write policy なしでは INSERT/UPDATE
--   が RLS に弾かれる。適用タイミングは認証実装の完了に合わせること。
-- ================================================================


-- ================================================================
-- 実行前確認 SQL（すべて確認してから本体を流す）
-- ================================================================

-- [前提確認 1] auth.current_workos_user_id() が存在すること
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'auth' AND proname = 'current_workos_user_id';
-- ↑ 1行返れば OK。0行なら実行しない。

-- [前提確認 2] 0001 の 4テーブルが存在すること
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY table_name;
-- ↑ 4行返れば OK。

-- [前提確認 3] enu テナントの tenant_users レコード（owner）が存在すること
-- SELECT tu.workos_user_id, tu.role, t.slug
-- FROM public.tenant_users tu
-- JOIN public.tenants t ON t.id = tu.tenant_id
-- WHERE tu.role = 'owner' AND tu.deleted_at IS NULL;
-- ↑ enu オーナーの行が返れば OK。

-- [前提確認 4] 既存ポリシー確認（anon read policy 3件のみ存在するはず）
-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY tablename, policyname;

-- [冪等性確認] 関数・write policy が既に存在する場合は実行しない
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'auth' AND proname = 'is_tenant_owner';
--
-- SELECT policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname IN (
--     'tenant_site_settings_owner_all',
--     'tenant_sections_owner_all',
--     'tenant_images_owner_all'
--   );


-- ================================================================
-- 1. auth.is_tenant_owner() SECURITY DEFINER 関数
-- ================================================================
-- 【SECURITY DEFINER を使う理由】
--   RLS write policy の USING/WITH CHECK 式から tenant_users テーブルを直接参照すると、
--   tenant_users 自身のポリシーが再帰的に評価される（RLS 無限再帰）リスクがある。
--   SECURITY DEFINER 関数は関数所有者の権限（＝RLSをバイパスできる権限）で実行されるため、
--   tenant_users に対して RLS を迂回した直接スキャンが可能になり、無限再帰を回避できる。
--
-- 【セキュリティ上の留意事項】
--   ① 関数の所有者（Owner）: この関数を作成するロールが所有者になる。
--     SECURITY DEFINER は所有者の権限で実行されるため、所有者は tenant_users の
--     全行を読めるロール（service_role または postgres）でなければならない。
--     本番環境では権限を持つロールが誤って SECURITY DEFINER 関数を作成しないよう注意する。
--   ② SET search_path = public: search_path インジェクション攻撃を防ぐため固定する。
--     これにより関数内の非修飾テーブル名は public スキーマのみを参照する。
--     auth.current_workos_user_id() はスキーマ修飾済みのため影響を受けない。
--   ③ EXECUTE 権限の制限: PostgreSQL のデフォルトでは PUBLIC に EXECUTE が付与される。
--     この関数は authenticated ロールのみが呼び出せばよいため、PUBLIC を明示的に剥奪し
--     authenticated にのみ付与する（後述の REVOKE/GRANT を必ず実行すること）。

CREATE OR REPLACE FUNCTION auth.is_tenant_owner(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id      = target_tenant_id
      AND workos_user_id = auth.current_workos_user_id()
      AND role           = 'owner'
      AND deleted_at     IS NULL
  );
$$;

-- EXECUTE 権限の絞り込み（必ず実行すること）
REVOKE EXECUTE ON FUNCTION auth.is_tenant_owner(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION auth.is_tenant_owner(uuid) TO   authenticated;


-- ================================================================
-- 2. RLS ポリシー：管理 write（authenticated 向け）
-- ================================================================
-- 対象ロール: authenticated（WorkOS AuthKit でログイン済みユーザー）
-- 条件: auth.is_tenant_owner(tenant_id) が true の場合のみ書き込みを許可する。
--   関数内で workos_user_id・role = 'owner'・deleted_at IS NULL を一括確認するため、
--   将来 staff/admin が tenant_users に追加されても意図せず書き込み権限を持たない。
-- auth-tenant-access-control.md セクション4.3 参照。
--
-- 【tenant_users への write policy はこのファイルに含まない（B案採用）】
--   tenant_users への書き込み（ユーザーの追加・ロール変更・論理削除）は
--   service_role 経由の開発者操作・seed のみに限定する。
--   理由: tenant_users.role（owner/admin/staff）は「HP管理画面へのログイン権限」を
--   表す軽量なモデルであり、将来の統合業務管理ドメイン（スタッフ勤怠・給与・経営分析等）の
--   本格的なロールベース権限設計とは責務が異なる（CLAUDE.md セクション6・7参照）。
--   軽量な Phase 0b 向け write policy にそのドメインの重みを持たせるべきでない。
--   統合業務管理ドメインの権限設計は docs/future-architecture.md に予約済み。

-- ── tenant_site_settings ──────────────────────────────────────
CREATE POLICY "tenant_site_settings_owner_all"
    ON public.tenant_site_settings FOR ALL
    TO authenticated
    USING     (auth.is_tenant_owner(tenant_id))
    WITH CHECK (auth.is_tenant_owner(tenant_id));

-- ── tenant_sections ───────────────────────────────────────────
CREATE POLICY "tenant_sections_owner_all"
    ON public.tenant_sections FOR ALL
    TO authenticated
    USING     (auth.is_tenant_owner(tenant_id))
    WITH CHECK (auth.is_tenant_owner(tenant_id));

-- ── tenant_images ─────────────────────────────────────────────
CREATE POLICY "tenant_images_owner_all"
    ON public.tenant_images FOR ALL
    TO authenticated
    USING     (auth.is_tenant_owner(tenant_id))
    WITH CHECK (auth.is_tenant_owner(tenant_id));


-- ================================================================
-- 実行後確認 SQL
-- ================================================================

-- [確認 1] auth.is_tenant_owner() 関数が作成されたこと（SECURITY DEFINER・search_path 確認）
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'auth' AND proname = 'is_tenant_owner';
-- ↑ prosecdef = true（SECURITY DEFINER）・proconfig に search_path が含まれることを確認。

-- [確認 2] 関数所有者（owner）の確認
-- SELECT proname, pg_get_userbyid(proowner) AS owner
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'auth' AND proname = 'is_tenant_owner';
-- ↑ owner が postgres または service_role 相当（tenant_users に対して RLS をバイパスできる
--   権限を持つロール）であること。SECURITY DEFINER 関数は所有者の権限で実行されるため、
--   所有者が tenant_users を RLS なしで読める権限を持たない場合、関数内の
--   tenant_users スキャンが RLS に弾かれ is_tenant_owner() が常に false を返す。

-- [確認 3] EXECUTE 権限が authenticated のみに付与されていること
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'auth' AND routine_name = 'is_tenant_owner';
-- ↑ authenticated のみ EXECUTE。PUBLIC / anon の行がないことを確認。

-- [確認 4] write policy が追加されたこと（0001 の anon 3件 + 0002 の authenticated 3件 = 計6件）
--          ※ tenant_users への write policy は含まない（service_role のみ）
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'tenant_users', 'tenant_site_settings', 'tenant_sections', 'tenant_images'
--   )
-- ORDER BY tablename, policyname;

-- [確認 5] 管理画面ログイン後に動作確認する
-- 正常: role = 'owner' のユーザーが自テナントの tenant_sections を INSERT/UPDATE できる
-- 異常1: role = 'owner' のユーザーが別テナントのデータを書き込める（テナント境界漏れ）
-- 異常2: role = 'staff' のユーザーが書き込める（role チェック漏れ）

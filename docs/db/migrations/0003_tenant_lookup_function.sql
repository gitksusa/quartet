-- ================================================================
-- Migration : 0003_tenant_lookup_function
-- Created   : 2026-07-01
-- Scope     : Phase 0b – アプリ層向け workos_user_id → tenant_id 解決関数
--             public.get_tenant_id_for_workos_user(text) RETURNS uuid
-- Apply     : 0001 適用後・0002 適用前後どちらでも可。
--             PR2（src/lib/auth/ + src/lib/tenant/）の実装と合わせて適用する。
-- Design    : docs/design/auth-tenant-access-control.md セクション5
-- ================================================================
--
-- 【なぜこの関数が必要か】
--   Next.js アプリ層（src/lib/tenant/）は workos_user_id → tenant_id の解決に
--   tenant_users テーブルを参照する必要がある。
--   しかし 0001 の設計により tenant_users には anon / authenticated 向けの
--   RLS read policy が存在しない（意図的な設計）。
--
--   代替案として service_role admin client の使用も検討したが、
--   service_role キーはすべてのテーブル・すべての操作の RLS をバイパスする高権限であり、
--   アプリ層（Next.js プロセス）に持ち込むとキー漏えい時の爆発半径が DB 全体に及ぶ。
--   目的に特化した SECURITY DEFINER 関数にすることで、爆発半径をこの関数が
--   返す情報（owner の tenant_id のみ）に限定する。
--
-- 【auth.is_tenant_owner() との役割分担】
--   auth.is_tenant_owner() （0002 で定義）は RLS ポリシーの USING/WITH CHECK 式から
--   呼び出される Postgres 内部関数であり、入力 = tenant_id・出力 = boolean。
--   「渡した tenant_id の owner か」を RLS 評価時に確認する用途のもの。
--
--   本関数は入力 = workos_user_id・出力 = tenant_id であり、アプリ層 RPC から
--   「このユーザーの tenant_id を取得する」用途のもの。役割・呼び出し元が異なる。
--
-- 【スキーマ選択の理由（auth vs public）】
--   auth.is_tenant_owner() が auth スキーマにある理由:
--     Supabase が RLS 評価時に内部的に呼び出す。auth スキーマは Supabase の
--     認証インフラ域（Supabase 自身の関数・テーブルが置かれる）。
--
--   本関数を public スキーマにする理由:
--     Next.js から supabase.rpc() で呼び出すアプリ層関数。Supabase の慣習では
--     アプリ向け RPC 関数は public スキーマに置く。また anon ロールは
--     public スキーマの関数に EXECUTE を付与しやすい（auth スキーマへの付与は
--     Supabase 管理外の設定変更が必要になる場合がある）。
--
-- 【anon ロールへの EXECUTE 付与について（セキュリティ上の留意点）】
--   Next.js の Supabase server client は anon キーで接続する（WorkOS JWT とは別物）。
--   そのため本関数は anon ロールから呼び出せる必要がある。
--
--   【リスク】
--     anon 権限を持つ第三者が任意の文字列を p_workos_user_id に渡すことで、
--     対応する tenant_id UUID を取得できる可能性がある。
--     本関数自体は「呼び出し元が当該 workos_user_id の本人か」を検証しない。
--
--   【リスクが現時点で許容範囲内と判断する理由】
--     ① workos_user_id は WorkOS が発行する不透明な文字列（例: user_XXXXXXXXXXXXXX）
--       であり、ブルートフォースによる有効 ID の列挙は非現実的。
--     ② 仮に tenant_id UUID が取得されても、テーブルへのアクセスは RLS が守る。
--       anon は 0001 で付与された public read policy の範囲（is_visible=true /
--       deleted_at IS NULL）のみ SELECT 可能。
--     ③ 書き込みは 0002 の auth.is_tenant_owner() による write policy が守る。
--       tenant_id を知っていても、WorkOS JWT なしでは書き込めない。
--
--   【将来、リスクをさらに下げたい場合の代替案】（Phase 0b では採用しない）
--     Supabase Auth と WorkOS を統合し（カスタム JWT 等）、関数の EXECUTE を
--     authenticated ロールのみに限定する。実装コストが高く、Phase 0b スコープ外。
--
-- 【前提（実行前に確認）】
--   1. 0001_hp_template_system.sql が適用済みであること（tenant_users テーブルが存在する）
-- ================================================================


-- ================================================================
-- 実行前確認 SQL
-- ================================================================

-- [前提確認] tenant_users テーブルが存在すること
-- SELECT count(*) FROM public.tenant_users;

-- [冪等性確認] 関数が既に存在する場合は実行しない
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_tenant_id_for_workos_user';


-- ================================================================
-- 1. public.get_tenant_id_for_workos_user() SECURITY DEFINER 関数
-- ================================================================
-- 【SECURITY DEFINER を使う理由】
--   tenant_users には anon/authenticated 向けの RLS read policy が存在しない。
--   SECURITY DEFINER 関数は関数所有者の権限（RLS バイパス可能）で実行されるため、
--   tenant_users を直接スキャンできる。
--
-- 【関数所有者の留意事項】
--   この関数を作成するロールが所有者になる。所有者は tenant_users を
--   RLS なしで読めるロール（postgres または service_role 相当）である必要がある。
--   SET search_path = public により search_path インジェクション攻撃を防ぐ。

CREATE OR REPLACE FUNCTION public.get_tenant_id_for_workos_user(p_workos_user_id text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Phase 0b 前提: 1ユーザー = 1テナント。
  -- tenant_users の unique 制約は (tenant_id, workos_user_id) であり、同一 workos_user_id が
  -- 複数 tenant_id に owner として所属することを DB レベルでは禁止していない。
  -- 複数テナント所属が発生した場合、ORDER BY なしの LIMIT 1 により返却 tenant_id は不定になる。
  -- 1ユーザーが複数テナントを持つケースの実装時にこの LIMIT 1 を解消すること（実行後確認[確認4]参照）。
  SELECT tenant_id
  FROM public.tenant_users
  WHERE workos_user_id = p_workos_user_id
    AND role           = 'owner'
    AND deleted_at     IS NULL
  LIMIT 1;
$$;

-- EXECUTE 権限の設定
-- anon に付与する理由: Next.js Supabase server client は anon キーで接続するため。
-- セキュリティ上の留意点はファイルヘッダー参照。
REVOKE EXECUTE ON FUNCTION public.get_tenant_id_for_workos_user(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_tenant_id_for_workos_user(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_tenant_id_for_workos_user(text) TO anon;


-- ================================================================
-- 実行後確認 SQL
-- ================================================================

-- [確認 1] 関数が作成されたこと（SECURITY DEFINER・search_path 確認）
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_tenant_id_for_workos_user';
-- ↑ prosecdef = true・proconfig に search_path = public が含まれること。

-- [確認 2] EXECUTE 権限が anon のみに付与されていること
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name   = 'get_tenant_id_for_workos_user';
-- ↑ anon のみ EXECUTE。PUBLIC / authenticated の行がないことを確認。

-- [確認 3] 関数所有者の確認
-- SELECT proname, pg_get_userbyid(proowner) AS owner
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_tenant_id_for_workos_user';
-- ↑ owner が postgres または service_role 相当（tenant_users を RLS なしで読める権限）であること。
--   SECURITY DEFINER 関数は所有者の権限で実行されるため、所有者が tenant_users を
--   RLS なしで読めない場合、関数内スキャンが RLS に弾かれ NULL を返す。

-- [確認 4] 同一 workos_user_id が複数テナントに owner 所属していないか（Phase 0b 前提の検証）
-- SELECT workos_user_id, COUNT(DISTINCT tenant_id) AS tenant_count
-- FROM public.tenant_users
-- WHERE role       = 'owner'
--   AND deleted_at IS NULL
-- GROUP BY workos_user_id
-- HAVING COUNT(DISTINCT tenant_id) > 1;
-- ↑ 0行返れば OK。1行以上返る場合は1ユーザー複数テナント所属が発生しており、
--   get_tenant_id_for_workos_user() の返却 tenant_id が不定になる（LIMIT 1 の前提が崩れている）。

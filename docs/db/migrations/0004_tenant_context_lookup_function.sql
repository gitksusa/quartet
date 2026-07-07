-- ================================================================
-- Migration : 0004_tenant_context_lookup_function
-- Created   : 2026-07-07
-- Scope     : Phase 0b – アプリ層の認可専用 tenant コンテキスト解決関数
--             public.get_owner_tenant_for_workos_user(text)
--               RETURNS TABLE(tenant_id uuid, slug text)
-- Apply     : 0001–0003 適用後。
--             PR2（src/lib/tenant/access.ts）の実装と合わせて適用する。
-- Design    : docs/design/auth-tenant-access-control.md セクション5
-- ================================================================
--
-- 【なぜこの関数が必要か】
--   src/lib/tenant/access.ts で「URL の tenantSlug が認証済みユーザーの
--   所属テナントの slug と一致するか」を検証する。
--   検証を成立させるには、認証済み workos_user_id を起点に (tenant_id, slug)
--   を1件取得する必要がある。
--
--   単純な代替案として、Next.js の Supabase server client（anon 接続）から
--   tenants を直接 SELECT する経路も検討したが、これは公開HP用の
--   tenants anon read policy に暗黙的に結合してしまう。
--   将来 tenants の anon read policy を絞る（例: is_recruit_enabled = true 限定）
--   と、認可自体が特定テナントで壊れる。
--   認可の正しさは公開ページの RLS 設定に依存させない。
--
--   目的に特化した SECURITY DEFINER 関数として本関数を定義することで、
--   認可経路と公開ページ経路を完全に分離する。
--
-- 【0003（get_tenant_id_for_workos_user）との役割分担】
--   0003 は「workos_user_id → tenant_id」のみを返す（責務を絞る）。
--   src/lib/tenant/resolve.ts が利用中。
--   本関数は「workos_user_id → (tenant_id, slug)」の tenant コンテキストを
--   一度に返す。src/lib/tenant/access.ts の tenantSlug 検証で利用する。
--   0003 の呼び出し元を書き換えずに独立した用途で新規に定義する。
--
--   両者は将来的に統合を検討してよいが、Phase 0b では別関数として並存させる
--   （0003 の呼び出し元を今変えないための保守的な選択）。
--
-- 【スキーマ選択の理由（auth vs public）】
--   auth.is_tenant_owner()（0002 で定義）が RLS 評価時に Supabase 内部から
--   呼ばれるため auth スキーマに置いているのに対し、本関数は Next.js から
--   supabase.rpc() で呼び出すアプリ層関数。Supabase の慣習ではアプリ向け
--   RPC は public スキーマに置く。0003 と同じ理由。
--
-- 【なぜ authenticated ではなく anon に GRANT EXECUTE するのか】
--   0003 と同じ理由で、Next.js の Supabase server client は anon キーで接続する
--   （WorkOS AuthKit のセッションは Supabase Auth とは独立しているため、
--   Supabase 側の JWT は発行されない）。本関数を authenticated に限定すると
--   Next.js から呼べない。
--
--   【リスクと許容範囲】
--     ① 呼び出し元は「p_workos_user_id が呼び出し元本人か」を DB では検証しない。
--        anon 権限を持つ第三者が有効な workos_user_id を推定できれば、
--        対応する (tenant_id, slug) を取得できる可能性がある。
--     ② workos_user_id は WorkOS が発行する不透明な文字列であり
--        ブルートフォース列挙は非現実的。
--     ③ 得られる情報は (tenant_id, slug) のみ。書き込みは 0002 の
--        auth.is_tenant_owner() write policy が守る。tenant_id / slug を
--        知っていても WorkOS JWT なしでは書き込めない。
--     ④ 呼び出し元の必須制約は access.ts 側で強制する:
--        p_workos_user_id には必ず WorkOS の検証済みサーバーセッション
--        （withAuth() の返却値）から取得した値を渡す。クライアント入力・URL
--        パラメータ・ブラウザ状態由来の値を絶対に渡してはならない。
--
--   【将来、リスクをさらに下げたい場合の代替案】（Phase 0b では採用しない）
--     Supabase Auth と WorkOS を統合し（カスタム JWT 等）、EXECUTE を
--     authenticated ロールのみに限定する。実装コストが高く Phase 0b スコープ外。
--     0003 と同じ扱いで揃える。
--
-- 【LIMIT 1 の暫定性】（0003 と同じ注記）
--   Phase 0b 前提: 1 WorkOS user = 1 active tenant（role='owner' かつ
--   tenant_users.deleted_at IS NULL かつ tenants.deleted_at IS NULL）。
--   tenant_users の unique 制約は (tenant_id, workos_user_id) であり、同一
--   workos_user_id が複数 tenant_id に owner として所属することを DB レベルでは
--   禁止していない。
--   複数所属が発生した場合、ORDER BY なしの LIMIT 1 により返却行は不定になる。
--   将来 1ユーザー複数テナント切り替え UI を実装する時点で、LIMIT 1 を解消し
--   tenant 一覧を返す設計へ置き換えること。
--   検出は 0003 の実行後確認[確認4] で兼ねる（同じ tenant_users を見るため
--   本ファイルでは別途の検出クエリは書かない）。
--
-- 【role = 'owner' フィルタの見直し時期】
--   Phase 0b では tenant_users.role = 'owner' のみを管理画面に入れる方針。
--   将来 admin / staff 等のロールを追加する際は、本関数の WHERE 句の見直しが
--   必要になる。具体的には:
--     - staff にも管理画面を開放する場合、role IN ('owner','admin','staff') に
--       緩めるか、role を返り値に含めて呼び出し側で分岐させるかを検討する。
--     - この判断は docs/design/auth-tenant-access-control.md のロール設計改訂と
--       セットで行うこと。RLS の write policy（0002 の auth.is_tenant_owner()）
--       との整合も同時に確認する。
--
--   なお、本関数名に "owner" を埋め込んでいるのは、コメントは読み飛ばされても
--   関数名は呼び出し時に必ず目に入り、owner 専用であることに気づけるようにする
--   ため。role フィルタを緩める場合は関数名（get_owner_tenant_for_workos_user）も
--   同時に変更し、名前と挙動を乖離させないこと。
--
-- 【前提（実行前に確認）】
--   1. 0001_hp_template_system.sql が適用済みであること（tenant_users テーブルが存在する）
--   2. tenants テーブルに slug カラムと deleted_at カラムが存在すること
-- ================================================================


-- ================================================================
-- 実行前確認 SQL
-- ================================================================

-- [前提確認 1] tenant_users テーブルが存在すること
-- SELECT count(*) FROM public.tenant_users;

-- [前提確認 2] tenants テーブルに slug / deleted_at カラムが存在すること
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'tenants'
--   AND column_name IN ('slug', 'deleted_at');
-- ↑ 2行返れば OK。

-- [冪等性確認] 関数が既に存在する場合は実行しない
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_for_workos_user';


-- ================================================================
-- 1. public.get_owner_tenant_for_workos_user() SECURITY DEFINER 関数
-- ================================================================
-- 【SECURITY DEFINER を使う理由】
--   tenant_users には anon / authenticated 向けの RLS read policy が存在しない。
--   SECURITY DEFINER 関数は関数所有者の権限（RLS バイパス可能）で実行されるため、
--   tenant_users を直接スキャンできる。tenants の read policy にも依存しない。
--
-- 【起点は workos_user_id、slug は結果として返すだけ】
--   URL の slug を起点に tenants を検索しない。起点は必ず認証済み workos_user_id 側。
--   slug は結果として返し、アプリ層で URL の tenantSlug と文字列比較する。
--   これにより他テナントの列挙経路を作らない。
--
-- 【両 deleted_at を確認する理由】
--   論理削除済みのテナント本体（tenants.deleted_at IS NOT NULL）と、
--   論理削除済みの所属レコード（tenant_users.deleted_at IS NOT NULL）はいずれも除外する。
--   片方だけを見ると、削除済みテナントのオーナーが管理画面に入れる穴になる。

CREATE OR REPLACE FUNCTION public.get_owner_tenant_for_workos_user(p_workos_user_id text)
RETURNS TABLE(tenant_id uuid, slug text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug
  FROM public.tenant_users tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  WHERE tu.workos_user_id = p_workos_user_id
    AND tu.role           = 'owner'
    AND tu.deleted_at     IS NULL
    AND t.deleted_at      IS NULL
  LIMIT 1;
$$;

-- EXECUTE 権限の設定
-- anon に付与する理由・リスク評価・将来案はファイルヘッダーの
-- 【なぜ authenticated ではなく anon に GRANT EXECUTE するのか】参照。
REVOKE EXECUTE ON FUNCTION public.get_owner_tenant_for_workos_user(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_owner_tenant_for_workos_user(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_owner_tenant_for_workos_user(text) TO anon;


-- ================================================================
-- 実行後確認 SQL
-- ================================================================

-- [確認 1] 関数が作成されたこと（SECURITY DEFINER・search_path・返り値型 確認）
-- SELECT proname, prosecdef, proconfig, pg_get_function_result(oid) AS result_type
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_for_workos_user';
-- ↑ prosecdef = true・proconfig に search_path=public を含む・
--   result_type = 'TABLE(tenant_id uuid, slug text)' であること。

-- [確認 2] EXECUTE 権限が anon のみに付与されていること
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name   = 'get_owner_tenant_for_workos_user';
-- ↑ anon のみ EXECUTE。PUBLIC / authenticated の行がないことを確認。

-- [確認 3] 関数所有者の確認
-- SELECT proname, pg_get_userbyid(proowner) AS owner
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_for_workos_user';
-- ↑ owner は tenant_users および tenants を RLS なしで読める権限を持つロール
--   （postgres または service_role 相当）であること。SECURITY DEFINER 関数は
--   所有者の権限で実行されるため、所有者が対象テーブルを RLS なしで読めない
--   場合、関数内スキャンが RLS に弾かれ空を返す。

-- [確認 4] 複数所属の検出は 0003 の実行後確認[確認4] で兼ねる
-- 本関数と 0003 は同じ tenant_users を参照しており、複数 tenant 所属の
-- 検出は 0003 側で実施すれば十分。ここでは重複する検出クエリを書かない。

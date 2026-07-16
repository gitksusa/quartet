-- ================================================================
-- Migration : 0005_owner_site_settings_lookup_function
-- Created   : 2026-07-16
-- Scope     : Phase 0b – アプリ層の認可専用 tenant site_settings 解決関数
--             public.get_owner_tenant_site_settings_for_workos_user(text, text)
--               RETURNS TABLE(tenant_id uuid, template_type text)
-- Apply     : 0001・0003・0004 適用後。0002 は依然除外（auth.current_workos_user_id() 未実装）。
--             PR7（src/lib/tenant/site-settings.ts）の実装と合わせて適用する。
-- Design    : docs/design/auth-tenant-access-control.md セクション5
-- ================================================================
--
-- 【なぜこの関数が必要か】
--   src/lib/tenant/site-settings.ts で「認証済みユーザーが所有する tenant の
--   site_settings を読み取る」処理を実装する。認証済み workos_user_id と URL の
--   tenant_slug を起点に (tenant_id, template_type) を1件取得する必要がある。
--
--   単純な代替案として、Next.js の Supabase server client（anon 接続）から
--   tenant_site_settings を直接 SELECT する経路も検討したが、これは公開HP用の
--   tenant_site_settings_public_read policy（0001 で設定・anon 向け）に暗黙的に
--   結合してしまう。将来 public read policy を絞ると、認可自体が特定テナントで
--   壊れる。認可の正しさは公開ページの RLS 設定に依存させない。
--
--   目的に特化した SECURITY DEFINER 関数として本関数を定義することで、
--   認可経路と公開ページ経路を完全に分離する。0004 と同じ設計方針。
--
-- 【0003 / 0004 との役割分担】
--   0003 は workos_user_id → tenant_id のみを返す。src/lib/tenant/resolve.ts が利用中。
--   0004 は workos_user_id → (tenant_id, tenant.slug) を返し、slug 検証に使う。
--     src/lib/tenant/access.ts が利用中。
--   本関数は workos_user_id + tenant_slug → (tenant_id, template_type) を返し、
--     src/lib/tenant/site-settings.ts の site_settings 取得で利用する。
--   3 関数はいずれも「workos_user_id を起点にした認可専用 read」であり、返す情報の
--   粒度だけが異なる（tenant_id のみ / +slug / +template_type）。
--
-- 【スキーマ選択の理由（auth vs public）】
--   0003 / 0004 と同じ理由。本関数は Next.js から supabase.rpc() で呼び出す
--   アプリ層関数のため public スキーマに置く。
--
-- 【なぜ authenticated ではなく anon に GRANT EXECUTE するのか】
--   0003 / 0004 と同じ理由で、Next.js の Supabase server client は anon キーで
--   接続する（WorkOS AuthKit のセッションは Supabase Auth とは独立しているため、
--   Supabase 側の JWT は発行されない）。本関数を authenticated に限定すると
--   Next.js から呼べない。
--
--   【リスクと許容範囲】
--     ① 呼び出し元は「p_workos_user_id が呼び出し元本人か」を DB では検証しない。
--        anon 権限を持つ第三者が有効な workos_user_id を推定できれば、対応する
--        (tenant_id, template_type) を取得できる可能性がある。
--     ② workos_user_id は WorkOS が発行する不透明な文字列でありブルートフォース
--        列挙は非現実的。加えて本関数は p_tenant_slug との両方一致が必要なため、
--        tenant_slug は URL 由来で列挙容易だが workos_user_id 不知なら通らない。
--     ③ 得られる情報は (tenant_id, template_type) のみ。本関数は read-only で
--        書き込み経路は対象外（将来の書き込みは 0002 の auth.is_tenant_owner()
--        write policy で守る予定）。
--     ④ 呼び出し元の必須制約は site-settings.ts 側で強制する:
--        p_workos_user_id には必ず WorkOS の検証済みサーバーセッション
--        （withAuth() の返却値）から取得した値を渡す。クライアント入力・URL
--        パラメータ・ブラウザ状態由来の値を絶対に渡してはならない。
--
--   【将来、リスクをさらに下げたい場合の代替案】（Phase 0b では採用しない）
--     Supabase Auth と WorkOS を統合し、EXECUTE を authenticated ロールのみに
--     限定する。0003 / 0004 と同じ扱いで揃える。
--
-- 【LIMIT 1 の暫定性】（0003 / 0004 と同じ注記）
--   Phase 0b 前提: 1 WorkOS user = 1 active tenant。tenant_users の unique 制約は
--   (tenant_id, workos_user_id) であり、同一 workos_user_id が複数 tenant_id に
--   owner として所属することを DB レベルでは禁止していない。複数所属が発生した
--   場合、ORDER BY なしの LIMIT 1 により返却行は不定になる。
--   検出は 0003 の実行後確認[確認4] で兼ねる（同じ tenant_users を見るため
--   本ファイルでは別途の検出クエリは書かない）。
--
-- 【role = 'owner' フィルタの見直し時期】（0004 と同じ注記）
--   Phase 0b では tenant_users.role = 'owner' のみを管理画面に入れる方針。将来
--   admin / staff 等のロールを追加する際は、本関数の WHERE 句と関数名の見直しが
--   必要になる。関数名（get_owner_tenant_site_settings_for_workos_user）に "owner"
--   を埋め込んでいるのは、コメントは読み飛ばされても関数名は呼び出し時に必ず目に
--   入り、owner 専用であることに気づけるようにするため。role フィルタを緩める場合
--   は関数名も同時に変更し、名前と挙動を乖離させないこと。
--
-- 【なぜ tenant_site_settings に LEFT JOIN するか / ON 句と WHERE 句の使い分け】
--   membership 判定（tenant_users・tenants）は必須条件のため INNER JOIN する。
--   一方 tenant_site_settings は「まだ作成されていない」正常系が存在するため
--   （初回ログイン後にテンプレート選択が行われるまでは行が無い）、LEFT JOIN と
--   する。
--
--   期待する挙動:
--     - membership 不整合 → 0 行返却(呼び出し側は認可失敗として扱う)
--     - membership OK + site_settings 未作成 → 1 行返却、template_type = NULL
--     - membership OK + site_settings 存在 → 1 行返却、template_type = 実値
--
--   これにより「所属不整合」と「未設定（正常）」をアプリ側で明確に区別できる。
--
--   仮に将来 tenant_site_settings.deleted_at カラムを追加する場合、対応条件
--   （例: AND tss.deleted_at IS NULL）は必ず LEFT JOIN の ON 句に置くこと。
--   WHERE 句に置くと LEFT JOIN が実質 INNER JOIN 化し、site_settings 未作成の
--   ケースで 0 行になってしまう（membership OK でも認可失敗扱いになる事故）。
--
-- 【tenant_site_settings に deleted_at がない件】
--   0001 の設計により、tenant_site_settings は deleted_at を持たない
--   （0001 のテーブル定義コメント: 「deleted_at は持たない。テナント削除時は
--   CASCADE で消える。」）。したがって本関数の WHERE / ON 句に tss.deleted_at
--   条件は含めない。将来 deleted_at を追加する場合は、上記【LEFT JOIN】節の
--   指針に従い ON 句に置くこと。
--
-- 【前提（実行前に確認）】
--   1. 0001_hp_template_system.sql が適用済みであること（tenant_users・
--      tenant_site_settings・tenants テーブルが存在する）
--   2. 0003 / 0004 の関数が既に存在すること（同じ設計思想の続きとして書かれて
--      いるため、これらが未適用のまま本ファイルだけを適用しない）
-- ================================================================


-- ================================================================
-- 実行前確認 SQL
-- ================================================================

-- [前提確認 1] tenant_users テーブルが存在すること
-- SELECT count(*) FROM public.tenant_users;

-- [前提確認 2] tenant_site_settings テーブルが存在すること
-- SELECT count(*) FROM public.tenant_site_settings;

-- [前提確認 3] tenants テーブルに slug / deleted_at カラムが存在すること
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'tenants'
--   AND column_name IN ('slug', 'deleted_at');

-- [前提確認 4] 0003 / 0004 の関数が既に存在すること
-- SELECT proname
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname IN ('get_tenant_id_for_workos_user',
--                   'get_owner_tenant_for_workos_user');

-- [冪等性確認] 本関数が既に存在する場合は実行しない
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_site_settings_for_workos_user';


-- ================================================================
-- 1. public.get_owner_tenant_site_settings_for_workos_user() SECURITY DEFINER 関数
-- ================================================================
-- 【SECURITY DEFINER を使う理由】
--   tenant_users には anon / authenticated 向けの RLS read policy が存在しない。
--   SECURITY DEFINER 関数は関数所有者の権限で実行されるため tenant_users を
--   直接スキャンできる。tenant_site_settings の anon read policy にも依存しない。
--
-- 【起点は workos_user_id + tenant_slug、template_type は結果として返すだけ】
--   起点は必ず認証済み workos_user_id 側（+ URL 由来の tenant_slug）。
--   template_type は結果として返すだけで、フィルタ条件には使わない。
--
-- 【LEFT JOIN で site_settings 未作成を正常系として扱う】
--   詳細はファイルヘッダー【なぜ tenant_site_settings に LEFT JOIN するか】節参照。

CREATE FUNCTION public.get_owner_tenant_site_settings_for_workos_user(
  p_workos_user_id text,
  p_tenant_slug    text
)
RETURNS TABLE(tenant_id uuid, template_type text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, tss.template_type
  FROM public.tenant_users tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  LEFT JOIN public.tenant_site_settings tss
    ON tss.tenant_id = t.id
    -- 将来 tenant_site_settings.deleted_at を追加した場合は、ここ（LEFT JOIN の
    -- ON 句）に AND tss.deleted_at IS NULL を追加する。WHERE 句に置くと LEFT
    -- JOIN が INNER JOIN 化し、site_settings 未作成ケースで 0 行になる事故が
    -- 発生するため、必ず ON 句に置くこと。
  WHERE tu.workos_user_id = p_workos_user_id
    AND tu.role           = 'owner'
    AND tu.deleted_at     IS NULL
    AND t.deleted_at      IS NULL
    AND t.slug            = p_tenant_slug
  LIMIT 1;
$$;

-- EXECUTE 権限の設定
-- anon に付与する理由・リスク評価・将来案はファイルヘッダーの
-- 【なぜ authenticated ではなく anon に GRANT EXECUTE するのか】参照。
REVOKE EXECUTE ON FUNCTION public.get_owner_tenant_site_settings_for_workos_user(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_owner_tenant_site_settings_for_workos_user(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_owner_tenant_site_settings_for_workos_user(text, text) TO anon;


-- ================================================================
-- 実行後確認 SQL
-- ================================================================

-- [確認 1] 関数が作成されたこと（SECURITY DEFINER・search_path・返り値型 確認）
-- SELECT proname, prosecdef, proconfig, pg_get_function_result(oid) AS result_type
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_site_settings_for_workos_user';
-- ↑ prosecdef = true・proconfig に search_path=public を含む・
--   result_type = 'TABLE(tenant_id uuid, template_type text)' であること。

-- [確認 2] EXECUTE 権限が anon のみに付与されていること
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name   = 'get_owner_tenant_site_settings_for_workos_user';

-- [確認 3] 関数所有者の確認
-- SELECT proname, pg_get_userbyid(proowner) AS owner
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_site_settings_for_workos_user';
-- ↑ owner は tenant_users / tenants / tenant_site_settings を RLS なしで読める
--   権限を持つロール（postgres または service_role 相当）であること。

-- [確認 4] LEFT JOIN の意図通り「所属不整合」と「site_settings 未作成」が区別できること
-- テスト実行（<enu オーナーの workos_user_id> は実値に置換）:
--
--   SELECT * FROM public.get_owner_tenant_site_settings_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu'
--   );
--   ↑ enu の site_settings 行が未作成なら 1 行返り template_type IS NULL であること。
--     enu の site_settings 行が作成済みなら 1 行返り template_type が実値であること。
--
--   SELECT * FROM public.get_owner_tenant_site_settings_for_workos_user(
--     'user_INVALID', 'enu'
--   );
--   ↑ 0 行返ること（存在しない workos_user_id）。
--
--   SELECT * FROM public.get_owner_tenant_site_settings_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'other-slug'
--   );
--   ↑ 0 行返ること（enu 以外の slug は enu オーナーには属さない）。

-- [確認 5] 複数所属の検出は 0003 の実行後確認[確認4] で兼ねる
-- 本関数と 0003 は同じ tenant_users を参照しており、複数 tenant 所属の検出は
-- 0003 側で実施すれば十分。ここでは重複する検出クエリを書かない。

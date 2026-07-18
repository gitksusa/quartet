-- ================================================================
-- Migration : 0006_upsert_owner_tenant_template_type
-- Created   : 2026-07-18
-- Scope     : Phase 0b – アプリ層の認可専用 tenant template_type UPSERT 関数
--             public.upsert_owner_tenant_template_type_for_workos_user(text, text, text)
--               RETURNS TABLE(tenant_id uuid)
-- Apply     : 0001・0003・0004・0005 適用後。0002 は依然除外（auth.current_workos_user_id() 未実装）。
--             PR8（src/lib/tenant/site-settings.ts の saveOwnerTenantTemplateType）の
--             実装と合わせて適用する。
-- Design    : docs/design/auth-tenant-access-control.md セクション5
--             docs/design/hp-db-schema.md セクション1
--             docs/design/hp-template-patterns.md 原則4
-- ================================================================
--
-- 【なぜこの関数が必要か】
--   src/lib/tenant/site-settings.ts の書き込み helper で「認証済みユーザーが所有する
--   tenant の template_type を保存する」処理を実装する。認証済み workos_user_id と
--   URL の tenant_slug + 選択された template_type を起点に、認可判定と UPSERT を
--   同一トランザクション内で原子的に実行する必要がある。
--
--   単純な代替案として、Supabase server client（anon 接続）から通常の UPDATE を
--   投げる経路も検討したが、以下の理由で不可:
--     ① anon には INSERT / UPDATE 権限が付与されていない（0001 で SELECT のみ）
--     ② anon に UPDATE を GRANT すると、認可なし直接更新経路が生まれる（監査上の
--        リスク）
--     ③ 0002（RLS write policy）は auth.current_workos_user_id() 未実装のため本番
--        未適用であり、authenticated 経由の UPDATE は現状使えない
--
--   目的に特化した SECURITY DEFINER 関数として本関数を定義することで、認可判定と
--   UPSERT を DB 内で原子的に完結させる。0003 / 0004 / 0005 と同じ設計方針。
--
-- 【0003 / 0004 / 0005 との役割分担】
--   0003 は workos_user_id → tenant_id のみを返す（読み取り・resolve.ts が利用）。
--   0004 は workos_user_id → (tenant_id, tenant.slug) を返す（読み取り・access.ts が利用）。
--   0005 は workos_user_id + tenant_slug → (tenant_id, template_type) を返す
--     （読み取り・site-settings.ts が利用）。
--   本関数は workos_user_id + tenant_slug + template_type → UPSERT + 更新後の
--   tenant_id を返す（**書き込み**・site-settings.ts が利用）。
--   0003–0005 が「認可専用 read」であるのに対し、本関数は「認可専用 write」であり、
--   Phase 0b で初めての書き込み系 RPC となる。以降 PR9 / PR11+ の書き込み関数は
--   本関数のパターンを踏襲する予定。
--
-- 【スキーマ選択の理由（auth vs public）】
--   0003 / 0004 / 0005 と同じ理由。本関数は Next.js から supabase.rpc() で呼び出す
--   アプリ層関数のため public スキーマに置く。
--
-- 【なぜ authenticated ではなく anon に GRANT EXECUTE するのか】
--   0003 / 0004 / 0005 と同じ理由で、Next.js の Supabase server client は anon キーで
--   接続する（WorkOS AuthKit のセッションは Supabase Auth とは独立しているため、
--   Supabase 側の JWT は発行されない）。本関数を authenticated に限定すると
--   Next.js から呼べない。
--
--   【リスクと許容範囲】
--     ① 呼び出し元は「p_workos_user_id が呼び出し元本人か」を DB では検証しない。
--        anon 権限を持つ第三者が有効な workos_user_id を推定できれば、対応する
--        tenant の template_type を上書きできる可能性がある。
--     ② workos_user_id は WorkOS が発行する不透明な文字列でありブルートフォース
--        列挙は非現実的。加えて本関数は p_tenant_slug との両方一致が必要。
--     ③ 得られる副作用は tenant_site_settings.template_type の更新のみ。個人情報や
--        他テナントのデータには波及しない。テンプレートの値は 6 種の許容値内に
--        制限される（下記【DB 側でも許容値を検証する理由】参照）ため、任意 SQL や
--        任意テキストの注入経路にはならない。
--     ④ 呼び出し元の必須制約は site-settings.ts 側で強制する:
--        p_workos_user_id には必ず WorkOS の検証済みサーバーセッション
--        （withAuth() の返却値）から取得した値を渡す。クライアント入力・URL
--        パラメータ・ブラウザ状態由来の値を絶対に渡してはならない。
--
--   【将来、リスクをさらに下げたい場合の代替案】（Phase 0b では採用しない）
--     Supabase Auth と WorkOS を統合し、EXECUTE を authenticated ロールのみに
--     限定する。0003 / 0004 / 0005 と同じ扱いで揃える。
--
-- 【LIMIT 1 相当（1 テナント 1 行の担保）】
--   tenant_site_settings は tenant_id を PK とする 1:1 テーブル（0001 で定義）。
--   ON CONFLICT (tenant_id) DO UPDATE により 1 テナント 1 行が保証される。認可判定
--   の tenant_users スキャンは LIMIT 1（0003 / 0004 / 0005 と同じ）で、複数所属時の
--   検出は 0003 の実行後確認[確認4] で兼ねる（重複クエリを書かない方針）。
--
-- 【role = 'owner' フィルタの見直し時期】（0004 / 0005 と同じ注記）
--   Phase 0b では tenant_users.role = 'owner' のみが管理画面から書き込める。将来
--   admin / staff 等のロールを追加する際は、本関数の WHERE 句と関数名の見直しが
--   必要になる。関数名（upsert_owner_tenant_template_type_for_workos_user）に "owner"
--   を埋め込んでいるのは、コメントは読み飛ばされても関数名は呼び出し時に必ず目に
--   入り、owner 専用であることに気づけるようにするため。role フィルタを緩める場合
--   は関数名も同時に変更し、名前と挙動を乖離させないこと。
--
-- 【DB 側でも許容値を検証する理由（アプリ層のみでは不十分）】
--   template_type の許容値（'atmosphere','gallery','staff','conversion','trust','brand'）
--   は本関数内でも `NOT IN (...) THEN RAISE EXCEPTION` により検証する。理由:
--     ① 本関数は anon EXECUTE を許可しているため、Next.js アプリ層のバリデーション
--        （TS union / Zod）をバイパスして任意の p_template_type を投げられる経路が
--        存在する。関数単体で防御しないと、不正値が本番 DB に入る余地が残る。
--     ② template_type は公開 HP の描画分岐（HTML 骨格の選択）に直結する。不正値が
--        入ると公開 HP のレンダリングが壊れ、ユーザー影響が大きい。
--     ③ tenant_site_settings.template_type は NOT NULL・text 型（0001）。DB 型
--        レベルでは自由文字列を受け入れてしまうため、書き込み関数側で列挙値制約を
--        強制する。
--     ④ p_template_type = NULL も 22023 で弾く。PostgreSQL の三値論理により
--        `NULL NOT IN (...)` は true ではなく NULL を返すため、IS NULL チェックを
--        明示的に併記する。併記しないと NULL が IF に入らず UPSERT に到達し、
--        tenant_site_settings.template_type の NOT NULL 制約違反 23502 になり、
--        契約（6 種以外は 22023）と乖離する。
--
-- 【mood との扱いの非対称性】
--   `template_type` は本関数内で許容値検証を行い、テンプレ追加時は本関数の許容値
--   リストを更新する **migration を伴う**。一方 `mood` はアプリ層 Zod のみで管理し、
--   mood 追加は **migration 不要**（`hp-db-schema.md` 節 1・`hp-template-patterns.md`
--   原則 4 参照）。この非対称性は「不正値が本番 HP のレンダリングを壊すかどうか」
--   の影響度の差に基づく設計判断:
--     - template_type: HTML 骨格の選択に直結・不正値でレンダリング破綻の可能性
--     - mood: CSS 変数トークンの差替のみ・不正値でもフォールバックで安全
--   将来 mood 側も骨格に影響する要素を持たせる方針変更があれば、本関数と同様の
--   DB 側検証（mood 用の書き込み RPC）を導入する。
--
-- 【RETURNS TABLE の出力列名と SQL 文中の列名の衝突に注意】
--   plpgsql の RETURNS TABLE(col ...) は関数内で col を出力変数として暗黙宣言する。
--   そのため INSERT / UPDATE / ON CONFLICT / RETURNING / SELECT 内で同名の列を
--   参照すると 42702 column reference is ambiguous になる。本関数では
--   RETURNS TABLE(tenant_id uuid) と tenant_site_settings.tenant_id が衝突したため、
--   ON CONFLICT は列指定ではなく ON CONSTRAINT tenant_site_settings_pkey を使う。
--   以降の書き込み系 plpgsql 関数でも、出力列名とテーブル列名の衝突有無を必ず確認し、
--   ON CONFLICT は可能な限り ON CONSTRAINT を用いること。
--   （#variable_conflict use_column は関数全体の解決規則を変えるため、局所的な
--     曖昧さが残る場合のみ限定的に採用する）
--
-- 【本ファイルが CREATE OR REPLACE FUNCTION を使う理由】
--   0003 / 0004 / 0005 は CREATE FUNCTION を使っているが、本ファイルのみ
--   CREATE OR REPLACE FUNCTION を使う。初回適用時に ON CONFLICT (tenant_id) の
--   曖昧参照バグ（42702）を含む版を本番へ適用してしまい、同一シグネチャのまま
--   置換する必要が生じたため。CREATE OR REPLACE は関数を原子的に差し替えるので、
--   DROP → CREATE のように「一瞬関数が消える」瞬間が発生しない。
--   ファイルの SQL をそのまま本番で実行できる状態を保つことを優先した判断であり、
--   0007 以降の新規関数で CREATE FUNCTION に戻すかは別途判断する。
--
-- 【前提（実行前に確認）】
--   1. 0001 が適用済み（tenant_site_settings テーブルが存在する）
--   2. 0003 / 0004 / 0005 の関数が既に存在（同じ設計思想の続きとして書かれている）
-- ================================================================


-- ================================================================
-- 実行前確認 SQL
-- ================================================================

-- [前提確認 1] tenant_site_settings テーブルが存在すること
-- SELECT count(*) FROM public.tenant_site_settings;

-- [前提確認 2] tenant_site_settings.template_type カラムの型と制約
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'tenant_site_settings'
--   AND column_name  = 'template_type';
-- ↑ text / NOT NULL / デフォルト値なし であること。

-- [前提確認 3] 0003 / 0004 / 0005 の関数が既に存在すること
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname IN ('get_tenant_id_for_workos_user',
--                   'get_owner_tenant_for_workos_user',
--                   'get_owner_tenant_site_settings_for_workos_user');

-- [前提確認 4] PK 制約名の確認（ON CONFLICT ON CONSTRAINT で使用）
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.tenant_site_settings'::regclass AND contype = 'p';
-- ↑ tenant_site_settings_pkey であること。異なる場合は関数の ON CONSTRAINT 名を実値に合わせる。

-- [冪等性確認] 本関数が既に存在する場合は実行しない
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'upsert_owner_tenant_template_type_for_workos_user';


-- ================================================================
-- 1. public.upsert_owner_tenant_template_type_for_workos_user() SECURITY DEFINER 関数
-- ================================================================

CREATE OR REPLACE FUNCTION public.upsert_owner_tenant_template_type_for_workos_user(
  p_workos_user_id text,
  p_tenant_slug    text,
  p_template_type  text
)
RETURNS TABLE(tenant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- template_type の許容値検証（DB 側の防御的チェック・ファイルヘッダー
  -- 【DB 側でも許容値を検証する理由】参照）
  -- テンプレ追加時はここのリストを更新する migration が必要。
  -- IS NULL を明示的に併記する理由: PostgreSQL の三値論理により `NULL NOT IN (...)`
  -- は true ではなく NULL を返すため、IS NULL を書かないと NULL が IF に入らず
  -- UPSERT に到達し tenant_site_settings.template_type の NOT NULL 制約違反（23502）に
  -- なる。契約は「6 種以外は 22023 invalid_parameter_value」なので、NULL も同じ
  -- 22023 で弾く。
  IF p_template_type IS NULL
     OR p_template_type NOT IN ('atmosphere','gallery','staff','conversion','trust','brand')
  THEN
    RAISE EXCEPTION 'Invalid template_type: %', p_template_type
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  -- 認可判定 + tenant_id 取得
  --   0 件（認可 NG）→ v_tenant_id IS NULL → 空返却
  --   1 件（認可 OK）→ v_tenant_id に UUID
  SELECT t.id INTO v_tenant_id
  FROM public.tenant_users tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  WHERE tu.workos_user_id = p_workos_user_id
    AND tu.role           = 'owner'
    AND tu.deleted_at     IS NULL
    AND t.deleted_at      IS NULL
    AND t.slug            = p_tenant_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    -- 認可失敗: 0 行返却（既存 0004 / 0005 と同じパターン）
    RETURN;
  END IF;

  -- UPSERT（1 テナント 1 行を担保する PK 制約に依拠）
  --
  -- ON CONFLICT の指定は列名（tenant_id）ではなく制約名（tenant_site_settings_pkey）を使う。
  -- 理由: 本関数の RETURNS TABLE(tenant_id uuid) が同名の暗黙出力変数を宣言するため、
  -- ON CONFLICT (tenant_id) では 42702 column reference is ambiguous になる。
  -- 詳細はファイルヘッダー【RETURNS TABLE の出力列名と SQL 文中の列名の衝突に注意】参照。
  INSERT INTO public.tenant_site_settings (tenant_id, template_type, created_at, updated_at)
  VALUES (v_tenant_id, p_template_type, now(), now())
  ON CONFLICT ON CONSTRAINT tenant_site_settings_pkey DO UPDATE
    SET template_type = EXCLUDED.template_type,
        updated_at    = now();

  -- 更新後の tenant_id を返却（1 行）
  RETURN QUERY SELECT v_tenant_id;
END;
$$;

-- EXECUTE 権限の設定
-- anon に付与する理由・リスク評価・将来案はファイルヘッダーの
-- 【なぜ authenticated ではなく anon に GRANT EXECUTE するのか】参照。
REVOKE EXECUTE ON FUNCTION public.upsert_owner_tenant_template_type_for_workos_user(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_owner_tenant_template_type_for_workos_user(text, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_owner_tenant_template_type_for_workos_user(text, text, text) TO anon;


-- ================================================================
-- 実行後確認 SQL
-- ================================================================

-- [確認 1] 関数が作成されたこと（SECURITY DEFINER・search_path・返り値型）
-- SELECT proname, prosecdef, proconfig, pg_get_function_result(oid) AS result_type
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'upsert_owner_tenant_template_type_for_workos_user';
-- ↑ prosecdef = true・proconfig に search_path=public を含む・
--   result_type = 'TABLE(tenant_id uuid)' であること。

-- [確認 2] EXECUTE 権限が anon のみに付与されていること
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name   = 'upsert_owner_tenant_template_type_for_workos_user';

-- [確認 3] 関数所有者の確認
-- SELECT proname, pg_get_userbyid(proowner) AS owner
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'upsert_owner_tenant_template_type_for_workos_user';
-- ↑ owner は tenant_users / tenants / tenant_site_settings を RLS なしで
--   読み書きできる権限を持つロール（postgres または service_role 相当）であること。

-- [確認 4] 挙動テスト（<enu オーナーの workos_user_id> は実値に置換）
--
--   -- 4a. 認可 OK + 許容値内 → 1 行返却、tenant_site_settings に UPSERT
--   SELECT * FROM public.upsert_owner_tenant_template_type_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', 'atmosphere'
--   );
--   SELECT template_type FROM public.tenant_site_settings WHERE tenant_id = (
--     SELECT id FROM public.tenants WHERE slug = 'enu'
--   );
--   ↑ template_type = 'atmosphere' が入っていること。42702 column reference
--     ambiguous が出ないこと（ON CONFLICT ON CONSTRAINT で衝突回避済み）。
--
--   -- 4b. 認可 OK + 別の許容値 → UPDATE 経路の確認
--   SELECT * FROM public.upsert_owner_tenant_template_type_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', 'gallery'
--   );
--   -- template_type = 'gallery' に更新されていること。
--
--   -- 4c. 認可 NG → 0 行返却
--   SELECT * FROM public.upsert_owner_tenant_template_type_for_workos_user(
--     'user_INVALID', 'enu', 'atmosphere'
--   );
--   ↑ 0 行返ること。
--
--   -- 4d. 許容値外 → 例外
--   SELECT * FROM public.upsert_owner_tenant_template_type_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', 'invalid_value'
--   );
--   ↑ 22023 invalid_parameter_value で例外になること。tenant_site_settings は
--     4b の状態から変わっていないこと。
--
--   -- 4e. NULL → 例外
--   SELECT * FROM public.upsert_owner_tenant_template_type_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', NULL
--   );
--   ↑ 22023 invalid_parameter_value で例外になること（23502 ではないこと）。

-- [確認 5] 複数所属の検出は 0003 の実行後確認[確認4] で兼ねる
-- 本関数と 0003 は同じ tenant_users を参照しており、複数 tenant 所属の検出は
-- 0003 側で実施すれば十分。ここでは重複する検出クエリを書かない。

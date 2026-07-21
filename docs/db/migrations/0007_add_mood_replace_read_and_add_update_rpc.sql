-- ================================================================
-- Migration : 0007_add_mood_replace_read_and_add_update_rpc
-- Created   : 2026-07-21
-- Scope     : Phase 0b – tenant_site_settings.mood カラムの追加、0005 read 関数の
--             返り値型拡張(mood を追加)、および UPDATE 専用の mood 保存関数を
--             追加。以下 3 変更を単一トランザクションで統合適用する:
--               (1) ALTER TABLE public.tenant_site_settings ADD COLUMN mood text NULL
--                   + CHECK 制約 tenant_site_settings_mood_length_check
--               (2) 0005 の get_owner_tenant_site_settings_for_workos_user を
--                   DROP → CREATE で in-place 置換
--                   (RETURNS TABLE(tenant_id uuid, template_type text) →
--                    RETURNS TABLE(tenant_id uuid, template_type text, mood text))
--                   DROP により失われた GRANT/REVOKE を再設定
--               (3) CREATE FUNCTION public.update_owner_tenant_mood_for_workos_user(
--                       text, text, text) RETURNS TABLE(tenant_id uuid)
--                   REVOKE PUBLIC / REVOKE authenticated / GRANT anon
-- Apply     : 0001・0003・0004・0005・0006 適用後。0002 は依然除外
--             (auth.current_workos_user_id() 未実装)。PR9 のコード実装と合わせて適用する。
-- Design    : docs/design/auth-tenant-access-control.md セクション5
--             docs/design/hp-db-schema.md 節1
--             docs/design/hp-template-patterns.md 原則4 / mood パレット定義
--             docs/learning/003_admin_write_rpc_and_sql_pitfalls.md(本ファイルは003の規約を適用)
-- ================================================================
--
-- 【なぜ ALTER TABLE と 2 関数変更を統合するか】
--   3 変更は「PR9 で mood 保存機能を成立させる」ための不可分な最小セット。
--   カラム追加なしに update 関数を作っても動かず、read 関数を拡張しないと管理画面の
--   初期表示(getOwnerTenantSiteSettings)で mood を取得できない。同一 PR / 同一
--   本番適用単位で扱うのが自然。
--
-- 【全体を単一トランザクションにする理由(重要)】
--   本ファイルは Part 1(ALTER TABLE)・Part 2(0005 置換)・Part 3(update 関数追加)
--   の全体を単一 BEGIN/COMMIT で囲む。
--
--   目的: 部分適用状態を作らない。
--     Part 1 成功 → Part 2 失敗の場合、「mood カラムは存在するが read 関数は mood を
--     返さない」中途半端な状態が残り、実行前確認の冪等性チェックもどこまで適用済み
--     か曖昧になる。全体をトランザクション化すれば「全部適用されるか、何も適用され
--     ないか」の二択になり、リカバリが単純化する。
--
--   ロック時間の懸念:
--     ALTER TABLE ADD COLUMN mood text NULL(DEFAULT なし・NULL 許容)は既存行の
--     テーブル書き換え不要(PostgreSQL 11+ の高速パス)。本番の tenant_site_settings
--     行は enu の 1 行のみで、ロック時間は実質無視できる。CHECK 制約追加も
--     tenant_site_settings 全走査(1 行)で完了。関数の DROP → CREATE は
--     ACCESS EXCLUSIVE ロックだが、本番運用では他セッションからの並行呼び出しが
--     ほぼ無いため影響は皆無。
--
--   PostgreSQL DDL のトランザクション対応:
--     ALTER TABLE / CREATE FUNCTION / DROP FUNCTION いずれもトランザクション対応。
--     COMMIT まで他セッションには古い状態が見え、COMMIT の瞬間に原子的に切り替わる。
--     したがって「関数消失時間」「カラム未存在時間」は外部から観測されない。
--
-- 【0003 / 0004 / 0005 / 0006 との役割分担】
--   0003 : workos_user_id → tenant_id(read・resolve.ts)
--   0004 : workos_user_id → (tenant_id, slug)(read・access.ts)
--   0005 : workos_user_id + tenant_slug → (tenant_id, template_type)
--          → 本 PR9 で (tenant_id, template_type, mood) に in-place 置換
--          (read・site-settings.ts の getOwnerTenantSiteSettings に接続)
--   0006 : workos_user_id + tenant_slug + template_type → UPSERT + tenant_id
--          (write・PR8・site-settings.ts の saveOwnerTenantTemplateType)
--   0007 update 関数 : workos_user_id + tenant_slug + mood → UPDATE のみ + tenant_id
--          (write・本 PR9・site-settings.ts の saveOwnerTenantMood)
--
-- 【スキーマ選択の理由 / anon EXECUTE の理由】
--   0003 / 0004 / 0005 / 0006 と同じ理由。詳細は 0006 ヘッダ参照。
--
-- 【0005 read 関数を DROP → CREATE で置換する理由(重要)】
--   0005 の RETURNS TABLE(tenant_id uuid, template_type text) に mood 列を追加して
--   (tenant_id uuid, template_type text, mood text) にする。
--
--   なぜ CREATE OR REPLACE ではダメか:
--     PostgreSQL は既存関数の返り値型(RETURN TYPE)を CREATE OR REPLACE で変更できない。
--     「cannot change return type of existing function」エラーになる。返り値の
--     列追加はシグネチャ変更に該当し、DROP → CREATE が必須。
--
--   0006 との差異:
--     0006 の修正版(v0.15.1)は関数シグネチャ(引数の型・順序・RETURN TYPE)が
--     broken 版と完全に同一で、本体のみ変更(ON CONFLICT の指定方法)だった。
--     そのため CREATE OR REPLACE で原子的置換できた。0007 はそれとは事情が異なる。
--
--   なぜ REVOKE/GRANT を同一トランザクションに含めるのか:
--     DROP FUNCTION は関数と紐づく GRANT / REVOKE を消失させる。CREATE FUNCTION
--     直後の default 権限は「PUBLIC への EXECUTE を含む」PostgreSQL のデフォルトで、
--     これは本プロジェクトの「必要最小限の GRANT(anon のみ)」方針に反する。
--     同一トランザクション内で REVOKE PUBLIC / REVOKE authenticated / GRANT anon
--     を再設定することで、他セッションから見て「権限が緩い瞬間」も存在しない。
--
-- 【UPDATE 専用にする設計判断(mood 保存 RPC・重要)】
--   tenant_site_settings.template_type は NOT NULL DEFAULT なし(0001)。したがって
--   site_settings 行が未作成のテナントで mood だけを UPSERT すると、INSERT 経路で
--   NOT NULL 制約違反(23502)になる。
--
--   対応: mood 保存関数は UPSERT ではなく **UPDATE 専用** にする。
--     - site_settings 行がある → mood を UPDATE、1 行返却
--     - site_settings 行がない → INSERT せず 0 行返却
--     - 認可 NG → 0 行返却
--
--   UI 側(step2-mood-picker.tsx)は currentTemplateType === null 時に保存ボタンを
--   disabled + 案内表示することで、site_settings 行未作成のケースが通常操作で
--   到達しないよう防御する。
--
--   認可 NG と site_settings 行なしは、helper 側では両方 rows.length === 0 →
--   TenantNotFoundError として扱う(案 P・PR8 の rows.length === 0 パターンをそのまま
--   維持)。案 R(ERRCODE '55000' で区別)は採用しない。理由は STEP3+ 書き込み RPC
--   での設計負債回避、および UI 側の disabled 防御で通常到達しないため。
--
-- 【mood の NULL 扱いは 2 箇所で意味が異なる(実装時に混同しないこと)】
--   1. カラム制約: mood は **NULL 許容**。
--        理由: PR8 の 0006 で INSERT される tenant_site_settings 行は mood 未選択の状態
--        で作られる(0006 は template_type と created_at/updated_at のみ VALUES に含める)。
--        カラムのデフォルトは NULL。「mood 未設定」を NULL で正常な状態として表現する。
--
--   2. 本 update RPC の p_mood 引数検証: NULL は **拒否**。
--        理由: 本 RPC は「mood を選んで保存する」操作であり、NULL を渡すのは契約違反。
--        DB の CHECK 制約違反(23514 check_violation)ではなく契約エラー
--        (22023 invalid_parameter_value)として返す(PR8 の 0006 の p_template_type と
--        同じ契約に揃える)。
--
--        IS NULL を明示的に併記する理由は 0006 と同じ(PostgreSQL 三値論理: NULL は
--        NOT IN や比較演算で true ではなく NULL を返すため、IS NULL を書かないと
--        NULL が IF に入らない)。
--
--   この 2 箇所の非対称は、カラムが「保存された状態」・引数が「これから保存する値」
--   という文脈の違いによる。実装時に混同しないこと。
--
-- 【CHECK 制約に明示名を付ける理由】
--   制約名 tenant_site_settings_mood_length_check を明示指定する。理由:
--     - 自動生成名は PostgreSQL のバージョン・順序で変化しうるため、実行前確認 SQL /
--       実行後確認 SQL / 将来の DROP CONSTRAINT / 将来の差し替えで確実性を欠く
--     - 明示名にすると pg_constraint で正確に確認できる
--     - 将来 CHECK の内容を変更したい時に DROP + ADD で差し替える手順が明確になる
--
-- 【UPDATE で必ずテーブル別名を使う理由】
--   update 関数は RETURNS TABLE(tenant_id uuid) を持ち、plpgsql 内で tenant_id を
--   出力変数として暗黙宣言する。UPDATE 文の WHERE 句で WHERE tenant_id = v_tenant_id
--   と書くと、tenant_id が「出力変数」なのか「tenant_site_settings.tenant_id 列」なのか
--   曖昧になり 42702 column reference is ambiguous になる(0006 で ON CONFLICT で発生
--   したのと同根)。
--
--   対策: UPDATE では AS tss 別名を必ず付与し、WHERE 句を tss.tenant_id と明示修飾する。
--   詳細は docs/learning/003 の該当節参照。
--
-- 【mood の DB 側検証: 列挙はしない・NULL と長さのみ】
--   template_type は 0006 で列挙値検証(6 種の allow list)+ NULL 弾きを DB 側で行う。
--   一方 mood は本関数で NULL 弾き + 長さ検証(1〜50 文字)のみを行い、**列挙値検証は
--   しない**。理由:
--     - 「mood 追加は migration 不要」の思想(hp-template-patterns.md 原則4)を維持
--     - mood は CSS 変数トークンの差替のみで公開 HP の骨格には影響せず、不正値でも
--       公開 HP 側のフォールバックで無害化できる想定
--     - NULL/長さの防御は「anon EXECUTE で任意テキストが書ける」構造上のリスクへの
--       最低限の緩和(DoS 対策・列挙は TS `as const` union で管理)
--
--   Source of Truth: mood 列挙値はアプリ層 src/lib/constants/site-settings.ts の
--   MOODS 定数(`as const` union)。追加時は本ファイルと 0007 の migration 変更なし、
--   MOODS 定数のみを更新する。
--
--   読み取り側での正規化: DB は列挙検証しないため、getOwnerTenantSiteSettings は
--   isMoodId() 型ガードで既知値へ正規化する(未知値は null 化・UI 上「未設定」表示)。
--
-- 【CREATE FUNCTION の使い分け】
--   本ファイルの update 関数は新規追加のため CREATE FUNCTION を使う。
--   0005 read 関数の置換部分も CREATE FUNCTION(DROP 後の新規作成として)を使う。
--   0006 の CREATE OR REPLACE FUNCTION は「broken 版が既に本番にある場合の同一
--   シグネチャ原子的置換」のための例外措置であり、本ファイルとは事情が異なる。
--
-- 【前提(実行前に確認)】
--   1. 0001 が適用済み(tenant_site_settings テーブルが存在する)
--   2. 0003 / 0004 / 0005 / 0006 の関数が既に存在
--   3. tenant_site_settings.mood カラムが未存在
--   4. CHECK 制約 tenant_site_settings_mood_length_check が未存在
--   5. 0005 read 関数の返り値型が現行版(mood を含まない)であること
-- ================================================================


-- ================================================================
-- 実行前確認 SQL
-- ================================================================

-- [前提確認 1] tenant_site_settings テーブルが存在すること
-- SELECT count(*) FROM public.tenant_site_settings;

-- [前提確認 2] mood カラムが未存在であること
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'tenant_site_settings'
--   AND column_name  = 'mood';
-- ↑ 0 行返ればOK(mood カラムが未存在)。

-- [前提確認 3] CHECK 制約 tenant_site_settings_mood_length_check が未存在であること
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.tenant_site_settings'::regclass
--   AND conname  = 'tenant_site_settings_mood_length_check';
-- ↑ 0 行返ればOK。

-- [前提確認 4] 0003 / 0004 / 0005 / 0006 の関数が既に存在すること
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname IN ('get_tenant_id_for_workos_user',
--                   'get_owner_tenant_for_workos_user',
--                   'get_owner_tenant_site_settings_for_workos_user',
--                   'upsert_owner_tenant_template_type_for_workos_user');

-- [前提確認 5] 0005 read 関数の返り値型が現行版(mood を含まない)であること
-- SELECT pg_get_function_result(oid) AS result_type
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_site_settings_for_workos_user';
-- ↑ 'TABLE(tenant_id uuid, template_type text)' が返ればOK。
--   'TABLE(tenant_id uuid, template_type text, mood text)' が返れば
--   本 migration は既に適用済み(冪等性確認)。

-- [冪等性確認] update 関数が未存在であること
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'update_owner_tenant_mood_for_workos_user';
-- ↑ 0 行返ればOK。


-- ================================================================
-- Part 1〜Part 3 全体を単一トランザクションで実行
--   ヘッダ【全体を単一トランザクションにする理由】参照
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- Part 1. tenant_site_settings に mood カラム + CHECK 制約を追加
-- ----------------------------------------------------------------

ALTER TABLE public.tenant_site_settings
  ADD COLUMN mood text NULL;

ALTER TABLE public.tenant_site_settings
  ADD CONSTRAINT tenant_site_settings_mood_length_check
  CHECK (mood IS NULL OR char_length(mood) BETWEEN 1 AND 50);


-- ----------------------------------------------------------------
-- Part 2. 0005 read 関数の in-place 置換
--   DROP → CREATE → REVOKE/GRANT(DROP で失われた権限を再設定)
--   ヘッダ【0005 read 関数を DROP → CREATE で置換する理由】参照
-- ----------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_owner_tenant_site_settings_for_workos_user(text, text);

CREATE FUNCTION public.get_owner_tenant_site_settings_for_workos_user(
  p_workos_user_id text,
  p_tenant_slug    text
)
RETURNS TABLE(tenant_id uuid, template_type text, mood text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, tss.template_type, tss.mood
  FROM public.tenant_users tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  LEFT JOIN public.tenant_site_settings tss
    ON tss.tenant_id = t.id
    -- 将来 tenant_site_settings.deleted_at を追加した場合は、ここ(LEFT JOIN の
    -- ON 句)に AND tss.deleted_at IS NULL を追加する。WHERE 句に置くと LEFT
    -- JOIN が INNER JOIN 化し、site_settings 未作成ケースで 0 行になる事故が
    -- 発生するため、必ず ON 句に置くこと(0005 原版の教訓)。
  WHERE tu.workos_user_id = p_workos_user_id
    AND tu.role           = 'owner'
    AND tu.deleted_at     IS NULL
    AND t.deleted_at      IS NULL
    AND t.slug            = p_tenant_slug
  LIMIT 1;
$$;

-- DROP により失われた GRANT/REVOKE を同一トランザクション内で再設定する。
REVOKE EXECUTE ON FUNCTION public.get_owner_tenant_site_settings_for_workos_user(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_owner_tenant_site_settings_for_workos_user(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_owner_tenant_site_settings_for_workos_user(text, text) TO anon;


-- ----------------------------------------------------------------
-- Part 3. update_owner_tenant_mood_for_workos_user() SECURITY DEFINER 関数を追加
-- ----------------------------------------------------------------

CREATE FUNCTION public.update_owner_tenant_mood_for_workos_user(
  p_workos_user_id text,
  p_tenant_slug    text,
  p_mood           text
)
RETURNS TABLE(tenant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id     uuid;
  v_updated_count int;
BEGIN
  -- mood の防御的検証(NULL 拒否 + 長さ 1〜50 範囲外は 22023 例外)
  -- 詳細はファイルヘッダー【mood の NULL 扱いは 2 箇所で意味が異なる】参照。
  -- IS NULL を明示併記する理由は 0006 と同じ(三値論理・NULL は比較演算で NULL を返す)。
  IF p_mood IS NULL
     OR char_length(p_mood) < 1
     OR char_length(p_mood) > 50
  THEN
    RAISE EXCEPTION 'Invalid mood: %', p_mood
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  -- 認可判定 + tenant_id 取得
  --   0 件(認可 NG) → v_tenant_id IS NULL → 空返却
  --   1 件(認可 OK) → v_tenant_id に UUID
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
    -- 認可失敗: 0 行返却(既存 0004 / 0005 / 0006 と同じパターン)
    RETURN;
  END IF;

  -- UPDATE 専用(INSERT はしない)。理由は【UPDATE 専用にする設計判断】参照。
  --
  -- テーブル別名 tss を必ず使う。理由: RETURNS TABLE(tenant_id uuid) の暗黙出力変数と
  -- カラム tenant_id が WHERE 句で衝突すると 42702 column reference is ambiguous に
  -- なる(0006 の ON CONFLICT と同根)。詳細はヘッダ【UPDATE で必ずテーブル別名を
  -- 使う理由】参照。
  UPDATE public.tenant_site_settings AS tss
     SET mood       = p_mood,
         updated_at = now()
   WHERE tss.tenant_id = v_tenant_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- site_settings 行が未作成(STEP1 未完了):
    -- 案 P に従い、認可 NG と同じく 0 行返却で扱う。UI 側で currentTemplateType === null
    -- 時に事前 disabled しているため通常操作で到達しない。
    RETURN;
  END IF;

  -- 更新後の tenant_id を返却(1 行)
  RETURN QUERY SELECT v_tenant_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_owner_tenant_mood_for_workos_user(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_owner_tenant_mood_for_workos_user(text, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.update_owner_tenant_mood_for_workos_user(text, text, text) TO anon;

COMMIT;


-- ================================================================
-- 実行後確認 SQL
-- ================================================================

-- [確認 1] mood カラムが追加されたこと
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'tenant_site_settings'
--   AND column_name  = 'mood';
-- ↑ data_type = text・is_nullable = YES・column_default IS NULL であること。

-- [確認 2] CHECK 制約 tenant_site_settings_mood_length_check が追加されたこと
-- SELECT conname, pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.tenant_site_settings'::regclass
--   AND conname  = 'tenant_site_settings_mood_length_check';
-- ↑ definition が
--   CHECK ((mood IS NULL) OR (char_length(mood) >= 1 AND char_length(mood) <= 50))
--   相当であること(PostgreSQL の展開形式に注意)。

-- [確認 3] CHECK 制約の挙動テスト(実データを汚さないため BEGIN...ROLLBACK)
-- BEGIN;
-- INSERT INTO public.tenant_site_settings (tenant_id, template_type, mood)
--   VALUES (
--     (SELECT id FROM public.tenants WHERE slug = 'enu'),
--     'atmosphere',
--     repeat('a', 51)
--   );
-- ↑ 23514 check_violation で例外になること(既に enu 行がある場合は 23505 pk_violation で
--   先に落ちる可能性あり・その場合は別 tenant_id で試すか CHECK テストのみ ROLLBACK で戻す)。
-- ROLLBACK;

-- [確認 4] 置換後 0005 read 関数の返り値型が拡張されたこと
-- SELECT pg_get_function_result(oid) AS result_type
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_site_settings_for_workos_user';
-- ↑ 'TABLE(tenant_id uuid, template_type text, mood text)' が返ること。

-- [確認 5] 置換後 0005 read 関数の SECURITY DEFINER / search_path が維持されていること
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'get_owner_tenant_site_settings_for_workos_user';
-- ↑ prosecdef = true・proconfig に 'search_path=public' を含むこと。

-- [確認 6] 置換後 0005 read 関数の EXECUTE 権限が anon + 所有者のみ
-- SELECT grantee, privilege_type FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name   = 'get_owner_tenant_site_settings_for_workos_user';
-- ↑ grantee に anon(と関数所有者)のみが含まれ、PUBLIC / authenticated が
--   含まれないこと。DROP により失われた権限が正しく再設定されたかの確認。

-- [確認 7] update 関数の作成・SECURITY DEFINER・返り値型
-- SELECT proname, prosecdef, proconfig, pg_get_function_result(oid) AS result_type
-- FROM pg_proc
--   JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
-- WHERE pg_namespace.nspname = 'public'
--   AND proname = 'update_owner_tenant_mood_for_workos_user';
-- ↑ prosecdef = true・proconfig に search_path=public を含む・
--   result_type = 'TABLE(tenant_id uuid)' であること。

-- [確認 8] update 関数の EXECUTE 権限が anon のみ
-- SELECT grantee, privilege_type FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name   = 'update_owner_tenant_mood_for_workos_user';

-- [確認 9] update 関数の挙動テスト(<enu オーナーの workos_user_id> は実値に置換)
--
--   -- 9a. 認可 OK + 許容値 mood + 既存行あり → 1 行返却 + UPDATE 成功
--   -- 前提: enu の site_settings 行が存在(PR8 で template_type='atmosphere' 保存済み)
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', 'modern'
--   );
--   SELECT mood FROM public.tenant_site_settings WHERE tenant_id = (
--     SELECT id FROM public.tenants WHERE slug = 'enu');
--   ↑ mood = 'modern' が入っていること。1 行返却されること。42702 が出ないこと
--     (UPDATE の tss.tenant_id 別名修飾で衝突回避済み)。
--
--   -- 9b. 認可 OK + 別の許容値 mood → UPDATE 経路の確認
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', 'natural'
--   );
--   ↑ mood = 'natural' に更新されていること。
--
--   -- 9c. 認可 NG → 0 行返却、既存行に変更なし
--   -- 変更前の mood 値を記録
--   SELECT mood FROM public.tenant_site_settings WHERE tenant_id = (
--     SELECT id FROM public.tenants WHERE slug = 'enu');
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     'user_INVALID', 'enu', 'modern'
--   );
--   ↑ 0 行返却。
--   SELECT mood FROM public.tenant_site_settings WHERE tenant_id = (
--     SELECT id FROM public.tenants WHERE slug = 'enu');
--   ↑ 変更前と同じ値(未変更)であること。
--
--   -- 9d. NULL → 22023 例外
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', NULL
--   );
--   ↑ 22023 invalid_parameter_value で例外(23514 check_violation ではないこと。
--     RPC 側の防御で先に弾かれるため CHECK には到達しない)。
--
--   -- 9e. 長さ 0 ('') → 22023 例外
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', ''
--   );
--
--   -- 9f. 長さ 51 → 22023 例外
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', repeat('a', 51)
--   );
--
--   -- 9g. site_settings 行なし + 認可 OK → 0 行返却(INSERT はされない)
--   -- 前提: enu の site_settings 行を先に DELETE で消しておく
--   -- DELETE FROM public.tenant_site_settings
--   --   WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'enu');
--   SELECT * FROM public.update_owner_tenant_mood_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu', 'modern'
--   );
--   ↑ 0 行返却(例外にならないこと・22023 にも 23502 にもならないこと)。
--   SELECT count(*) AS enu_rows FROM public.tenant_site_settings
--   WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'enu');
--   ↑ enu_rows = 0(INSERT されていないこと)。
--     クリーンアップ後、9a 実行に戻せば通常フローで再テスト可能。

-- [確認 10] 置換後 0005 read 関数の挙動テスト
--
--   -- 10a. 認可 OK + site_settings 行あり → 1 行返却(mood 列を含む)
--   SELECT * FROM public.get_owner_tenant_site_settings_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu'
--   );
--   ↑ tenant_id / template_type / mood の 3 列が返ること。
--
--   -- 10b. 認可 OK + site_settings 行なし → 1 行返却(template_type / mood ともに NULL)
--   -- 前提: enu の site_settings 行なしの状態
--   SELECT * FROM public.get_owner_tenant_site_settings_for_workos_user(
--     '<enu オーナーの workos_user_id>', 'enu'
--   );
--   ↑ tenant_id は enu の値・template_type IS NULL・mood IS NULL(LEFT JOIN 動作)。
--
--   -- 10c. 認可 NG → 0 行返却
--   SELECT * FROM public.get_owner_tenant_site_settings_for_workos_user(
--     'user_INVALID', 'enu'
--   );
--   ↑ 0 行返却。

-- [確認 11] 複数所属の検出は 0003 の実行後確認[確認4] で兼ねる
-- 本ファイルの 2 関数と 0003 は同じ tenant_users を参照。重複クエリを書かない方針。

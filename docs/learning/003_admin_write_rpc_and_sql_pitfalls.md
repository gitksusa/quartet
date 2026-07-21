# 003 書き込み系 SECURITY DEFINER RPC の設計と UPSERT 実装の落とし穴（v0.15.0 / PR8）

## 1. 何を作ったか

### v0.15.0(PR8) — STEP1 テンプレート選択の保存
- `docs/db/migrations/0006_upsert_owner_tenant_template_type.sql` — 書き込み系 SECURITY DEFINER 関数 `public.upsert_owner_tenant_template_type_for_workos_user(text, text, text) RETURNS TABLE(tenant_id uuid)`
- `src/lib/tenant/site-settings.ts` に write helper `saveOwnerTenantTemplateType(tenantSlug, templateType)` を追記
- `src/app/admin/[tenantSlug]/actions.ts` — Server Action `saveTemplateAction`（`'use server'`・`revalidatePath`）
- `src/app/admin/[tenantSlug]/step1-template-picker.tsx` — Client Component（6 テンプレ選択・選択済み復元）
- `src/app/admin/[tenantSlug]/page.tsx` の変更 — STEP1 セクション追加・管理機能の「テンプレート選択（準備中）」重複カードを削除
- `docs/design/hp-template-patterns.md` に識別子表（`atmosphere` / `gallery` / `staff` / `conversion` / `trust` / `brand`）と mood との非対称性を追記
- `docs/db/pr8-production-db-application-plan.md` — 本番 DB 適用計画

### fix commit(PR8 後・commit `fix(db)`)
- 0006 の `ON CONFLICT (tenant_id)` → `ON CONFLICT ON CONSTRAINT tenant_site_settings_pkey` に修正
- 0006 を `CREATE FUNCTION` → `CREATE OR REPLACE FUNCTION` に変更（本番の broken 版を原子的に置換するため）
- ヘッダに教訓節「RETURNS TABLE の出力列名と SQL 文中の列名の衝突に注意」と「本ファイルが CREATE OR REPLACE FUNCTION を使う理由」を追記
- pr8-plan に「既存 broken 版 0006 の置換手順」節を追加（再テスト後の enu 行クリーンアップ手順を含む）

## 2. なぜその設計にしたか

### 書き込み系 RPC の採用(v0.15.0)
- Phase 0b では `auth.current_workos_user_id()` が未実装のため RLS write policy(0002) が本番適用できない
- Supabase server client は anon 接続で、anon には SELECT のみ GRANT(0001)。anon に UPDATE を GRANT すると認可なし更新経路が生まれる
- したがって認可判定と UPSERT を DB 内で原子的に完結させる SECURITY DEFINER RPC(案 A)が**唯一の実現可能解**
- 既存 0003 / 0004 / 0005 の read 系 SECURITY DEFINER 関数と同じパターンを踏襲(workos_user_id 起点・anon EXECUTE)

### DB 側でも許容値検証を行う
- 関数は anon に EXECUTE を許可するため、Next.js アプリ層のバリデーション(TS union)をバイパスして任意の値を投げられる経路が存在する
- `template_type` は公開 HP の描画分岐(HTML 骨格の選択)に直結し、不正値でレンダリング破綻の可能性がある
- 関数単体で `IF NOT IN (...) THEN RAISE EXCEPTION` により列挙値制約を強制

### mood との扱いの非対称性
- `mood` は CSS 変数トークンの差替のみで公開 HP の骨格には影響しない
- 不正値でもフォールバックで安全に処理できるため Zod 管理のみで DB 検証なし
- テンプレ追加は migration 必須・mood 追加は Zod + トークン追加のみで migration 不要という非対称は、**「不正値が本番 HP のレンダリングを壊すかどうか」の影響度の差**に基づく意図的な設計判断

### fix commit の設計判断
- `ON CONFLICT ON CONSTRAINT`: `RETURNS TABLE(tenant_id uuid)` の暗黙出力変数と列 `tenant_id` の衝突を局所的に消す。関数全体の解決規則を変えないため副作用が最小
- `CREATE OR REPLACE FUNCTION`: 本番に broken 版が既に適用済みで、同一シグネチャのまま原子的に置換する必要があった。0006 のみの例外措置

## 3. 他にどんな選択肢があったか

### 書き込み方式(v0.15.0)
- 案 A: SECURITY DEFINER RPC(採用)
- 案 B: RLS write policy(0002) で制御し authenticated 経由の UPDATE
- 案 C: helper で先行認可(`assertTenantSlugAllowed` 相当)+ anon 接続で直接 UPDATE

### RETURNS TABLE 衝突の解消(fix commit)
- 案 A: 出力列名を `out_tenant_id` にリネーム
- 案 B: `RETURNS uuid` スカラーに変更
- 案 C: `#variable_conflict use_column` を関数冒頭に追加
- **採用: `ON CONFLICT ON CONSTRAINT tenant_site_settings_pkey`**(Codex セカンドオピニオン提案)

### broken 版の置換手順
- 案 (P1): 修正版を新規 0007 として作成し `DROP FUNCTION IF EXISTS ... CREATE FUNCTION ...`
- 案 (P2): 既存 0006 ファイルを修正し `CREATE OR REPLACE FUNCTION` に変更(採用)

## 4. なぜ却下したか

### 書き込み方式
- 案 B(RLS): 0002 が本番未適用(`auth.current_workos_user_id()` 未実装)。Supabase server client が authenticated として書き込むには WorkOS/Supabase Auth の統合が必要で、Phase 0b スコープ外
- 案 C(helper 先行認可 + 直接 UPDATE): anon に UPDATE を GRANT すると RLS のない直接更新経路が生まれる。認可 pre-check があっても、DB レベルで anon が UPDATE 可能な状態は監査上のリスク源

### RETURNS TABLE 衝突の解消
- 案 A(`out_tenant_id`): RPC の返却 JSON も `{out_tenant_id: uuid}` になり、Postgres 内部規約(`out_` prefix)が呼び出し側 API まで漏れる
- 案 B(`RETURNS uuid`): 認可 NG の表現が「0 行返却」→「NULL 返却」に変わり、0004 / 0005 の read pattern と helper の判定方式が乖離する
- 案 C(`#variable_conflict use_column`): 関数全体の変数/列解決規則を変えるため、将来「本当は変数を参照したかった曖昧名」をカラム側に倒す逆向きのバグを生む懸念(Codex 指摘)

### broken 版の置換手順
- 案 (P1): PR8 が develop merge 済みだが main 未反映のリリース前段階。0006 を permanent に broken 版として残す不自然さを避けるため、既存ファイル修正を選択

## 5. 学んだこと(技術的な理解・原則・パターン)

### PostgreSQL の三値論理
- `NULL NOT IN (...)` は true ではなく **NULL** を返す。IF ブロックには入らず後続処理に流れる
- NULL を弾くには `IS NULL OR ...` を明示的に併記する
- 書き込み関数の入力バリデーションでは、列挙値チェックの前に IS NULL を必ず書く

### plpgsql の RETURNS TABLE と暗黙変数
- `RETURNS TABLE(col ...)` は関数内で col を出力変数として暗黙宣言する
- INSERT / UPDATE / ON CONFLICT / RETURNING / SELECT 内で同名の列を参照すると `42702 column reference is ambiguous`
- 静的レビュー(Claude / Codex)では捕捉しづらい。SQL 実行時に初めて表出する

### ON CONFLICT の指定方法
- 列指定 `ON CONFLICT (col)` と制約名指定 `ON CONFLICT ON CONSTRAINT constraint_name` の 2 通り
- ON CONSTRAINT は変数/列名の曖昧参照の影響を受けない
- 局所的な曖昧さを消したい時は ON CONSTRAINT が最小介入

### `#variable_conflict use_column` のトレードオフ
- 関数全体の解決規則を「変数と列で衝突したら列を優先」に変える
- 局所的な曖昧さのために全体規則を変えると、将来「変数を参照したかった曖昧名」をカラム側に倒す逆向きバグの温床になりうる(Codex 指摘)
- 使うなら関数単位・限定的採用に留める

### 書き込み系 SECURITY DEFINER RPC の防御パターン
- anon EXECUTE の書き込み関数は、アプリ層バリデーションを迂回されうる
- 関数側でも列挙値・NULL・境界値の防御的チェックが必要
- ただしテーブル列名との衝突を避けた記法を選ぶ(例: `ON CONFLICT ON CONSTRAINT ...`)

### CREATE OR REPLACE FUNCTION の使い分け
- 通常は `CREATE FUNCTION`(既存関数を意図せず上書きするリスクを回避)
- broken 版が本番にある場合の修正は `CREATE OR REPLACE FUNCTION`(同一シグネチャの原子的置換・DROP → CREATE のような「一瞬関数が消える」瞬間が発生しない)

### 静的レビューと実行検証の役割分担
- Codex 静的レビュー: NULL チェック漏れ(三値論理)のような型/論理的問題を捕捉できた
- 一方 42702(RETURNS TABLE の暗黙変数と列名の衝突)は静的レビュー 2 回(Claude + Codex)を通過し、本番適用テストで初めて発覚
- build / lint / type-check がグリーンでも SQL 実行時にしか現れない欠陥がある
- DB 変更を伴う PR では実行後確認 SQL を必ず用意し、本番適用時に実行する

## 6. 詰まった点と解決方法

### 問題 1: NULL チェック漏れ(Codex commit 前レビューで検出)
- 症状: `IF p_template_type NOT IN ('atmosphere','gallery','staff','conversion','trust','brand') THEN RAISE EXCEPTION` だけでは NULL 入力を弾けない
- 原因: PostgreSQL の三値論理により `NULL NOT IN (...)` は true ではなく NULL を返すため、IF ブロックに入らずに UPSERT に到達し、tenant_site_settings.template_type の NOT NULL 制約違反(23502)になる
- 契約は「6 種以外は 22023 invalid_parameter_value」なので、23502 で落ちるのは設計乖離
- 検出経路: Codex の commit 前レビュー(静的解析で捕捉可能)
- 解決: `IF p_template_type IS NULL OR p_template_type NOT IN (...)` と IS NULL を明示併記
- 教訓: PostgreSQL の NOT IN + NULL は避けられない罠。書き込み関数の入力バリデーションでは常に `IS NULL OR` を先頭に書く

### 問題 2: RETURNS TABLE の暗黙変数と ON CONFLICT の列衝突(本番適用テストで発見)
- 症状: 本番 Supabase で 0006 の実行後確認テスト 4a(認可 OK + INSERT 経路)実行時に `ERROR: 42702: column reference "tenant_id" is ambiguous. DETAIL: It could refer to either a PL/pgSQL variable or a table column.`
- 原因: `RETURNS TABLE(tenant_id uuid)` が plpgsql 関数内で `tenant_id` を出力変数として暗黙宣言し、`ON CONFLICT (tenant_id)` の列参照との間で曖昧
- 検出経路: 静的レビュー 2 回(Claude・Codex)は通過し、本番適用テストで初めて発覚
- 影響範囲: 本番 DB は無傷(tenant_site_settings は 0 行のまま・失敗した書き込みはロールバック済み)。壊れているのは UPSERT 実行部分のみで、認可判定(4c: 認可 NG → 0 行)・許容値検証(4d: 22023 / 4e: NULL → 22023)は正常動作
- 3 案を検討: 案 A(出力列名リネーム)/ 案 B(RETURNS uuid スカラー)/ 案 C(`#variable_conflict use_column`)
- 解決: **Codex セカンドオピニオンで案 D(`ON CONFLICT ON CONSTRAINT tenant_site_settings_pkey`)を採用**。衝突箇所だけを局所的に消すため副作用が最小
- 教訓: 静的レビューでは捕捉できない SQL 実行時欠陥がある。DB 変更を伴う PR では実行後確認 SQL を必ず用意し、本番適用時に実行する

### 問題 3: broken 版の置換手順
- 症状: 本番に broken 版 0006 が既に適用済みの状態で、修正版をどう適用するかの手順が計画書に無い
- 選択肢: DROP → CREATE / CREATE OR REPLACE / SQL Editor 手作業置換
- 初案: 「migration ファイルは `CREATE FUNCTION` のまま・SQL Editor 上で手作業で `CREATE OR REPLACE` に置換して実行する」を提案
- Codex 指摘: 「SQL Editor で手作業置換」は適用計画書を読み飛ばすと破綻する手順であり避けるべき
- 解決: 0006 のみの例外措置として `CREATE FUNCTION` → `CREATE OR REPLACE FUNCTION` に変更。ファイルの SQL をそのまま本番で実行できる状態を維持。ヘッダに「本ファイルが CREATE OR REPLACE FUNCTION を使う理由」節を追加し、0007 以降の新規関数で `CREATE FUNCTION` に戻すかは別途判断すると明記
- 教訓: 適用計画書に依存する手順(読み飛ばすと破綻する類の手順)は作らない。ファイル単体で自己完結する形を優先

### 問題 4: テスト行のクリーンアップ確認 SQL
- 症状: 実行後確認テスト 4a / 4b で tenant_site_settings に enu の行が作られる。UI 実測(段階 4)の前に削除する必要がある
- 初案: `SELECT count(*) FROM public.tenant_site_settings;` が 0 であること
- Codex 指摘: テーブル全体の件数ではなく対象テナントで確認する。将来テナントが増えた際に他テナントの行と混同しないため
- 解決: `SELECT count(*) AS enu_rows FROM public.tenant_site_settings WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'enu');` に変更し `enu_rows = 0` を確認
- 教訓: 確認 SQL は将来のスケールを想定して対象を限定する。「今は 1 テナントしかいないから全体 count で OK」は避ける

### 補足: AI 三者体制の役割分担が機能した実例(プロセス面の観察)

実装(Claude Code)・レビュアー(Codex)・設計相談(Claude Chat)の 3 者が相互に誤りを検出した実例:
- Claude Chat が `hp-db-schema.md` を実ファイル未確認で「階層入力は既存 DB 設計と合わない」と誤判断した場面を、実ファイル確認による指摘で訂正した(実際には `tenant_sections.content` jsonb で受けられる設計だった)
- Claude Chat の `.env.local` 部分 grep 指示を Claude Code が CLAUDE.md セキュリティ制約「.env 系は読み取り・表示を一切行わない」を根拠に拒否した

役割の異なる 3 者が相互の検出網となる有効性の実例として残す(問題 1・問題 2 の Codex 検出も同種の実例)。

## 7. 運用知識(仕様・制約・ツールの挙動など)

### PostgreSQL
- `NULL NOT IN (...)` は true ではなく **NULL** を返す(三値論理)。NULL を弾くには `IS NULL OR ...` を明示併記
- `RETURNS TABLE(col ...)` は plpgsql 関数内で col を出力変数として暗黙宣言する。同名の列を SQL 文中で参照すると `42702 column reference is ambiguous`
- ON CONFLICT には `(列名)` と `ON CONSTRAINT (制約名)` の 2 通り。局所的な曖昧さを消すには `ON CONSTRAINT` が有効
- `#variable_conflict use_column` は関数全体の変数/列解決規則を変える。局所的な曖昧さのために使うと逆向きのバグを生む可能性
- `CREATE OR REPLACE FUNCTION` は同一シグネチャの関数を原子的に置換する。`DROP → CREATE` の 2 段だと一瞬でも関数が消える瞬間が発生する
- `INSERT ... ON CONFLICT ON CONSTRAINT ...` で PK 制約名を使う場合、`SELECT conname FROM pg_constraint WHERE conrelid = 'public.<table>'::regclass AND contype = 'p';` で実際の制約名を確認できる(Supabase デフォルトは `<table>_pkey`)
- エラーコード: `22023` = invalid_parameter_value / `23502` = not_null_violation / `42702` = ambiguous_column

### 書き込み系 SECURITY DEFINER RPC の防御
- anon EXECUTE を許可するため、アプリ層(TS / Zod)のバリデーションは必須ではあるが十分ではない
- DB 側でも列挙値検証・NULL チェックを併記する
- ただしテーブル列名との衝突を避けた記法を選ぶ(例: `ON CONFLICT ON CONSTRAINT ...`)

### Supabase RPC の書き込み系運用
- Server client は anon キーで接続するため、SECURITY DEFINER 関数の EXECUTE 権限は anon に付与する(0003 / 0004 / 0005 と同じ)
- REVOKE PUBLIC / REVOKE authenticated / GRANT anon の 3 点セット
- 関数のシグネチャ変更(引数の型・順序・RETURN TYPE)は DROP → CREATE が必要。同一シグネチャの本体更新は CREATE OR REPLACE が可能

### 本番 DB 適用手順の設計(PR7 で確立し PR8 で有効性が実証された)
- 「DB 適用は main デプロイ前・UI 実測は main デプロイ後」の 5 段階(PR7 導入)により、42702 バグをコード本番反映の前に捕まえられた
- 段階 2(DB 適用)で発覚したバグは、段階 3(main デプロイ)に進む前に修正する余裕がある
- テスト行のクリーンアップは対象テナントに限定した確認 SQL を用意する

### Codex レビューの位置づけ
- Codex 静的レビュー: 型/論理的な問題(NULL チェック漏れなど)を捕捉できる
- 静的レビューでは捕捉できない SQL 実行時欠陥(RETURNS TABLE の暗黙変数衝突など)がある
- Codex の「セカンドオピニオン」パターン: Claude が案 A / B / C を提案しても、Codex が案 D を提案することがある(今回は `ON CONFLICT ON CONSTRAINT`)

## 8. 設計判断の要点整理(事実ベース記録)

### なぜ SECURITY DEFINER RPC が唯一解だったか
Phase 0b では `auth.current_workos_user_id()` 未実装のため RLS write policy(0002)が本番適用できない。anon 接続の Supabase server client からは INSERT/UPDATE 権限が付与されていない。認可なし更新経路を作らずに書き込みを行うには、認可判定と UPSERT を DB 内で原子的に完結させる SECURITY DEFINER 関数が唯一の技術的選択肢となった。

### なぜ DB 側でも許容値検証を行うか
関数は anon に EXECUTE を許可するため、Next.js アプリ層のバリデーションをバイパスして任意の値を投げられる経路が存在する。`template_type` は公開 HP の描画分岐(HTML 骨格の選択)に直結し、不正値でレンダリング破綻の可能性があるため、関数単体で列挙値制約を強制する。

### なぜ mood と非対称にしたか
mood は CSS 変数トークンの差替のみで公開 HP の骨格には影響しない。不正値でもフォールバックで安全に処理できるため、Zod 管理のみで DB 検証は行わない。テンプレ追加は migration 必須、mood 追加は Zod 更新のみで migration 不要という非対称は、「不正値が本番 HP のレンダリングを壊すかどうか」の影響度の差に基づく。

### なぜ ON CONFLICT ON CONSTRAINT を選んだか
`RETURNS TABLE(tenant_id uuid)` の暗黙出力変数が列名 `tenant_id` と衝突した。3 案を検討し、(A) 出力列名リネームは API に Postgres 規約が漏れる、(B) RETURNS uuid スカラーは 0004/0005 と helper の判定方式が乖離、(C) `#variable_conflict use_column` は関数全体の解決規則を変え将来の逆向きバグ懸念。`ON CONFLICT ON CONSTRAINT` は衝突箇所だけを局所的に消す最小介入で、副作用が最も小さい。

### なぜ 0006 のみ CREATE OR REPLACE FUNCTION か
本番に broken 版が既に適用済みで、同一シグネチャのまま原子的に置換する必要があった。0003 / 0004 / 0005 は通常の `CREATE FUNCTION` のまま。0007 以降の新規関数を `CREATE FUNCTION` に戻すかは別途判断(初回適用時の意図せぬ上書き防止という原則は維持したい)。

### なぜ確認 SQL を対象テナントに限定したか
テーブル全体の件数チェックは、将来テナントが増えた際に他テナントの行と混同する。「今は 1 テナントしかいないから全体 count で OK」は将来にわたる保守の観点で避ける(Codex 指摘)。

## 9. 次回同じ機能を作るなら何を変えるか

- plpgsql の書き込み関数を新規作成する時は、`RETURNS TABLE` の出力列名とテーブル列名の衝突を必ずチェックする(同名なら `ON CONFLICT ON CONSTRAINT` を使うか、出力列名を変える)
- 書き込み系 RPC の許容値検証は、`IS NULL OR ...` を必ず先頭に書く(三値論理の罠を回避)
- DB 変更を伴う PR では、実行後確認 SQL の 4a のような UPSERT 実行テストを必ず用意し、本番適用時に実行する
- 本番適用計画書に「broken 版が入った場合の置換手順」テンプレートを予め用意しておく(今回の pr8-plan は事後追加)
- Client Component の TEMPLATES(TS union)と DB 関数の許容値リストは手動同期で乖離しうる。共有定数か Zod に一元化する(PR9 以降)
- 確認 SQL は最初から対象テナントに限定する形で書く(テーブル全体 count は避ける)

## 実測エビデンス

- Codex 静的レビュー: NULL チェック漏れを検出 → commit 前に修正(三値論理の落とし穴)
- 静的レビュー 2 回通過(Claude + Codex): 42702 の暗黙変数衝突は捕捉できず
- 本番実行後確認テスト 4a: `42702: column reference "tenant_id" is ambiguous` エラーで UPSERT が失敗
- 本番 DB 状態: 失敗した書き込みはロールバック済み、tenant_site_settings は 0 行のまま維持(テーブル無傷)
- 修正版適用後の再テスト: 4a〜4e 全通過、42702 が出ないことを確認
- クリーンアップ後 `enu_rows = 0` を確認、UI 実測で初回 INSERT 経路の動作を確認

# 002 認可済み管理画面 DB 読み取りパターンとログイン後リダイレクト（v0.13.0 / v0.14.0）

## 1. 何を作ったか

### v0.13.0（PR7）— 認可済み tenant の DB 読み取りパターン
- `docs/db/migrations/0005_owner_site_settings_lookup_function.sql` — SECURITY DEFINER 関数 `public.get_owner_tenant_site_settings_for_workos_user(text, text) RETURNS TABLE(tenant_id uuid, template_type text)`
- `src/lib/tenant/site-settings.ts` — server-only helper `getOwnerTenantSiteSettings(tenantSlug)`
- `src/app/admin/[tenantSlug]/page.tsx` の拡張 — サイト設定表示・共通セクション 12 種の静的一覧
- `docs/db/pr7-production-db-application-plan.md` — 本番 DB 適用計画（DB 適用は main デプロイ前・UI 実測は main デプロイ後の 5 段階手順）

### v0.14.0（fix/post-login-admin-redirect）— ログイン後リダイレクト
- `src/lib/tenant/current-tenant.ts` — server-only helper `getOwnedTenantSlugForCurrentUser()`（0004 RPC 再利用・新規 migration なし）
- `src/app/page.tsx` の async 化 — 認証済みなら `/admin/{slug}` へ redirect、未所属時は入口 UI に error 表示
- `src/proxy.ts` の matcher に `/` を追加、`unauthenticatedPaths: ['/']` 設定

## 2. なぜその設計にしたか

### tenant DB 読み取り（v0.13.0）
- 公開ページ用の anon RLS（`tenant_site_settings_public_read`）に管理画面の認可を暗黙結合させない。0003 / 0004 で確立した「workos_user_id 起点の SECURITY DEFINER RPC」パターンを踏襲
- `tenant_site_settings` は LEFT JOIN + ON 句に条件配置。「所属不整合 = 0 行」と「未設定 = 1 行 template_type NULL」を DB レベルで区別する必要があるため
- URL slug 起点で tenants を検索しない。起点は必ず認証済み workos_user_id 側であり slug は結果照合のみ（他テナント列挙経路を作らない）

### 責務分離（既存 helper との使い分け）
- `access.ts` = URL slug 検証（引数 slug 必須・返り値 tenant_id）
- `resolve.ts` = tenant_id のみ取得（引数なし・返り値 tenant_id）
- `site-settings.ts` = tenant + site_settings 読み取り（引数 slug・返り値 tenant_id + template_type）
- `current-tenant.ts` = slug 単体取得（引数なし・返り値 slug）
- 4 つは workos_user_id 起点で共通・返す情報の粒度で分離

### ログイン後リダイレクト（v0.14.0）
- 案 A（callback で動的 redirect）は SDK の `handleAuth()` が `returnPathname` を静的文字列しか受け付けないため自然にできない。案 B（`/` で認証済み分岐）を採用
- 案 E-1 として、`TenantNotFoundError` は `/sign-in?error=...` へ redirect せず入口 UI で error 表示。認証済みユーザーが sign-in へ戻され続けるループを防ぐ
- Next.js の `redirect()` は内部で `NEXT_REDIRECT` 例外を throw するため、try/catch の中で呼ぶと誤 catch されるリスクがある。`redirect()` は必ず try/catch の外に配置

## 3. 他にどんな選択肢があったか

### tenant DB 読み取り（v0.13.0）
- (a) `tenant_site_settings` を anon で直接 SELECT（既存 `tenant_site_settings_public_read` に相乗り）
- (b) 新 SECURITY DEFINER 関数（0005）を作る（採用）
- (c) `tenant_site_settings` を INNER JOIN・「未設定」を別クエリで判定

### ログイン後リダイレクト（v0.14.0）
- 案 A: callback route 内で動的 redirect
- 案 A-i: callback → `/post-login` 中間 route → 動的 redirect
- 案 B: `/` で認証済み分岐（採用）
- エラー着地の代替: `/sign-in?error=no_tenant` / `/auth/error?code=...`（新規 route 必要）

### proxy matcher（v0.14.0）
- (i) matcher に `/` を追加、`unauthenticatedPaths: ['/']` で公開性維持（採用）
- (ii) matcher を `'/:path*'` に広げる（全パス巻き込み）
- (iii) 案 A-i にして `/` を静的に戻す

## 4. なぜ却下したか

### tenant DB 読み取り（v0.13.0）
- (a) 却下: 認可の正しさが公開ページ用 RLS の設定に依存する。将来 public read policy を絞ると認可が壊れる
- (c) 却下: 「未設定 = 正常系」を DB レベルで表現できず、UI 側で「認可失敗」と混同する

### ログイン後リダイレクト（v0.14.0）
- 案 A（callback 動的 redirect）却下: `handleAuth()` が `returnPathname` を静的しか受け付けない。`onSuccess` は副作用フックで redirect 変更不可
- 案 A-i 却下: 変更ファイル数が多く、案 B 採用時に同時解決できる「認証済み `/` 直打ちの挙動」が未解決のまま残る
- `/sign-in?error=no_tenant` 却下: 認証済みユーザーが sign-in に戻され続けるループの危険。UI 側で error 表示するなら redirect が発生しない案 E-1 のほうが安全

### proxy matcher（v0.14.0）
- (ii) 却下: `/[slug]/recruit` `/sign-in` `/callback` `/robots.txt` などすべてが middleware 対象に入り、既存の公開ページ挙動を壊す

## 5. 学んだこと（技術的な理解・原則・パターン）

### DB / 認可
- SECURITY DEFINER 関数は「public.RPC を関数所有者権限（RLS バイパス可）で実行する」仕組み。tenant_users のような anon read policy を持たないテーブルへの認可専用アクセスに使う
- LEFT JOIN の右側テーブルへの条件は必ず ON 句に置く。WHERE 句に置くと LEFT JOIN が実質 INNER JOIN 化する（PostgreSQL 標準仕様）
- Supabase の SECURITY DEFINER 関数は `anon` ロールへ EXECUTE 付与しないとアプリから呼べない（Supabase server client は anon キーで接続するため）。`REVOKE ... FROM PUBLIC / authenticated` + `GRANT ... TO anon` の 3 点セットが基本

### WorkOS AuthKit
- `withAuth()` は SDK 内部で `x-workos-middleware` ヘッダの有無を判定する。middleware（proxy）が対象パスで動いていない場合 `Error: You are calling 'withAuth' on ... that isn't covered by the AuthKit middleware.` を throw する仕様（未処理なら 500 として表出する）
- したがって `withAuth()` を呼ぶルートは必ず proxy の matcher に含める必要がある
- 公開ページとして未認証アクセスも許すには matcher に入れた上で `unauthenticatedPaths` にも含める（両立可能な公式サポート機能）
- matcher に `/` を追加すると副次的に token 自動 refresh も `/` で走るようになる
- `authkitMiddleware` は deprecated（SDK v4.2.0 時点）。`authkitProxy` を使う

### Next.js redirect / matcher
- `redirect()` は内部で `NEXT_REDIRECT` 例外を throw する。try/catch の中で呼ぶと catch 節で誤 catch される。`throw err` で再 throw していれば動作するが fragile。`redirect()` は try/catch の外に置くのが安全
- 業務例外（`TenantNotFoundError` 等）のみを `instanceof` で catch し、`NEXT_REDIRECT` や generic Error は素通しさせるパターンが安全
- Next.js の matcher は path-to-regexp 互換。`'/'` は root 単体のみにマッチ（`/anything` にはマッチしない）
- `'/:path*'` は全パスマッチ（意図しない巻き込み）
- 複数 matcher は配列で並置: `['/', '/admin/:path*']`

## 6. 詰まった点と解決方法

### 問題 1: LEFT JOIN の ON 句と WHERE 句を最初混同していた
- 症状: 「所属不整合」と「site_settings 未作成」の区別が実装意図と一致するかレビュー時に懸念
- 原因: LEFT JOIN の右側テーブルへの条件を WHERE 句に置くと INNER JOIN 相当になる、という PostgreSQL 挙動の理解が浅かった
- 解決: 0005 migration のヘッダに ON 句採用の理由と WHERE 句に置いた場合の事故シナリオ（LEFT JOIN の INNER JOIN 化）を明記。将来 `tenant_site_settings.deleted_at` が追加された場合の対応方針（ON 句に配置）もコメントに残した

### 問題 2: `withAuth()` が matcher 外で SDK 例外を throw する
- 症状: `/` を async Server Component 化して `getCurrentWorkosUser()`（= `withAuth()`）を呼んだところ、ローカル dev で `You are calling 'withAuth' on ... that isn't covered by the AuthKit middleware` の SDK 例外が throw され、未処理のまま 500 として表出した
- 原因: WorkOS AuthKit SDK は `withAuth()` 内部で `x-workos-middleware` ヘッダの有無を判定しており、matcher 外のパスでは middleware がヘッダを注入していないため throw する
- 発見契機: dryRun 承認後、実装完了・数値保証・build 成功まで通過してから、実測（`npm run dev` + curl）で初めて発覚。「lint / type-check / build が全て通っても、middleware ヘッダ依存の SDK ランタイム挙動は捕捉できない」
- 解決: `proxy.ts` の matcher に `/` を追加、`unauthenticatedPaths: ['/']` を設定。matcher に含めることで middleware が `/` でも動作しヘッダが注入される。`unauthenticatedPaths` により未認証でも入口 UI を表示できる
- 教訓: `withAuth()` を呼ぶ場所は必ず matcher に含める。ビルド時チェックでは捕捉できないランタイム制約は SDK ソース（`node_modules/@workos-inc/authkit-nextjs/dist/esm/session.js`）を直接読んで挙動を確認する

### 問題 3: ローカル環境で本番のログイン照合ができなかった
- 症状: 実測で `/admin/enu` が 307 で WorkOS sign-in へ redirect することは確認できたが、認証済みの状態で `/` → `/admin/enu` の redirect が起きるかはローカルで確認できなかった
- 原因: ローカルと本番で WorkOS 環境が異なっており、本番用のユーザーではローカルへログインできなかった
- 解決: ローカルでは curl による認証境界（未認証時の proxy 動作）のみ確認し、認証済みユーザー動線は本番デプロイ後に実測。本番デプロイ後、実際に `/` → `/admin/{slug}` の自動遷移を確認
- 教訓: ローカル環境と本番環境で外部認証 provider の環境が分かれているケースは、実測項目を「ローカルで検証可能」と「本番デプロイ後に実測」に分けて計画に明記する

## 7. 運用知識（仕様・制約・ツールの挙動など）

### PostgreSQL
- LEFT JOIN の右側テーブルへの条件は ON 句に置く。WHERE 句に置くと LEFT JOIN が実質 INNER JOIN 化する
- `pg_get_function_arguments(oid)` と `pg_get_function_result(oid)` で SECURITY DEFINER 関数のシグネチャを確認できる（今回の 0005 前提確認で使用したのは `pg_get_function_arguments` の通常版。`pg_get_function_identity_arguments` は「関数を一意に特定する引数リスト」を返す簡易版であり、パラメータ名や DEFAULT 情報を落とすため、シグネチャ全体を目視確認したい場合は通常版のほうが情報量が多い）

### WorkOS AuthKit（`@workos-inc/authkit-nextjs`）
- `withAuth()` は `x-workos-middleware` ヘッダの有無を SDK 内部で判定し、無ければ throw する
- proxy の matcher 外で `withAuth()` を呼ぶと SDK が例外を throw し、未処理なら 500 として表出する
- `authkitProxy` の `unauthenticatedPaths` は path-to-regexp 互換の path glob 配列
- `handleAuth()` の `returnPathname` は静的文字列のみ。動的 redirect には別経路が必要（`/post-login` 中間 route か、リダイレクト先ページ側での分岐）

### Next.js 16
- middleware/proxy の matcher は path-to-regexp 互換
- `'/'` は root 単体のみマッチ・`/anything` はマッチしない
- `'/:path*'` は全パスマッチ（巻き込み過ぎ）
- `redirect()` は `NEXT_REDIRECT` 例外を throw する。try/catch の外で呼ぶのが安全

### Supabase RPC
- Server client は anon キーで接続するため、SECURITY DEFINER 関数の EXECUTE 権限は anon に付与する
- `LIMIT 1` で 1 行想定の関数は、複数所属が発生すると返却行が不定になる。この検証は 0003 の実行後確認[確認4]（`GROUP BY workos_user_id HAVING COUNT(DISTINCT tenant_id) > 1`）に集約し、0005 では重複クエリを書かない方針とした（同じ tenant_users を参照しているため 0003 側の検出で十分）

## 8. 設計判断の要点整理（背景説明用の事実ベース記録）

### なぜ SECURITY DEFINER 関数を使うか
tenant_users テーブルは anon / authenticated 向けの RLS read policy を持たない設計。認可専用の read 経路として SECURITY DEFINER 関数を作り、関数所有者の権限で tenant_users を直接スキャンする。これにより「認可 = tenant_users 参照」と「公開ページ = tenants anon read」を独立させ、片方のポリシー変更が他方を壊さない構造にする。

### なぜ LEFT JOIN が必要か
「所属不整合（認可失敗）」と「site_settings 未作成（正常系）」を DB レベルで区別するため。INNER JOIN では両方が 0 行になり区別不可、LEFT JOIN + ON 句配置で「所属不整合 → 0 行」「未設定 → 1 行 NULL」に分離できる。

### なぜ matcher に `/` を追加したか
WorkOS AuthKit の `withAuth()` は proxy が対象パスで動いていないと SDK が例外を throw する仕様のため。ルート `/` で認証済み判定を行うには matcher 対象である必要がある。公開性は `unauthenticatedPaths: ['/']` で維持する（SDK 公式サポートの組み合わせ）。

### なぜ `redirect()` を try/catch の外に置くか
Next.js の `redirect()` は内部で `NEXT_REDIRECT` 例外を throw する。try 内に置くと catch 節で誤 catch されるリスクがある（`throw err` で再 throw していれば動作するが fragile）。try 外に置くことで意図を明確にし、`NEXT_REDIRECT` の誤 catch 経路を作らない。

## 9. 次回同じ機能を作るなら何を変えるか

- `withAuth()` を新しいパスで呼ぶ場合、事前に SDK ソース（session.js）で middleware ヘッダ依存を確認する。build 通過だけでは不十分
- ローカルと本番で認証環境が異なる可能性を最初にチェック。実測項目を「ローカルで検証可能」「本番でしか検証できない」に分けて計画に明記する
- SECURITY DEFINER 関数の migration ヘッダは 8 節構成（なぜ必要か / 既存関数との役割分担 / スキーマ選択 / EXECUTE 権限 / LIMIT 1 の暫定性 / role フィルタ見直し時期 / LEFT JOIN 理由 / deleted_at 未存在の件）を最初から用意する。0003 / 0004 / 0005 で確立したテンプレートを流用
- 本番 DB 適用計画書のタイミング区分（DB 適用は main デプロイ前 / UI 実測は main デプロイ後）を最初から明記する。以前の pr3-plan は両方を「main マージ前」と書いていて誤りだった

## 実測エビデンス

- 未認証で `/` → 200 入口 UI 表示、Location ヘッダなし
- 未認証で `/admin/enu` → 307 で `https://api.workos.com/user_management/authorize?...` へ redirect
- `/enu/recruit` → 200 継続、Location ヘッダなし
- 本番デプロイ後、認証済みで `/` → `/admin/{slug}` への自動遷移を確認

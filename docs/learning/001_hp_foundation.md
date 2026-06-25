# 001 HP基盤・Supabaseセットアップ・URL構造確定

## 1. 何を作ったか
- Supabaseプロジェクト作成（東京リージョン）
- Supabaseクライアント実装（client.ts / server.ts）
- `[tenantId]` → `[slug]` リネーム
- `tenants` テーブル作成・RLS・GRANT設定
- `is_recruit_enabled` による求人ページのON/OFF制御
- ADR-006（URL構造確定。最終的なURL構造は `/{slug}/` 形式。例：`/enu/recruit`）
- docs/learning/README.md（学習プロトコル）
- 本番デプロイ環境（Vercel × Supabase × ドメイン × 環境変数管理）の整備
- Supabaseクライアントの環境変数読み込みをFail-Fast化（hotfix）

## 2. なぜその設計にしたか
- URLは `/{slug}/` 形式を採用。`/s/` プレフィックスは可読性が低く不要と判断
- slugはテナントの識別子としてURLに使う。UUIDは可読性が低いため却下
- `is_recruit_enabled` はtenantsテーブルのbooleanで管理。Feature Flagツール（Unleash等）はv1では早すぎる
- Supabaseはクライアント（ブラウザ用）とサーバー（SSR用）を分離。Next.js 15のasync paramsに対応

## 3. 他にどんな選択肢があったか
- URL：`/s/{slug}/`（元の設計）、`{slug}.qrtt.jp`（サブドメイン型）
- テナント識別：UUID、メールドメイン
- Feature Flag：Unleash、LaunchDarkly、環境変数

## 4. なぜ却下したか
- `/s/` ：意味のない文字でURLが長くなる。enuオーナーへの説明が複雑になる
- サブドメイン型：v1ではDNS・証明書・テナント管理の複雑性が増えるため却下
- UUID：URLの可読性が低く、店舗オーナーや利用者にとって扱いづらいため却下
- Unleash等：現時点の管理対象が `is_recruit_enabled` 1個しかないため、Feature Flag基盤を導入する運用コストに見合わない

## 5. 学んだこと（技術的な理解・原則・パターン）
- SupabaseのRLSは2層構造（GRANT + RLSポリシー）。両方揃わないとアクセスできない
- マルチテナントSaaSでは「DBレイヤーでテナント分離を強制する」のが定石。アプリ層の認可だけに頼らない
- URLパラメータの命名は、DBの内部表現（UUID等）ではなく外向きの概念（slug）に合わせる
- `[tenantId]` のような命名は、UUIDを連想させるため誤解を生む。URLは `[slug]` が正しい
- 本番障害はコードだけでなく、インフラ設定（環境変数・デプロイ設定）も疑う必要がある

## 6. 詰まった点と解決方法（トラブルシューティング・エラー対応）
**問題1：Supabaseを東京リージョンで作らなかった**
- 原因：プロジェクト作成時にリージョン選択を見落とした
- 解決：プロジェクトを削除して東京リージョンで作り直した
- 教訓：Supabaseのリージョンは後から変更不可。作成時に必ず確認する

**問題2：RLSを設定してもデータが取れずアクセスエラーになった**
- 原因：RLSポリシーだけではアクセスできず、anonロールへの権限付与（GRANT）が不足していた
- 解決：`GRANT SELECT ON public.tenants TO anon;` を実行
- 教訓：Supabaseでは CREATE → TRIGGER → RLS有効化 → POLICY → GRANT まで揃って初めてアクセスできる

**問題3：404が解消されなかった**
- 原因：`[tenantId]` と `[slug]` の2フォルダが混在していた
- 解決：`rm -rf "src/app/[tenantId]"` で古いフォルダを削除
- 教訓：`git mv` 後は `ls` で必ず確認する

**問題4：本番環境（qrtt.jp/enu/recruit）で500エラー**
- 発見契機：Google Search Consoleのライブテストで遅延通知が来てクラッシュを検知
- 原因：Vercel側で環境変数（NEXT_PUBLIC_SUPABASE_URL / ANON_KEY）が実際には保存されておらず、`process.env.XXX!` のNon-null assertionでSupabaseクライアント生成時にクラッシュしていた
- 解決：
  1. Vercelで環境変数を確実にSaveし、Build Cacheを使わずクリーンRedeploy
  2. コード側でも `if (!url || !anonKey) throw new Error(...)` でFail-Fast化し、欠落時に分かりやすいエラーログが出るよう改修
  3. Git運用ルール遵守（main直pushせず、feature/susa/fix-supabase-env → develop → main の正規フロー）
- 教訓：
  - TypeScriptのNon-null assertion（`!`）は本番でundefinedになった時に分かりにくいクラッシュを起こす。環境変数読み込みは明示的な存在チェック + Fail-Fastが安全
  - Vercel環境変数は「保存したつもり」で実際には未保存になることがある。Save後にダッシュボードで反映を確認する習慣
  - 本番障害は緊急時こそGitフロー遵守。CLAUDE.mdに従ってhotfix適用ができた

## 7. 運用知識（仕様・制約・ツールの挙動など）
- Supabaseのリージョンは作成後に変更不可（作り直しが必要）
- Next.js 15では `params` がPromiseになった。`await params` で取り出す必要がある
- Next.js 16ではTurbopackがデフォルト有効。`--no-turbopack` オプションは存在しないバージョンがある
- Supabaseのテーブルはデフォルトで `anon` ロールにSELECT権限がない。RLSポリシーを作ってもGRANTが必要
- Supabase API Keyには新形式（publishable / secret）と旧形式（legacy anon / service_role）がある。今回の環境では `@supabase/ssr` と legacy anon の組み合わせで安定動作した
- Vercel は Free プランでも商用公開は可能だが、商用運用ではチーム機能・運用機能のため Pro（月$20）への移行を検討する
- Vercel環境変数はSave操作後に「No Environment Variables Added」状態になることがある。保存後にダッシュボードで再確認する
- Vercelのデプロイには Build Cache の影響がある。環境変数を変更した後はキャッシュなしのRedeployを実行する
- TypeScriptの `!`（Non-null assertion）は本番のundefinedクラッシュを隠す。環境変数読み込みでは使わない方が安全

## 8. 面接で説明するならどう話すか
**「なぜSupabaseを採用したか」**
Phase 0では開発速度を優先しSupabaseを採用した。認証・DB・RLSを統合的に利用できるため初期構築コストが低かった。将来的なDB基盤については、利用店舗数や運用要件を見ながら判断する。

**「なぜslugを採用したか」**
URLの可読性と運用上の分かりやすさのため。UUIDはURLに入ると意味不明になる。将来的にサブドメイン型（enu.qrtt.jp）や独自ドメインへ移行する際もslugベースなら対応しやすい。

**「なぜRLSを採用したか」**
マルチテナントSaaSで最も怖いのはテナント間のデータ漏洩。それをDBレイヤーで強制的に防ぐためにRLSを採用する方針とした。現時点では Supabase の RLS 適用手順とアクセス制御の土台を確認するため、`tenants` テーブルにRLSを適用している。本格的なマルチテナント分離は WorkOS 導入後に `tenant_id` ベースで実装する予定。

**「なぜpage_blocksを延期したか」**
実例が1件もない段階でブロック構造を設計すると、実際のサロンが必要としないブロックを大量に作るリスクがある。2〜3件の実サロンで共通項が見えてから設計する方が精度が高い。YAGNI原則。実サロンのデータが集まった段階で共通化ポイントを抽出し、その時点でpage_blocks化する方が変更コストが低いと判断した。

**「本番障害をどう調査・再発防止したか」**
Google Search Consoleのリダイレクトエラー通知を契機に本番500エラーを発見。Vercelのログから「Supabase URL and Key are required」を検知し、ローカルでは動いていたためVercel側の環境変数を疑った。設定画面で再Save・キャッシュなしRedeployで一次復旧。ただし「環境変数欠落時に分かりにくいクラッシュが起きる」というコード側の脆さも根本原因と判断し、`!`によるNon-null assertionを廃止して `if (!url) throw new Error(...)` のFail-Fastパターンに改修。緊急時もGitフロー（feature → develop → main）を遵守してhotfixを適用した。

## 9. 次回同じ機能を作るなら何を変えるか
- Supabaseセットアップは最初に「リージョン・GRANT・RLS」をチェックリスト化してから着手する
- URL設計（slug）はarchitecture.md確定→ADR作成→実装の順を厳守する。今回は実装が先行してADRが後追いになった
- `git mv` 等のリネーム作業後は必ず `ls` で重複フォルダの有無を確認する
- Next.jsのバージョン特有の挙動（params Promise化、Turbopackデフォルト化等）は事前にリリースノートを確認する
- 環境変数を扱うコードは最初からFail-Fastパターンで書く（`!`は使わない）
- 本番デプロイ後は必ずトップページだけでなく主要ルートを実際にブラウザで開いて動作確認する
- Vercel環境変数を追加した時は、ダッシュボードで反映状態を再確認してからデプロイする
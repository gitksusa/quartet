# Repository Map (Quartet)

**Status**: Active
**Owner**: k susa
**Last validated**: 2026-06-29

## このドキュメントについて

このファイルは、Quartet リポジトリの構造を **「どこが authority で、変更時に何を確認すべきか」** という観点で整理した運用リファレンスである。

### 運用ルール

1. **現存しないファイル・ディレクトリは記載しない**。将来追加予定のものは `docs/future-architecture.md` を参照する。
2. **Must は時間を超えて成立する原則**を書く。「現状にないものを必ず使え」のような記述はしない。
3. **Watch は現状認識・技術的負債・観察すべき変化**を書く。
4. **Authority は各ファイル/ディレクトリ自身**にあり、本ドキュメントはマップに過ぎない。本ドキュメントは規範を保持しない（SSOT原則）。
5. ADR・playbook・その他既存ドキュメントに記載済みの内容は **参照のみ** に留める。

### 関連ドキュメント

- 規範の単一の真実: `/CLAUDE.md`
- 設計判断の詳細: `.claude/playbooks/`
- 将来のアーキテクチャ予約: `docs/future-architecture.md`
- 設計判断履歴: `docs/adr/`

---

## 1. AI Collaboration

### 現存ファイル/ディレクトリ

- `CLAUDE.md`
- `AGENTS.md`
- `.cursor/rules/project.mdc`
- `.claude/playbooks/README.md`
- `.claude/playbooks/reservation-api.md`
- `.claude/playbooks/domain-boundary.md`
- `.claude/playbooks/external-integration.md`
- `.claude/skills/README.md`

### Authority

- `CLAUDE.md` (規範の単一の真実)
- `.claude/playbooks/` (各playbookが個別authority。設計判断の詳細)

### 責務

AIエージェント（Claude Code, Cursor 等）が、Quartetの規範・設計判断・運用手順を一貫した形で参照できる状態を維持する。`CLAUDE.md` の「AI設定の責務マトリクス」セクションに完全な定義がある。

### 編集・追加時のチェック項目

#### Must

- 規範を変更したら、まず `CLAUDE.md` を更新する（他のAI設定ファイルに直接書かない）。
- 新しいAIツールを追加する場合は、`AGENTS.md` を経由させず、新規ポインターファイルから `CLAUDE.md` を直接参照する（DAGの「ツール入口は横」原則）。
- 同一の規範・事実を複数箇所に保持しない（SSOT維持）。重複を見つけたら、authority を1箇所に集約し、他は参照のみとする。
- playbook を追加する時は、先頭メタ情報（Status / Criticality / Owner / Decision date / Review trigger）を必ず書く。

#### Watch

- `AGENTS.md` がポインター以外の規範を保持していないか（将来「ここにもルール書いちゃえ」を防ぐ）。
- `.claude/playbooks/` 同士の相互参照が発生していないか（同一レイヤー間の相互参照禁止）。
- `.claude/skills/` は現状 README のみで未着手。実体追加時は AGENTS Skill の慣習に合わせる。

---

## 2. Development Workflow

### 現存ファイル/ディレクトリ

- `.github/workflows/ci.yml`

### Authority

- `.github/workflows/ci.yml` (CI/CDパイプライン定義の単一の真実)

### 責務

`push` / `pull_request` をトリガーに、Lint・TypeCheck・Build の3段階を実行し、main/develop への破壊的変更を防ぐ。Build時に Supabase の環境変数を GitHub Secrets から注入する。

### 編集・追加時のチェック項目

#### Must

- secret を ワークフロー内で `echo` ・出力しない（ログ流出防止）。
- ワークフロー追加・変更時は、対象ブランチ（main/develop）の Branch Protection で必須チェックに含めることを忘れない。
- `actions/*` の major version は固定する（`@v4`等）。`@main` 等のフローティング参照は使わない（サプライチェーン攻撃対策）。

#### Watch

- 現状はテスト実行ステップが無い。Phase 2以降で Vitest / Playwright 等を追加する想定（`docs/future-architecture.md` 参照）。
- `npm ci` 実行時の依存解決時間が増えてきたら、`actions/cache` の見直し対象。
- secret の追加・変更は GitHub Repository Settings 側で行う。コードには平文で書かない。

---

## 3. Environment & Configuration

### 現存ファイル/ディレクトリ

- `package.json` / `package-lock.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `next.config.ts`
- `postcss.config.mjs`
- `.env.example` / `.env.local`
- `.gitignore`
- `next-env.d.ts` (Next.js自動生成)

### Authority

各設定ファイル自身が個別 authority を持つ:

- `package.json` (依存関係の単一の真実)
- `tsconfig.json` (TypeScript規約の単一の真実)
- `eslint.config.mjs` (静的解析規約の単一の真実。実体は Next.js公式の core-web-vitals + typescript 設定に委譲)
- `next.config.ts` (Next.js実行時設定の単一の真実)
- `.env.example` (環境変数のキー一覧の単一の真実。実値は `.env.local` で各環境が保持)
- `.gitignore` (バージョン管理除外ルールの単一の真実)

### 責務

開発・ビルド・実行時の挙動を決定する全ての設定を、それぞれ単一のファイルで管理する。

### 編集・追加時のチェック項目

#### Must

- `.env*` ファイル本体は Git に含めない（`.gitignore` で除外済み）。新しい環境変数を追加する時は `.env.example` にキーだけ追加し、値の例は書かない（CLAUDE.md セキュリティ制約参照）。
- 依存パッケージを追加する時は `package-lock.json` も同時にコミットする（再現性確保）。
- TypeScript の型エラーを `@ts-ignore` で抑制しない。やむを得ない場合は `@ts-expect-error` を使い理由をコメントする。
- `paths` alias (`@/*`) を使う。深い相対パス (`../../../`) は避ける。
- secret に当たる値（API key, service_role, DB URL with credentials 等）を環境変数以外の場所に書かない。

#### Watch

- 現状 `tsconfig.json` で `allowJs: true` が有効。Phase 2以降で TS only に絞るかは要判断。
- 現状 `tsconfig.json` で `skipLibCheck: true` が有効。CI実行時間とのトレードオフ。型起因の本番不具合が出始めたら見直し対象。
- 現状 `next.config.ts` は空。CSP・HSTS・X-Frame-Options 等のセキュリティヘッダー設定はまだ無い（`docs/future-architecture.md` 参照）。
- 現状 `eslint.config.mjs` に Quartet独自ルールはなし。Next.js公式設定で運用。
- Dependabot が依存更新PRを出した時は、changelog を確認してから merge する。

---

## 4. Application Routing

### 現存ファイル/ディレクトリ

- `src/app/page.tsx` (ルート)
- `src/app/layout.tsx` (ルートレイアウト)
- `src/app/globals.css`
- `src/app/favicon.ico`
- `src/app/[slug]/recruit/page.tsx` (テナント別求人ページ)

### Authority

- `src/app/` (Next.js App Router のルーティング規約に従う)

### 責務

URL → React コンポーネント のマッピングを管理する。`[slug]` 動的ルーティングでテナント（サロン）を識別する。

### 編集・追加時のチェック項目

#### Must

- App Router の規約に従う（`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` 等のファイル名）。
- 動的ルーティングのパラメータ（`[slug]` 等）は、必ずサーバー側で検証してからデータ取得に使う（直接 SQL に渡さない）。
- テナント識別子（slug 等）からデータを取得する際は、必ず該当テナントへのアクセス権を確認する。
- Server Component と Client Component の境界を明示する（`"use client"` を意識する）。

#### Watch

- Next.js 固有の運用ルールは `AGENTS.md` を authority とする（学習データとAPI差異等）。
- 現状 `[slug]/recruit/` のみで、認証必須ページや管理画面ルートは未追加。
- 現状 `middleware.ts` が存在しない。テナント境界は現状 Supabase RLS に依存。Phase 1以降の機能追加で middleware による境界の一元化を検討（`docs/future-architecture.md` 参照）。
- `loading.tsx` / `error.tsx` / `not-found.tsx` は現状未配置。UX改善時に追加検討。

---

## 5. UI Components

### 現存ファイル/ディレクトリ

- `src/components/recruit/blocks/` (求人ページ用の10ブロック)
- `src/components/recruit/shared/SectionHeading.tsx`
- `src/components/recruit/FaqAccordion.tsx`
- `src/components/recruit/FloatingNav.tsx`
- `src/components/recruit/RecruitHeader.tsx`
- `src/components/recruit/ScrollReveal.tsx`

### Authority

各コンポーネントファイルが個別 authority を持つ。共通スタイル規約は `src/app/globals.css` と Tailwind の utility class 体系。

### 責務

UI の見た目と振る舞いをカプセル化する。ビジネスロジックは持たず、表示と最小限のインタラクションに集中する。

### 編集・追加時のチェック項目

#### Must

- TypeScript の props 型を明示する（`any` 禁止）。
- ユーザー入力・外部データを `dangerouslySetInnerHTML` に渡さない。JSX のテキストノードを使う（React の自動エスケープを利用）。
- 認可判定をUIだけで行わない（サーバー側でも保証する）。ボタンの非表示はUXであり、セキュリティではない。
- import は path alias (`@/components/...`) を使う。
- Next.js の `Image` コンポーネントを使う（`<img>` を直接使わない。画像最適化のため）。

#### Watch

- 現状はサーバー状態管理ライブラリ（React Query / SWR 等）を使っていない。データ取得が複雑化したら導入検討。
- 現状はクライアント状態管理ライブラリ（Zustand / Jotai 等）を使っていない。グローバル状態が必要になったら導入検討。
- bundle size の増加に注意（重いライブラリは Server Component 側に閉じる）。
- hydration mismatch（SSRとCSRで描画結果が異なる）の発生に注意。
- アクセシビリティ（aria属性、コントラスト、キーボード操作）が後回しになりやすい。

---

## 6. Domain & Infrastructure

### 現存ファイル/ディレクトリ

- `src/lib/supabase/client.ts` (Browser用Supabaseクライアント)
- `src/lib/supabase/server.ts` (Server用Supabaseクライアント)

### Authority

- `src/lib/supabase/` (Supabase接続境界の唯一の実装場所)

### 責務

外部サービス（現状は Supabase）への接続を一元化する。各ページ・コンポーネントは直接 `@supabase/*` を import せず、必ずこのモジュール経由でクライアントを取得する。

### 編集・追加時のチェック項目

#### Must

- `service_role` キーをコードベースに書かない・参照しない（現状コードベース内に存在しないことを維持）。
- ブラウザに送信されるクライアントには `anon` キーのみ使う（現状の `client.ts` を維持）。
- 環境変数は必ず存在チェックしてから使う（現状の throw パターンを維持）。
- マルチテナント境界は Supabase RLS と組み合わせて二重に保証する（クエリ側でも `tenant_id` を絞る）。
- DBスキーマ規約（`tenant_id` / `deleted_at` / 部分一意インデックス等）は Authority: `CLAUDE.md` セクション6 を参照。

#### Watch

- 現状は Supabase だけだが、将来 Stripe / SendGrid / LINE 等の外部サービスが増える時、`src/lib/{service}/` のサブディレクトリで分離する設計（`docs/future-architecture.md` 参照）。
- 現状 `src/lib/auth/`, `src/lib/tenant/`, `src/lib/validation/` 等の専門ディレクトリは未存在。機能追加時に分離検討。
- Server Component 経由でのみ Supabase Server Client を使う（Client Component で server.ts を呼ばない）。
- Cookie ベースの認証なので、SSR ヘッダーの扱いに注意。

---

## 7. Static Assets

### 現存ファイル/ディレクトリ

- `public/images/recruit/` (求人ページ用の写真 15枚)
- `public/images/` (ルート直下 jpg 2枚)
- `public/` 直下の SVG (file.svg, globe.svg, next.svg, vercel.svg, window.svg)

### Authority

- `public/` (静的アセットの唯一の配置場所)

### 責務

ビルド時にバンドルされない、URLから直接アクセス可能な静的ファイルを配置する。

### 編集・追加時のチェック項目

#### Must

- 機密情報を含むファイルを `public/` に置かない（公開URL で誰でも取得できる）。
- 画像は Next.js の `Image` コンポーネントから参照する（`/images/...` パス）。
- 著作権・肖像権の確認が済んでいないファイルを置かない。
- ファイル名に個人名・実顧客名を含めない。

#### Watch

- 大きい画像ファイルの直置きはリポジトリサイズを膨張させる。サイズが大きくなってきたら CDN / S3 への移行検討。
- WebP / AVIF への変換を CI で自動化することで配信サイズ削減が可能。
- 写真の Exif データに位置情報等が残っていないか確認（プライバシー）。

---

## 8. Architecture Docs

### 現存ファイル/ディレクトリ

- `docs/adr/001_why_fly.md` ~ `006_url_structure_slug_prefix.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/tech_stack_timeline.md`
- `docs/api.md` (現状 0 B)
- `docs/database.md`
- `docs/infrastructure.md` (現状 0 B)

### Authority

- 各 ADR は **その意思決定の単一の真実**。番号は変えない。
- `docs/architecture.md` (システム全体構成の単一の真実)
- `docs/roadmap.md` (開発フェーズの単一の真実。CLAUDE.md ロードマップから委譲される詳細)
- `docs/tech_stack_timeline.md` (技術導入タイミングの単一の真実)
- `docs/database.md` (DBスキーマ詳細の単一の真実)

### 責務

「なぜそう設計したか」「いつどの技術を入れるか」「現状の構成は何か」を記録する。設計判断の履歴を改竄しない。

### 編集・追加時のチェック項目

#### Must

- ADR の決定内容を後から書き換えない。修正が必要な場合は新しい ADR を起こし、旧 ADR から「superseded by ADR-XXX」と参照する。
- ADR のステータス（Proposed / Accepted / Deprecated / Superseded）を明示する。
- 文書化されていない設計判断を実装してはいけない（CLAUDE.md 行動規範参照）。

#### Watch

- 現状 `docs/api.md` と `docs/infrastructure.md` は空。Phase 2 以降で実装が進んだ時、authority がどこに置かれるかを明確化する必要あり（`docs/future-architecture.md` 参照）。
- ADR が増えてきたら、`docs/adr/README.md` でインデックスを管理することを検討。
- `docs/architecture.md` と実装が乖離していないか定期的に見直す。

---

## 9. Operations Docs

### 現存ファイル/ディレクトリ

- `docs/incidents/README.md`
- `docs/incidents/INC-2026-06-001-supabase-env-missing.md`

### Authority

- 各インシデント記録は **その障害事例の単一の真実**。番号は連番で固定。

### 責務

本番・ステージング環境で発生した障害事例の記録、原因分析、再発防止策を保持する。

### 編集・追加時のチェック項目

#### Must

- インシデント番号 (INC-YYYY-MM-NNN) は連番で発番し、後から番号を入れ替えない。
- インシデント記録に個人情報・認証情報を含めない（マスクする）。
- 解決済みでも記録を削除しない（学習資産）。

#### Watch

- 現状 `runbooks/` および `release-notes/` ディレクトリは未存在。運用が本格化した時に追加検討（`docs/future-architecture.md` 参照）。
- インシデントが10件を超えたあたりで、原因カテゴリ別の傾向分析を行う価値がある。

---

## 10. Knowledge Base

### 現存ファイル/ディレクトリ

- `docs/learning/001_phase0_hp_foundation.md`
- `docs/issues/` (現状: 存在確認のみ。authority 判定は未実施)

### Authority

- 各 learning / issues ドキュメントが個別 authority を持つ。

### 責務

開発中に得た学び、未解決の検討事項、Zenn記事化候補等を保存する。設計判断（ADR）ではなく、知識・観察・問題提起を扱う。

### 編集・追加時のチェック項目

#### Must

- learning 記事は事実と推測を区別して書く（「観察された事実」と「推測される原因」を分ける）。
- Zenn / Qiita 公開前提のものはここから派生させる（CLAUDE.md の Zenn 戦略参照）。
- バックスラッシュ付きコードフェンスを書かない（Zenn/Qiitaで描画崩れの原因。CLAUDE.md 該当インシデント参照）。

#### Watch

- learning と issues の境界が曖昧になりやすい。`learning/` = 学んだこと、`issues/` = 未解決の検討事項、と分けると整理しやすい。
- 古くなった learning 記事をアーカイブする運用を Phase 2 以降で検討。

---

## 付録: このドキュメントのメンテナンス

- リポジトリ構造に大きな変更（新カテゴリ追加・既存カテゴリの責務変更）があった時に更新する。
- 個別ファイル追加だけでは更新不要（authority が変わらないため）。
- 更新時は `Last validated` の日付を更新する。
- `docs/future-architecture.md` で予約された項目が実体化したら、本ファイルに移管する。

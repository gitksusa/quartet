# Quartet

美容サロン・クリニック向けのマルチテナントWebサービス。テナントごとにHP・求人ページなどを提供する構成で開発している。

## 開発原則

- 主要な設計判断はADRとして `docs/adr/` に記録する。
- 障害対応や運用上の学びは記録として残す。
- 実装速度より正確性・保守性を優先する。
- 各フェーズで導入する技術とその理由は `docs/tech_stack_timeline.md` で管理する。

## プロジェクト状況

現在 Phase 0(基盤構築)の段階。

- 開発基盤(CI/CD・Branch Protection・Dependabot)を整備済み
- マルチテナント構成での求人ページ機能を実装済み
- サロンHP機能を実装中

## 本番稼働状況

現在、本番環境においてマルチテナント構成(`/[slug]/...`)による公開ページ配信を運用している。
顧客情報保護のため、個別テナントの名称・URL・利用状況等は公開していない。

## 技術スタック

- **Frontend**: Next.js(App Router) / TypeScript / Tailwind CSS
- **Backend / DB**: Supabase(PostgreSQL, Row Level Security)
- **Infra / CI/CD**: Vercel / GitHub Actions(Lint・TypeCheck・Build) / Dependabot

技術選定の方針、フェーズ別の導入計画、導入しない技術の判断基準は `docs/tech_stack_timeline.md` を参照。

## 最近のリリース

### v0.5.0
- GitHub Actions導入(Lint / TypeCheck / Build)
- Branch Protection設定
- Dependabot導入(alerts / security updates)
- `.env.example` 整備

### v0.4.0
- Supabaseクライアントの環境変数読み込みをFail-Fast化
- 本番障害(500エラー)の調査・対応

詳細な変更履歴は [GitHub Releases](https://github.com/gitksusa/quartet/releases) を参照。

## 運用メモ

過去の障害対応の記録は `docs/incidents/` を参照。

- [INC-2026-06-001 Supabase環境変数未設定による本番500エラー](docs/incidents/INC-2026-06-001-supabase-env-missing.md)

## ローカル開発

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

`.env.local` にSupabaseの値を設定してから起動する。

品質チェック:

\`\`\`bash
npm run lint
npm run type-check
npm run build
\`\`\`

PR作成時はGitHub Actionsで自動実行される。

## ドキュメント

- [`docs/architecture.md`](docs/architecture.md) — システム構成
- [`docs/roadmap.md`](docs/roadmap.md) — 開発フェーズ計画
- [`docs/tech_stack_timeline.md`](docs/tech_stack_timeline.md) — 技術導入方針
- [`docs/learning/`](docs/learning/) — 開発記録・振り返り
- [`docs/incidents/`](docs/incidents/) — 障害対応記録
- [`docs/adr/`](docs/adr/) — 設計判断の記録
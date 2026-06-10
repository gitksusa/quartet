# Quartet 技術スタック導入タイムライン

このドキュメントは、SRE志望のポートフォリオ戦略とビジネス価値（実装の進行）を両立させるための「技術スタック導入時期の一元管理表」である。
AIはここに記載された時期を無視した技術の先行投入・アーキテクチャの拡大提案をしてはならない。

---

## 1. 現在の技術スタック（Phase 0：すでに導入済み）
- Next.js / TypeScript
- Vercel（CDN・CI/CD・SSL・DDoS保護を兼ねる）
- Supabase（PostgreSQL）
- GitHub
- Vercel Analytics
- Tailwind CSS

---

## 2. Phase別 導入タイミング

### Phase 0 完了までに導入
- Sentry(エラー監視)
- GitHub Actions(Lint / Type Check の自動化)
- Vitest / Playwright(フロントエンド・E2Eテスト環境構築)

### Phase 1 着手時（問い合わせ・予約リクエスト受付）
- Supabase（書き込み処理の解禁）
- メール送信サービス（Resend等を予定）
- プライバシーポリシー / 特商法表記 / 利用規約（個人情報取得前に必須）

### Phase 2 着手時（予約基盤・Go本格投入）
- Go / Fly.io（バックエンドAPI中核）
- Docker / Docker Compose（ローカル開発用 PostgreSQL / Redis）
- Cloudflare（※Vercelの前段ではなく、Go API [Fly.io] の前段・DDoS対策として）
- AWS S3 + CloudFront（画像等メディア配信）
- golang-migrate（Goプロジェクトの標準DBマイグレーション）
- WorkOS AuthKit（B2B認証・管理画面ログイン用）
- Go標準テスト（`testing`）

### Phase 2以降、必要になった時点で導入
- Terraform（AWS/Fly.io構成管理が複雑化した時点）
- OpenTelemetry（分散トレーシングが必要になった時点）

### Phase 3 着手時（ネット予約）
- 枠ロック戦略（悲観的 / 楽観的 / アドバイザリーロック。実装前にADR必須）

### Phase 4 着手時（HPB連携）
- Gmail API（ポーリングによる予約取得）

### Phase 5 着手時（LINE連携）
- LINE Messaging API（Webhook）
- Circuit Breaker（gobreaker等。外部API障害の局所化。実装前にADR必須）

### Phase 2系 規模拡大時（10〜50店舗）
- AWS ECS Fargate（Goアプリのオートスケール）
- AWS RDS Multi-AZ（Supabaseからの移行）
- AWS SSM Session Manager（踏み台サーバー廃止）
- Prometheus + Grafana（本格的なメトリクス可視化）

---

## 3. 当面導入しない（やらない宣言）
AIは以下の技術について、明確な要件・運用上の必要性が発生するまで先行導入を提案しないこと。

- **Redis（本番用途）**：Phase 2〜3では導入しない。ローカル開発用途の利用は妨げない
- **GraphQL / gRPC**：フロントとバックエンドの通信は「RESTful API」で固定。スキーマ管理の学習コストを避ける
- **React状態管理（Redux / Jotai / Zustand等）**：複雑なフォームが登場する「Phase 3以降」まで保留。標準のHooks(`useState`等)で十分
- **架空のSLO / Runbook**：面接で逆効果になるため作成しない。実運用での障害発生時に実例ベースで作成する

---

## 4. 判断原則
技術スタックの導入は「学習したいから」ではなく「顧客価値または運用上必要になったから」を理由とする。

この原則に反する提案（学習目的の先行投入・アーキテクチャの早期肥大化）は、CLAUDE.md §0 のスコープ肥大禁止ルールに違反する。
# Future Architecture (Quartet)

**Status**: Active
**Owner**: k susa
**Last validated**: 2026-06-29

## このドキュメントの目的

このファイルは、Quartet において **「将来追加する予定があるが、現時点ではまだ存在しない要素」** の予約台帳である。

`docs/repository-map.md` が「現存する構造」を扱うのに対し、本ファイルは「**まだ存在しない構造の予約**」を扱う。両者は責務が完全に分離されており、現存しないものが repository-map に紛れ込むこと、および存在するものが future-architecture に残り続けることを防ぐ。

### 各項目の記述フォーマット

各予約項目は以下の5要素で記述する:

- **何を追加するか**: 具体的なファイル/ディレクトリ/機能名
- **なぜ今は存在しないか**: 現状で導入していない積極的な理由
- **追加トリガー**: 何が起きたら追加するか
- **依存**: この追加を進める前に必要な前提条件
- **Authority**: 追加後の authority となる場所

### 運用ルール

1. 予約項目が **実体化したら本ファイルから削除し、`docs/repository-map.md` に移管する**。
2. 予約項目を **削除する判断（永久に追加しないと決めた場合）** は、その判断理由を ADR に残してから削除する。
3. 本ファイルは「やる予定リスト」ではなく **「やらない判断の保管庫」** でもある。「なぜ今は存在しないか」を必ず記述する。

### 関連ドキュメント

- 現状のリポジトリ構造: `docs/repository-map.md`
- 開発フェーズ定義: `docs/roadmap.md` および `CLAUDE.md` セクション3
- 規範: `CLAUDE.md`
- 設計判断履歴: `docs/adr/`

---

## 1. Cross-cutting / 随時導入

特定のPhaseに紐付かず、「必要条件が揃った時」に追加されるもの。

### 1.1 `middleware.ts`

- **何を追加するか**: Next.js の middleware.ts によるリクエスト前段処理
- **なぜ今は存在しないか**: 現状の認可境界は Supabase RLS のみで十分。テナント識別もURLの slug ベースで完結している。middleware を導入する利益が、増える複雑性より小さい。
- **追加トリガー**: (a) 認証方式が複数化する、(b) テナント境界の前段制御（リダイレクト、ヘッダー追加等）が必要になる、(c) アクセスログ・レート制限を一元化したくなった時
- **依存**: 認証戦略の確定（Phase 1 で WorkOS AuthKit 統合後）
- **Authority**: `middleware.ts`（ルート直下に配置）

### 1.2 `src/types/`

- **何を追加するか**: プロジェクト全体で共通利用される型定義の専用ディレクトリ
- **なぜ今は存在しないか**: 現状は型定義が少なく、各コンポーネントの props で完結している。共通型を切り出す必要性がまだ無い。
- **追加トリガー**: 同じ型が3箇所以上で重複定義された時、または DB スキーマと連動する型（Supabase 生成型等）を扱い始める時
- **依存**: 特になし
- **Authority**: `src/types/`（各 .ts ファイルが個別 authority）

### 1.3 `loading.tsx` / `error.tsx` / `not-found.tsx`

- **何を追加するか**: Next.js App Router の特殊ファイルによる UX 改善
- **なぜ今は存在しないか**: 現状は静的HPに近く、データフェッチが少ないため Loading 表示の必要性が低い。エラーも Next.js デフォルトで十分。
- **追加トリガー**: (a) Suspense ベースのデータフェッチを始めた時、(b) ユーザー体験の品質基準を上げたい時、(c) 404を独自デザインで出したくなった時
- **依存**: 特になし
- **Authority**: 各ファイル自身

### 1.4 DOMPurify

- **何を追加するか**: ユーザー入力 HTML のサニタイズライブラリ
- **なぜ今は存在しないか**: 現状はJSXのみで HTML レンダリングを行っており、React が自動エスケープするため不要。ユーザー入力を `dangerouslySetInnerHTML` で描画する場面が無い。
- **追加トリガー**: リッチテキスト編集機能、HTML メール表示、Markdown レンダリング（user-generated content）等を導入する時
- **依存**: ユーザー入力 HTML を描画する機能の設計確定
- **Authority**: `package.json` の依存 + 使用箇所のコンポーネント

### 1.5 `docs/adr/README.md`

- **何を追加するか**: ADR のインデックスファイル
- **なぜ今は存在しないか**: 現状 ADR は6件で、ファイル名から内容が把握できる規模。インデックスのメンテナンスコストの方が大きい。
- **追加トリガー**: ADR が10件を超え、検索性が低下した時
- **依存**: 特になし
- **Authority**: `docs/adr/README.md`

### 1.6 セキュリティヘッダー設定

- **何を追加するか**: `next.config.ts` への `headers()` 設定追加（CSP / HSTS / X-Frame-Options / X-Content-Type-Options 等）
- **なぜ今は存在しないか**: 現状は静的HPに近く、ユーザー入力フォームも無いため攻撃面が小さい。Vercel のデフォルトヘッダーで最低限カバーされている。
- **追加トリガー**: Phase 1 でフォーム機能を追加する時、または公開前のセキュリティ監査時
- **依存**: 使用する外部リソース（CDN、画像、フォント等）のドメインリストの確定
- **Authority**: `next.config.ts`

---

## 2. Phase 1: フォーム受付・通知

### 2.1 Zod（または同等の runtime validation）

- **何を追加するか**: フォーム入力 / API リクエスト / 環境変数の runtime validation ライブラリ
- **なぜ今は存在しないか**: Phase 0 の HP には入力フォームが無いため、validation が不要。
- **追加トリガー**: 予約リクエストフォーム実装着手時
- **依存**: フォーム実装方針の確定（React Hook Form 等と組み合わせるか）
- **Authority**: 各 schema ファイル（`src/lib/validation/` 配下を想定）

### 2.2 `src/lib/validation/`

- **何を追加するか**: validation スキーマと型推論の集約ディレクトリ
- **なぜ今は存在しないか**: Zod 未導入のため受け皿が不要。
- **追加トリガー**: Zod 導入と同時
- **依存**: Zod 導入
- **Authority**: `src/lib/validation/` 配下の各スキーマファイル

### 2.3 `src/lib/auth/`

- **何を追加するか**: WorkOS AuthKit との接続・セッション管理のラッパー
- **なぜ今は存在しないか**: Phase 0 では認証が不要。求人ページ・HPは public access。
- **追加トリガー**: 顧客アカウントまたは管理画面実装着手時
- **依存**: WorkOS AuthKit のテナント設定確定
- **Authority**: `src/lib/auth/`

### 2.4 `src/lib/tenant/`

- **何を追加するか**: テナント識別・境界保証のヘルパー（slug → tenant_id 解決、認可チェック等）
- **なぜ今は存在しないか**: 現状は `[slug]/recruit/page.tsx` 内で個別実装。テナントごとの分岐ロジックがまだ単純。
- **追加トリガー**: 2画面以上でテナント境界を確認する必要が出た時、または認証と組み合わせる時
- **依存**: 認証戦略の確定（`src/lib/auth/` と並行）
- **Authority**: `src/lib/tenant/`

### 2.5 `reservation_requests` テーブル

- **何を追加するか**: フォーム受付段階の予約リクエスト保存テーブル（予約ドメイン本体ではない）
- **なぜ今は存在しないか**: Phase 0 では受付フォーム自体が存在しない。
- **追加トリガー**: Phase 1 のフォーム実装時
- **依存**: Supabase スキーマ設計確定
- **Authority**: Supabase（マイグレーションファイルは future Phase 2 で `backend-go/migrations/` に整備予定）

---

## 3. Phase 2: 予約基盤 / Go Backend

### 3.1 `backend-go/`

- **何を追加するか**: Go 製の予約 API バックエンド
- **なぜ今は存在しないか**: Phase 0–1 はフロントエンドのみで完結する範囲のため、Go の導入を急ぐ意味が無い。Phase 2 から予約基盤の中核として導入する。
- **追加トリガー**: Phase 2 開始時
- **依存**: 予約ドメインの設計確定（`.claude/playbooks/reservation-api.md` 参照）、`docs/api.md` の authority 確定
- **Authority**: `backend-go/` 配下（Go module として独立）

### 3.2 `docs/domain/`

- **何を追加するか**: 美容サロン SaaS としてのビジネスドメイン文書（customer / reservation / staff / service / schedule / record / tenant 等）
- **なぜ今は存在しないか**: Phase 0–1 の段階では予約ドメインの実装経験が薄く、机上で書いてもPhase 2 着手時にほぼ書き直しになる。ドメインモデルは実装経験と共に発見されるため、Phase 2 開始時に作る方が精度が高い。
- **追加トリガー**: Phase 2（予約基盤）開始時
- **依存**: 予約 API 実装の着手
- **Authority**: `docs/domain/` 配下の各ドキュメント

### 3.3 テスト基盤（Vitest）

- **何を追加するか**: フロントエンドのユニットテスト基盤
- **なぜ今は存在しないか**: Phase 0 の段階では UI コンポーネントの安定化が優先。テストを書くより手動確認の方が高速。
- **追加トリガー**: Phase 2 でビジネスロジックがフロント側にも入り始めた時、または同じバグが2回再発した時
- **依存**: 特になし
- **Authority**: `package.json` 依存 + `vitest.config.ts` + テストファイル群

### 3.4 `backend-go/migrations/`（golang-migrate）

- **何を追加するか**: DB マイグレーションファイル群
- **なぜ今は存在しないか**: 現状は Supabase Web UI 経由でスキーマ管理。Phase 2 で Go 経由の DDL 管理に移行する想定。
- **追加トリガー**: Phase 2 開始時、Go バックエンドの初日必須項目として
- **依存**: `backend-go/` の初期化
- **Authority**: `backend-go/migrations/` 配下の SQL ファイル群

### 3.5 統一エラーフォーマットの authority 確定

- **何を追加するか**: 統一エラーフォーマット定義の正式な配置場所
- **なぜ今は存在しないか**: 現状は `.claude/playbooks/reservation-api.md` 内に暫定保持。API 仕様 SoT がまだ確定していない。
- **追加トリガー**: `docs/api.md`（または OpenAPI YAML 等）に API 仕様 SoT を新設する時
- **依存**: API 仕様の Source of Truth 形式の決定（Markdown / OpenAPI / Protobuf 等）
- **Authority**: 未定（決定時に確定）

---

## 4. Phase 3: オンライン予約・インフラ強化

### 4.1 `infra/terraform/`

- **何を追加するか**: AWS / Cloudflare 等のインフラ IaC 定義
- **なぜ今は存在しないか**: Phase 0–2 は Vercel + Supabase + Fly.io の SaaS 構成で、IaC を書くより各サービスの GUI 設定の方が速い。Phase 3 で AWS ECS Fargate + RDS への移行が始まると、IaC なしでは管理不能になる。
- **追加トリガー**: Phase 3 開始時、もしくは「インフラ変更を3回連続で手作業した」時
- **依存**: Phase 3 のターゲット構成確定
- **Authority**: `infra/terraform/` 配下の各 .tf ファイル

### 4.2 Secrets Management の体系化

- **何を追加するか**: secret の保管・配布方法の統一（AWS Secrets Manager 等）
- **なぜ今は存在しないか**: 現状は Vercel / GitHub / Supabase 各々の secret 管理機能を使っており、本数が少ないため統合不要。
- **追加トリガー**: secret の管理対象が10件を超える、または複数環境（dev/staging/prod）の同期が必要になった時
- **依存**: Phase 3 のインフラ移行計画
- **Authority**: 未定（採用ツール決定時に確定）

---

## 5. Phase 4: カルテ・売上

### 5.1 ドメイン拡張（Record / Sales 等）

- **何を追加するか**: カルテ・売上ドメインのテーブル / API / UI
- **なぜ今は存在しないか**: CLAUDE.md セクション7（ドメイン境界）の絶対ルールにより、Phase 0–3 ではカルテ向けのコード・カラム・フックを1行も書かない。実装経験を経た後に Reservation との境界を保ちながら追加する。
- **追加トリガー**: Phase 4 開始時
- **依存**: Reservation ドメインの安定運用（最低 3 ヶ月）
- **Authority**: `backend-go/` 内の独立パッケージ、`docs/domain/record.md`

---

## 6. Phase 5 以降: 外部連携・運用

### 6.1 Circuit Breaker

- **何を追加するか**: 外部 API 呼び出し時の障害伝播遮断機構
- **なぜ今は存在しないか**: 予約コアには外部通信がないため不要。`.claude/playbooks/reservation-api.md` の rationale 参照。
- **追加トリガー**: Phase 5（LINE 連携）開始時、または HPB / Stripe 等の外部 API 統合時
- **依存**: 該当外部サービスとの統合設計
- **Authority**: `backend-go/` 内の middleware 層

### 6.2 `observability/` 設定

- **何を追加するか**: Prometheus / Grafana / OpenTelemetry 等の監視基盤設定
- **なぜ今は存在しないか**: 現状は Vercel / Supabase / Fly.io の標準メトリクスで十分。SLO / SLI を定義する段階に至っていない。
- **追加トリガー**: SLO 定義が必要になった時、または同時利用テナントが増えてキャパシティ計画が必要になった時
- **依存**: Phase 3 のインフラ移行完了
- **Authority**: `infra/observability/` または各サービスの設定ファイル

### 6.3 `docs/runbooks/`

- **何を追加するか**: 障害対応・定型運用作業の手順書
- **なぜ今は存在しないか**: 運用本格化前で、定型作業がまだ確立していない。場当たり的な対応の方が学習価値が高い段階。
- **追加トリガー**: 同じ運用作業を3回以上手作業で行った時、または共同運用者が増えた時
- **依存**: 特になし
- **Authority**: `docs/runbooks/` 配下の各 .md ファイル（または `.claude/skills/` への昇格候補）

### 6.4 `docs/release-notes/`

- **何を追加するか**: ユーザー向けのリリースノート
- **なぜ今は存在しないか**: 現状は GitHub Releases で十分。エンドユーザー（サロン経営者）向けの公式な変更告知が必要な段階に至っていない。
- **追加トリガー**: 正式リリース（Phase 3 完了想定）以降、もしくは破壊的変更を伴う UI 変更を実施する時
- **依存**: 正式リリースの定義確定
- **Authority**: `docs/release-notes/` 配下の各バージョンファイル

---

## 付録: このドキュメントのメンテナンス

- 予約項目が実体化した時、本ファイルから該当項目を削除し、`docs/repository-map.md` に移管する。
- 永久に追加しないと決めた項目は、決定理由を ADR に残してから削除する。
- 各 Phase が開始したタイミングで、該当 Phase セクションの内容を `docs/roadmap.md` および各 playbook と照合する。
- 更新時は `Last validated` の日付を更新する。

# Architecture

## サービス概要
Quartet（qrtt.jp）- 個人サロン・クリニック向け業務管理SaaS

ターゲット：ネイル・エステ・美容室・リラクゼーション・ヘッドスパ・アイラッシュ・クリニックなど個人経営者

## 技術スタック

### フェーズ1（0〜10サロン・クリニック）
| 役割 | 技術 | 理由 |
|------|------|------|
| フロント | Next.js × TypeScript | SEO・スマホ対応・業界標準 |
| バックエンド | Go × Fly.io | 高速・低コスト・API最適 |
| DB | Supabase（PostgreSQL） | 無料枠・RLS対応 |
| ストレージ | AWS S3 + CloudFront | 写真管理・CDN配信 |
| 認証 | WorkOS AuthKit | B2B・マルチテナント・MCP対応 |
| IaC | Terraform（dev/staging/prod分離） | 冪等性・再現性の担保 |
| CI/CD | GitHub Actions | 自動テスト・自動デプロイ |
| CDN/WAF | Cloudflare | DDoS対策・転送量節約 |
| 監視 | Sentry + OpenTelemetry | エラー検知・可観測性標準化 |
| 決済 | Stripe | サブスク課金・Idempotency Keys |

### フェーズ2（10〜50サロン・クリニック）
| 役割 | 技術 | 理由 |
|------|------|------|
| バックエンド | AWS ECS Fargate | オートスケール・高可用性 |
| DB | AWS RDS PostgreSQL（Multi-AZ） | 自動フェイルオーバー |
| セキュリティ | SSM Session Manager | 踏み台廃止・操作ログ記録 |
| 監視 | Prometheus + Grafana | メトリクス可視化 |

## URL構成

### 公開ページ（顧客・求職者向け）
```
qrtt.jp/s/{salon_slug}/          # サロン・クリニックHP
qrtt.jp/s/{salon_slug}/recruit   # 求人ページ（ON/OFF切替可）
qrtt.jp/s/{salon_slug}/reserve   # 予約ページ
```
※将来的に{salon_slug}.qrtt.jpのサブドメイン型、
または独自ドメイン（Cloudflare for SaaS活用）への移行を検討。

### 管理画面（オーナー・スタッフ向け）
```
qrtt.jp/dashboard                # ダッシュボード
qrtt.jp/dashboard/karte          # 電子カルテ
qrtt.jp/dashboard/customers      # 顧客管理
qrtt.jp/dashboard/reservations   # 予約管理
qrtt.jp/dashboard/staff          # スタッフ管理
qrtt.jp/dashboard/attendance     # 勤怠管理
qrtt.jp/dashboard/sales          # 売上管理
qrtt.jp/dashboard/settings       # 設定
```

### API
```
qrtt.jp/api/v1/                  # バージョニング必須
```

## ドメイン構成（モノリス内のドメイン分割）
| ドメイン | 説明 |
|---------|------|
| Tenant | サロン・クリニック（契約者） |
| Customer | 顧客・患者 |
| Staff | スタッフ・施術者・医療従事者 |
| Menu | 施術・診療メニュー |
| Reservation | 予約・アポイントメント |
| Consultation | 問診・カウンセリング（v2） |
| Record | カルテ・診療記録 |
| Attendance | 勤怠管理 |
| Sales | 売上管理 |

※マイクロサービスではなくモノリス内のドメイン分割。
将来必要なドメインだけを切り出せる設計にしておく。

## マルチテナント設計方針

### User ↔ Tenant の関係（重要）
1人のユーザーが複数テナントを管理するケースに対応するため、
Users・TenantUsers（中間テーブル）・Tenantsの多対多構造を採用する。

```
Users ──< TenantUsers >── Tenants
```

- WorkOS JWTにはtenant_idを含める
- 管理画面URLにsalon_slugは不要（JWTから自動でテナントを特定）
- ダッシュボードのヘッダーにテナントスイッチャーUIを将来的に配置できる設計にする
- RLSでテナント間のデータを完全分離する
- 全APIリクエストでtenant_idを検証する
- plan（free_forever・trial・basic・pro）をTenantsテーブルで管理する

## Go API実装方針

### v1から必須
- Repository Pattern（DBアクセスの抽象化・テスタブルな設計に必須）
- Dependency Injection（モックを使った単体テストのしやすさを担保）
- DTO（API層とDB層の分離）
- エラーハンドリング統一（Goのエラー型を定義して統一管理）
- Graceful Shutdown（デプロイ時のリクエスト損失ゼロ）
- Rate Limiting（不正アクセス防止）
- Idempotency Keys（決済・予約の二重処理防止）
- Soft Delete（全テーブルにdeleted_at）
- Audit Log（全操作の記録・個人情報保護法対応）
- golang-migrate（DBマイグレーション管理）
- 構造化JSONログ（全ログをJSON形式で出力）
- /healthzエンドポイント（死活監視用）
- SOLID原則の適用
- Circuit Breaker（外部API障害の局所化）

### v2以降で追加
- CQRS（読み書きの責務分離）
  ※v1では読み書きの分離によるコードの複雑化を避ける
  ※トラフィック増加後に導入する

## Feature Flags方針
v1（テナント10件未満）ではTenantsテーブルに
is_recruit_enabled等のbooleanカラムで制御する。
サードパーティのFeature Flagツールは導入しない。
（理由：ADR-005に記録）

v2以降でUnleashの導入を検討する。

## DB設計方針
- 全テーブルにid（UUID）・created_at・updated_at・deleted_at・tenant_id必須
- NULL制約・型制約を必ず設定する
- インデックス設計はクエリ設計と同時に行う
- RLSでテナント間のデータを完全分離する
- マイグレーションはgolang-migrateで管理する
- Soft Delete × RLSのユニーク制約ルールを明確に定義する
  （例：deleted_atがNULLの場合のみユニーク制約を適用）
- 詳細はdocs/database.mdを参照

## HPB連携方針
Gmail APIを使いHPBの予約通知メールを自動取得する。

### v1：ポーリング方式
```
HPB通知メール → Gmail
↓
GoのAPIがGmail APIでポーリング（定期取得）
↓
メール本文を解析
↓
Reservationsテーブルに書き込み（UPSERT）
```

### v1.5：Pub/Sub方式に移行
移行トリガー：テナント数10店舗超 or Sentryで429エラー検知
（理由・詳細はdocs/adr/004_hpb_integration_strategy.mdを参照）

## セキュリティ方針
- 全通信HTTPS必須
- WorkOS AuthKitでJWT認証
- RLSでマルチテナントのDBアクセス制御
- Cloudflare WAFで不正アクセス遮断
- Rate Limitingで不正ログイン試行をブロック
- CORS・CSRF・XSS・SQLインジェクション対策を必ず実装
- セキュリティヘッダーを全レスポンスに付与
- シークレットのローテーションを定期実施
- Dependabotで依存ライブラリの脆弱性を自動検知
- SSM Session Managerで踏み台廃止（フェーズ2）
- 全操作をAudit Logに記録
- OWASPチェックリストで節目ごとに確認

## 負荷分散方針
- Cloudflareを前段に配置しトラフィックを分散
- 重い処理はGoのAPIに寄せてNext.jsのタイムアウト（60秒）を回避
- Circuit BreakerでLINE・HPB等の外部API障害を局所化
- フェーズ2でECS Fargateのオートスケールを設定

## デプロイ・インフラ方針
- developマージ → stagingに自動デプロイ
- mainマージ → prodに自動デプロイ
- 全デプロイはGitHub Actions経由のみ（直接pushは禁止）
- Graceful Shutdownでデプロイ時のリクエスト損失をゼロにする
- Terraformでdev/staging/prod環境を完全分離
- AWS Cost Anomaly Detectionでコスト異常を自動検知
- RDSスナップショットで定期バックアップ（フェーズ2）
- バックアップからの復元テストを定期実施する
- 全リソースにタグを付与してコスト管理
- 環境変数は.env.exampleで管理し機密情報をリポジトリに含めない

## ドキュメント管理ルール
- PRには必ずdocs/の修正を含める
- コードと設計書を常に一致させる
- 設計変更はADRに記録してから実装する

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けメッセージ",
    "detail": "内部詳細（本番では非表示）"
  }
}
```

## テスト方針
- 「動いた」ではなく「テストが通った」を基準にする
- 単体テスト：Goのtestingパッケージで全関数をテスト
- 統合テスト：APIエンドポイントの動作を検証
- E2Eテスト：主要なユーザーフローを自動テスト
- PRで自動テストが全てグリーンになるまでマージ禁止
- テストコードは実装と同時に書く

## 観測可能性（Observability）方針
- OpenTelemetryで統一規格のログ・メトリクス・トレーシングを収集
- ベンダーロックインを避けた可観測性基盤を構築
- Sentryでエラーを自動検知・Slack通知
- フェーズ2でPrometheus + Grafanaを追加

## 法律・コンプライアンス方針
- プライバシーポリシーを作成・公開する
- 利用規約を作成・公開する
- 特定商取引法に基づく表記を行う
- 資金決済法への準拠を確認する（回数券機能実装前に必須）
- 個人情報保護法への準拠を担保する
- Audit Logで全操作を記録し法的要件に対応する

## 運用・障害対応方針
- SLO：月間稼働率99.9%を目標とする
- Runbookを整備し障害時の対応手順を明文化する
- Sentryでエラーを自動検知・通知する
- 障害時の連絡フローをサロン・クリニックに事前に伝える
- バックアップからの復元テストを定期実施する
- サポート窓口を用意する

## 環境構成
| 環境 | 用途 | ブランチ |
|------|------|---------|
| dev | ローカル開発 | feature/* |
| staging | 本番前の動作確認 | develop |
| prod | 本番環境 | main |
```

---

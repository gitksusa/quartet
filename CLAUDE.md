# CLAUDE.md — Quartet 開発ルール

このファイルは Claude Code / Cursor が**毎セッション最初に読む単一の真実（single source of truth）**。
ここに書かれた決定に反する提案・実装をしてはならない。迷ったら作業を止めて確認すること。

---

## 0. 最優先の行動規範（コードより先に守る）

- **提案を鵜呑みにしない。** 変更は必ず diff を提示し、何をなぜ変えるか説明してから適用する。
- **「動けばOK」で終わらない。** 「これがこのプロジェクトにとって最適か」を自問してから出す。
- **褒める前に弱点を言う。** 問題点・改善点・より良い選択肢を、聞かれる前に出す。
- **スコープを勝手に広げない。** 依頼にない機能・抽象化・"ついでの改善"を足さない。
- **設計に関わる判断は速度より正確さを優先する。** ただし、品質・セキュリティ・マルチテナント境界・データ整合性に関係しない論点については、80〜90点で意思決定し実装を進める。決定済みの事項を再検討しない。
- 既存の設計ドキュメント（`docs/architecture.md`・`docs/database.md`・`docs/adr/`）と矛盾する実装をしない。矛盾を見つけたら指摘する。
- 学習と実装のバランス、および振り返りのルールについては `docs/learning/README.md` を参照すること。
- **品質優先の意識を徹底する**：本プロダクトは商用SaaS。スピードのために品質を犠牲にしない。以下は次へ進む前に必ず確認すること：
  - 対象ファイルは存在するか・前回の変更は保存されたか
  - マルチテナント境界を壊していないか（他テナントのデータが見えないか）
  - 要件・ADR・設計書と実装内容が一致しているか
  - コミット前に `git status` で変更ファイル一覧を確認し、追加・修正漏れがないか点検する
- 開発における優先順位は「品質・正確性 > 完成 > 理解100%」。詳細は `docs/learning/README.md` を参照。

---

## 1. プロジェクト概要

- **Quartet（qrtt.jp）** — 個人サロン・クリニック向け業務管理SaaS。
- ターゲット：ネイル・エステ・美容室・リラクゼーション・アイラッシュ・クリニック等の個人経営者。
- 最初のユーザー：enu nailsalon（埼玉県川越市）。永久無料プラン（`plan = 'free_forever'`）。
- 既に本番公開済み：求人ページ（`/enu/recruit`）。これは「Site Builderの第一号ページ」と捉える。

---

## 2. 技術スタック

### Phase 1（0〜10店舗）
Next.js × TypeScript（Vercel Pro）/ Go × Fly.io / Supabase(PostgreSQL) / AWS S3+CloudFront /
WorkOS AuthKit / Terraform（dev/staging/prod・薄く） / GitHub Actions / Cloudflare（前段） / Sentry+OpenTelemetry / Stripe。

### Phase 2（10〜50店舗・移行はTerraformで無停止）
AWS ECS Fargate / RDS PostgreSQL(Multi-AZ) / SSM Session Manager / Prometheus+Grafana。

> Go API は中核として維持する（バックエンド/インフラの評価ポイントがここに集まるため）。
> ただし重い処理だけ Go に寄せ、HP表示など軽い処理は Next.js 側で完結させてよい。

---

## 3. プロダクト・ロードマップ（機能を作る順序 — これを厳守）

```
Phase 0 : enu HP                         ← 今ここ
Phase 1 : 問い合わせ / 予約リクエスト受付（DB保存→通知メール・薄いNext.js API+Supabase・予約は自動確定しない）
--- ビジネス判断（開発タスクではない）: 2店舗目の見込み判定。確定ならHP→予約／未定なら即予約。返事待ちで開発を止めない ---
Phase 2 : 予約基盤  reservation-domain → reservation-api → reservation-admin（管理画面でリクエストを確認・確定）
Phase 3 : 本物のネット予約（自動確定）＋サロン別モード切替。空き枠・二重予約防止（冪等性＋枠ロック）。最難関＝主役
Phase 4 : HPB連携（Gmailポーリング・冪等性）
Phase 5 : LINE連携（Webhook。ここで Circuit Breaker 投入＋ADR）
----（ここから先は、上記を作る過程で必ず書き換わる。今は確定しない・実装しない）----
Phase 6+: カルテ → 共通化分析 → page_blocks → template → block editor（最後）
```

- **将来、予約方式をテナント単位で選択可能にする**（例：確認制／自動確定）。ただし NOW はフォーム受付（確認制）だけを実装する。**カラム名・enum・モード切替UIは Phase 3 の実装着手時に確定する（今は固定しない）。** 自動確定が無い段階で切替を作らない。

- **page_blocks / テンプレート / ブロックエディタは最後**。実店舗を2〜3件作って共通項が見えるまで作らない。
- **早すぎる抽象化は禁止。** 実例が2つ揃う前に共通化・スキーマ化しない。

### 判断軸（What と How を分離）
- **何を作るか（順序）= 顧客価値**で決める。
- **どう作るか（実装品質）= ポートフォリオ価値**で決める（マルチテナント・認可・監査ログ・テスト等）。

---

## 4. HP（店舗サイト）実装方針

- HP は**綺麗に props 化した React コンポーネント**で作る（`<HeroSection />` `<MenuSection />` 等）。
- **JSON schema 駆動・content JSONB からの動的描画にしない**（v1では早すぎる）。
- セクションの ON/OFF は **`tenants.is_recruit_enabled` 等の既存 boolean フラグ**で制御する。
- **ルール：2個目のトグル（例 `is_menu_enabled`）が必要になった瞬間**に、boolean増殖か `homepage_config jsonb` への移行かを検討する。今は `is_recruit_enabled` だけでよい。それまで新しい設定構造を作らない。
- 求人ページは独立機能ではなく「HPを構成する1ブロック（ON/OFF可）」として扱う。
- **問い合わせ・予約リクエストのフォーム**：送信内容は **DB保存 → 通知メール**。保存先は薄い Next.js API Route + Supabase（**この段階で Go は使わない**）。問い合わせと予約リクエストは同一の「フォーム受付＋DB保存」パターンで作る。**受付テーブルの具体設計（テーブル名・カラム）は実装着手時に決定する。今は確定しない。** 個人情報を集めるため、**フォーム公開前にプライバシーポリシー・特商法表記・利用規約を用意する**（コードと並行可・文章作業）。
- **予約リクエストは自動確定しない。** 空き枠カレンダー・自動確定・二重予約防止は NOW では作らない（予約基盤フェーズで実装）。

---

## 5. Go API 実装方針（後付けコスト軸で段階投入）

> 削る軸は「難易度」ではなく「後で足すと地獄か否か」。難しくても後付けが安いものは後回し、簡単でも後付けが痛いものは初日に入れる。

### 予約基盤（Phase 2）着手時に初日から必須 — 後付けが地獄
- Repository パターン（**手動コンストラクタ注入**。`repo := NewReservationRepository(db)` で十分。**wire/fx 等のDIフレームワークは使わない**）
- DTO の思想（リクエスト/レスポンス構造体を分ける。**DTO専用パッケージ地獄は作らない**）
- 統一エラー型（下記フォーマット）
- golang-migrate
- 構造化 JSON ログ
- `/healthz`
- **Soft Delete**（全テーブル `deleted_at` ＋部分一意インデックス。スキーマ前提なので初日必須）
- **二重予約防止＋冪等キー**（予約の"正しさ"そのもの。`reservations` の `idempotency_key` / `integration_key` ユニークインデックス＋枠の重複チェック）
- Graceful Shutdown（数行で済むので入れる）

### 段階投入 — 追加的で後付けが安い（その時 ADR を書く）
- Audit Log … **`audit_logs` テーブルとラッパーのパターンは予約基盤フェーズ（Go着手時）に用意する。** 書き込みは顧客・予約・カルテ・売上など機微テーブルが実データを持つ時点でONにする（Circuit Breaker より前。後付けで全write pathに挿すのは痛いため、パターンだけ先に確立）
- Rate Limiting … 必要時（前段の Cloudflare が一次的に担うため後回し可）
- Circuit Breaker … **外部API（LINE/HPB/Stripe）を繋ぐフェーズで投入**（予約コアには外部通信がないので不要）
- CQRS … v2 以降（トラフィック増加後）

統一エラーフォーマット：
```json
{ "error": { "code": "ERROR_CODE", "message": "ユーザー向け", "detail": "内部詳細（本番非表示）" } }
```

---

## 6. DB / マルチテナント（database.md の要約・厳守）

- 全ドメインテーブルに必須：`id (UUID)` / `tenant_id` / `created_at` / `updated_at` / `deleted_at`（全て TIMESTAMPTZ）。
- 通常の UNIQUE は使わず、**部分一意インデックス（`WHERE deleted_at IS NULL`）**を使う。
- `updated_at` は DB トリガー（`update_updated_at_column()`）で自動更新。
- RLS を全テーブルに適用。`auth.current_tenant_id()` で WorkOS JWT から tenant_id を抽出。
- マルチテナント：`Users ──< TenantUsers >── Tenants`（1ユーザーが複数テナント可）。**全APIリクエストで tenant_id を検証**。
- `staff`（ビジネスリソース・ヒト、role を持たない）と `tenant_users`（システムアクセス権限）は**責務分離**。

---

## 7. ドメイン境界（重要）

- **Reservation と Record は別ドメイン**。データもコードも分離する。
- 統合するのは**UIのみ**で、`customer_id` を軸にした**顧客中心ビュー**（予約タブ／カルテタブが同じ画面）。
- **カルテ向けのコード・カラム・フックを今は1行も書かない。** 予約管理画面を「顧客起点」で作り、カルテが後で同じ顧客コンテキストに乗る余地だけ残す。

---

## 8. 外部連携・リアルタイム

- **HPB**：v1 は Gmail API ポーリング（`gmail.readonly` 最小権限）。**構造的に遅延あり＝準リアルタイム**。冪等性キー＝HPB予約番号で UPSERT。詳細は ADR-004。
- **自社HP予約・LINE**：即時／ほぼリアルタイム。
- 「全ソースをリアルタイムで1画面に」は**不可**（HPBは遅延前提でUI表示する）。
- 難所は表示ではなく**複数ソースからの予約で二重予約をどう防ぐか**。冪等性＋枠ロックで解く（ポートフォリオの主役）。

---

## 9. ブランチ戦略

- `main`（本番・PR必須・force push禁止・削除禁止）← PR ← `develop`（統合・直接push可・force push/削除禁止）← `feature/susa/xxx`。
- **1 feature branch = 独立してマージできる論理的に完結した1単位 = 見せて恥ずかしくない1 PR。** 寿命は数日。
- 例：`feature/susa/reservation-domain` / `reservation-api` / `reservation-admin` / `booking-from-hp` / `line-integration` / `hpb-sync`。
- **予約は domain → api → admin を固めてから外部連携（HP導線/LINE/HPB）に進む。** 土台が固まる前に複数ソースを繋がない。

### マージ方式（現時点で確定）
```
feature/* → develop : Pull Request 必須・Squash and Merge
develop → main      : Pull Request 必須・Squash and Merge

リリース
- リリースごとに git tag を打つ。形式 v{major}.{minor}.{patch}（例 v0.1.0）
- GitHub Release ノートを作成する（面接官が見るのは git log ではなく Releases）
- 【必須】ロードマップのPhase完了時に `docs/learning/XXX_phase_name.md` を作成する。リリース時は必要に応じて追加する。

禁止
- develop / main への直接 push（main へは hotfix も必ず develop 経由）
- Rebase merge

移行トリガー（下記が起きたら develop → main を Merge commit へ切り替えを検討）
- 共同開発者が参加
- hotfix ブランチが必要になる
- 課金テナント 20件超
```
- `develop → main` を Squash し続けると PR比較が少しずつ濁る（papercut）が、低頻度リリースの今は無視してよい。リリース履歴の見やすさは Squash ではなく**タグと Releases** で担保する。
- **Git運用はこれで確定。半年は触らない。** 成功率への寄与が小さい領域（Git戦略 ≒ 1%）なので、これ以上磨かない。

---

## 10. 開発フロー

- **PR には必ず `docs/` の修正を含める**（コードと設計書を常に一致させる）。
- **設計変更は ADR（`docs/adr/`）に記録してから実装する。**
- テストは「動いた」ではなく「テストが通った」を基準。テストコードは実装と同時に書く。PR の CI が全グリーンになるまでマージ禁止。
- 全デプロイは GitHub Actions 経由のみ（直接 push 禁止）。develop→staging、main→prod。
- コード全体を共有する時は Repomix を使う。

---

## 11. 禁止事項（やってはいけないこと）

- Bolt.new で生成したコードを**本番にそのまま使わない**（UIデモ確認専用）。
- 実例が2つ揃う前の**共通化・抽象化・スキーマ化**（page_blocks を v1 で作る等）。
- 依頼にない機能・"ついでの改善"・余分な抽象化の追加（スコープ肥大）。
- v1 の予約コアに Circuit Breaker / CQRS / DIフレームワークを入れること。
- JSX を JSON schema 駆動に置き換えること（v1のHP）。
- カルテ用のコードを予約フェーズで書くこと。
- HP（NOW）段階で空き枠カレンダー・自動確定・二重予約防止・枠ロックを作ること（予約リクエストは"フォーム受付＋DB保存"に留める）。
- Phase 1（フォーム受付）の段階で `reservations` 予約ドメインテーブルや Go 予約ドメインを作ること（受付専用テーブルに留める。予約ドメインは Phase 2 で確定）。
- 設計ドキュメントを更新せずにコードだけ変えること。
```

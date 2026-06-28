# reservation-api

**Status**: Deferred
**Criticality**: Medium
**Owner**: k susa
**Decision date**: 2026-06
**Review trigger**:
- Phase 2（予約基盤）開始時
- DBスキーマ変更時
- 統一エラーフォーマット変更時
- API仕様の Source of Truth を変更する場合

---

## Go API 実装方針（後付けコスト軸で段階投入）

> 削る軸は「難易度」ではなく「後で足すと地獄か否か」。難しくても後付けが安いものは後回し、簡単でも後付けが痛いものは初日に入れる。

### 予約基盤（Phase 2）着手時に初日から必須 — 後付けが地獄

- Repository パターン（**手動コンストラクタ注入**。`repo := NewReservationRepository(db)` で十分）
- DTO の思想（リクエスト/レスポンス構造体を分ける。**DTO専用パッケージ地獄は作らない**）
- 統一エラー型（下記フォーマット）
- golang-migrate
- 構造化 JSON ログ
- `/healthz`
- **二重予約防止＋冪等キー**（予約の"正しさ"そのもの。`reservations` の `idempotency_key` / `integration_key` ユニークインデックス＋枠の重複チェック）
- Graceful Shutdown（数行で済むので入れる）

> **Soft Delete**（`deleted_at` ＋ 部分一意インデックス）はDB全体規約のため、Authority: `CLAUDE.md` セクション6 を参照。本playbookでは再定義しない。

> **DIフレームワーク（wire/fx 等）は v1 で使用しない**。Authority: `CLAUDE.md` セクション11（禁止事項）。
> **理由（rationale）**: v1の予約コアは規模が小さく、手動コンストラクタ注入で十分。DIフレームワークは初期段階で複雑性を増やすコストの方が大きい。

### 段階投入 — 追加的で後付けが安い（その時 ADR を書く）

- Audit Log … **`audit_logs` テーブルとラッパーのパターンは予約基盤フェーズ（Go着手時）に用意する。** 書き込みは顧客・予約・カルテ・売上など機微テーブルが実データを持つ時点でONにする（Circuit Breaker より前。後付けで全write pathに挿すのは痛いため、パターンだけ先に確立）
- Rate Limiting … 必要時（前段の Cloudflare が一次的に担うため後回し可）
- Circuit Breaker … 導入タイミングは Authority: `CLAUDE.md` ロードマップ（Phase 5: LINE連携） に従う。
  - **理由（rationale）**: 予約コアには外部通信がないため不要。外部API（LINE/HPB/Stripe）を繋ぐフェーズで、外部依存の障害伝播を遮断する目的で投入する。
- CQRS … v2 以降（トラフィック増加後）

統一エラーフォーマット：
```json
{ "error": { "code": "ERROR_CODE", "message": "ユーザー向け", "detail": "内部詳細（本番非表示）" } }
```

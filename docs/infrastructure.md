# Infrastructure

本ドキュメントはデプロイ最適化・インフラ運用の記録先。現時点では依存管理の記録のみ。詳細な技術選定は `docs/architecture.md` および `docs/tech_stack_timeline.md` を参照。

---

## デプロイ最適化

TODO（Phase 2 のインフラ設計時に記載）

---

## 一時的な依存 override

Node.js 依存の一時的な override は本節に集約する。overrides を追加する時は必ず「対象」「理由」「解除条件」を明記し、解除を忘れないための手がかりを残す。

### next 経由の postcss（2026-07 追加）

- **対象**: `next` 経由の `postcss` を `^8.5.21` に固定
- **設定箇所**: `package.json` の `overrides.next.postcss`。`@tailwindcss/postcss` は既に 8.5.15 で安全なため巻き込まず、`next` 配下のみを対象にする
- **理由**: GHSA-qx2v-qp2m-jg93（PostCSS の CSS Stringify 出力における `</style>` 未エスケープ）。影響範囲は `next` 9.3.4-canary.0 〜 16.3.0-canary.5。2026-07 時点で `next` の latest は 16.2.10 であり、16.3.0 stable が未リリースのため next のバージョン更新では解消できない
- **解除条件**: `next` 16.3.0 stable 以降へ更新した時点で本 override を削除し、`npm audit` で解消を確認する。**削除し忘れると将来の next 更新を妨げる**ため、next 更新時に必ず本節を確認する

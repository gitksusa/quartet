# Playbooks

このディレクトリは、実装手順ではなく
「設計判断・アーキテクチャ方針・ドメインルール」を管理する。

## skills/ との違い

- `skills/`
  - AIエージェントが再利用する具体的な手順
  - 例: PR作成、DBマイグレーション、障害対応Runbook
  - Claude Code / Anthropic 公式の慣習ディレクトリ
- `playbooks/`
  - システム設計・ドメイン設計の原則
  - 例: Reservation API設計、ドメイン境界、外部連携方針
  - Quartet 独自（将来的に Agent Skill へ昇格する可能性あり）

## 参照ルール

CLAUDE.md 本体に各 playbook の `Review trigger` を記載している。
そのトリガーに該当する作業を始める前に必ず開くこと。

各 playbook の先頭には以下のメタ情報を必ず置く：

- **Status**: Active / Deferred
- **Criticality**: High / Medium / Low
- **Owner**: 担当者
- **Decision date**: その方針を決定した年月
- **Review trigger**: 再確認すべき条件（複数可）

## 現在の playbooks

| File | Status | Criticality | Review trigger 概要 |
|------|--------|-------------|---------------------|
| `reservation-api.md` | Deferred | Medium | Phase 2 開始時 |
| `domain-boundary.md` | Active | High | 常時遵守（憲法） |
| `external-integration.md` | Deferred | Medium | Phase 4 開始時 |
| `content-image-policy.md` | Active | High | 画像取得手段追加・Before/After機能追加時 |

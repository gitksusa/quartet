# external-integration

**Status**: Deferred
**Criticality**: Medium
**Owner**: k susa
**Decision date**: 2026-06
**Review trigger**:
- Phase 4（HPB連携）開始時
- Phase 5（LINE連携）開始時
- 新しい外部API追加検討時

---

## 外部連携・リアルタイム

- **HPB**：v1 は Gmail API ポーリング（`gmail.readonly` 最小権限）。**構造的に遅延あり＝準リアルタイム**。冪等性キー＝HPB予約番号で UPSERT。詳細は ADR-004。
- **自社HP予約・LINE**：即時／ほぼリアルタイム。
- 「全ソースをリアルタイムで1画面に」は**不可**（HPBは遅延前提でUI表示する）。
- 難所は表示ではなく**複数ソースからの予約で二重予約をどう防ぐか**。冪等性＋枠ロックで解く（ポートフォリオの主役）。

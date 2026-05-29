# ADR-005: Feature Flags戦略

## ステータス
採用済み（v1：DBカラム方式）・計画済み（v2以降：Unleash導入検討）

## コンテキスト
テナントごとに機能のON/OFFを制御する必要がある。
Unleash等のサードパーティ製Feature Flagツールも検討した。

## 決定事項
v1（テナント10件未満）ではTenantsテーブルにbooleanカラムを追加して制御する。
サードパーティのFeature Flagツールは導入しない。

## 理由
- v1フェーズでは制御する機能数が少なくシンプルな実装で十分
- サードパーティツールの導入・運用コストを避ける
- DBのカラムで制御することでツールへの依存を排除できる

## 具体的なカラム例
Tenantsテーブルに以下のbooleanカラムを追加する。
- is_recruit_enabled（求人ページの公開/非公開）
- is_reservation_enabled（予約機能のON/OFF）
- is_hpb_integration_enabled（HPB連携のON/OFF）
- is_line_integration_enabled（LINE連携のON/OFF）

## トレードオフ
- booleanカラムが増えるとTenantsテーブルが肥大化する
- テナント単位より細かい制御（ユーザー単位・A/Bテスト）には対応できない

## Unleash導入トリガー条件
以下のいずれかを満たした時点でUnleashの導入を検討する。
- 機能フラグ用booleanカラムが10個を超えTenantsテーブルの肥大化が懸念される時
- テナント単位ではなく顧客（エンドユーザー）単位での細かな制御が必要になった時
- カナリアリリースやA/Bテストの要件が発生した時
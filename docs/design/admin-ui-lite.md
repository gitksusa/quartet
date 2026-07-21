# 管理画面 UI 簡易設計（Lite CMS）

**Status**: Draft
**Owner**: k susa
**Decision date**: 2026-07
**前提ドキュメント**:
- `docs/design/hp-template-patterns.md`（テンプレート・共通セクションID・mood パレット）
- `docs/design/hp-db-schema.md`（tenant_sections / tenant_images / tenant_site_settings・下書き/公開分離）
- `docs/design/auth-tenant-access-control.md`（認証・権限設計）
**Review trigger**:
- 管理画面ルーティング実装着手時
- 新しい管理画面ページを追加したくなった時
- STEP 構成を増減したくなった時（STEP の追加・統合・削除）
- mood の追加・削除が必要になった時（`hp-template-patterns.md` の mood パレット定義を先に更新）

---

## このドキュメントの目的

管理画面で「何を作るか」の共通認識を作り、実装タスクを小さく分割できる状態にする。詳細なワイヤーフレーム・UIコンポーネント設計までは踏み込まない。**実装タスクの分割単位を決めることが目的。**

---

## 設計方針

- **Phase 0b の管理画面はLite CMSとして最小限に絞る。** 将来のブロックエディタ（Phase 6+）の土台を今作らない。
- **テンプレート・mood は STEP1・STEP2 で選択し、過去 STEP に戻れば変更可能。** テンプレ・mood を変えても content は不変（`hp-db-schema.md` の「テンプレート変更時の挙動」参照）。
- **画像管理はセクション編集の STEP4 に統合する。** 独立した画像ライブラリ画面はPhase 0b初期では本格実装しない。

---

## 管理画面のURL構造

**単一パス**: `/admin/[tenantSlug]`

管理画面は **1 画面（単一ルート）で完結**する。従来案の `/template`, `/sections`, `/sections/[sectionId]`, `/settings`, `/images` といった別ページ URL は**廃止**。すべての編集操作は同一画面内の STEP ウィザードで行い、画面遷移なしで完了できる（詳細は次節）。

`[tenantSlug]` はテナントの識別子（`tenants.slug`）。認証ガードにより、ログイン済みかつ当該テナントの `owner` のみアクセス可能（既存の PR4 layout 第一関門）。

---

## STEP 構成（4 ステップ + STEP0）

管理画面は STEP0 と STEP1〜STEP4 の合計 5 段階で構成される。画面遷移はなく、同一ルート `/admin/[tenantSlug]` 内で STEP を進行する。

過去に完了した STEP は**左端に細く畳まれて積み重なり**、いつでもクリックして戻り部分修正できる。他の STEP の入力内容は保持される。

### STEP0: 店舗基本情報（初回のみ）

**責務**: 店名表示用・住所・電話・営業時間・定休日・最寄駅の初回入力。

**体験仕様**:
- 未入力の初回ログイン時のみ表示。**必須は店名表示用のみ想定・実装時確定**。既入力の場合は STEP1 に自動進行
- 各項目は自由記述テキスト（Zod でバリデーション）
- 完了で `tenant_site_settings` の店舗基本情報カラム群に保存（`hp-db-schema.md` 1.5 節参照）
- `access` / `reservation` セクションが自動参照するため、二度打ち不要

### STEP1: テンプレート選択

**責務**: HTML 骨格の選択（`hp-template-patterns.md` の 6 パターン）。

**体験仕様**:
- 選択後は左端に細く畳まれる
- 画面右側に**常時リアルタイムプレビュー**（下書き `content` を反映）
- 選択で `tenant_site_settings.template_type` に保存
- テンプレ変更で content は不変（`hp-db-schema.md` の「テンプレート変更時の挙動」参照）
- 選択中カードは反転色（背景 gray-900・文字 white）で強調表示

### STEP2: mood 選択

**責務**: mood（雰囲気・CSS 変数セット）の選択。

**体験仕様**:
- 「このテンプレへのおすすめ mood」を先頭に表示（初期は定数「おすすめ」・後続で「人気」へ移行・詳細は `hp-template-patterns.md` の「おすすめ/人気ランキング」参照）
- 選択で即プレビュー反映（CSS 変数のみ差替・**PR9 では実装しない**: mood トークンの CSS 変数実装は消費側の公開 HP レンダリング実装時に後続 PR でまとめる）
- 選択で `tenant_site_settings.mood` に保存
- STEP1 未完了時（`currentTemplateType === null`）は STEP2 を表示するが保存ボタン disabled。「先に STEP1 でテンプレートを保存してください」の案内を表示。おすすめ順位は不明のため、mood はデフォルト順（`src/lib/constants/site-settings.ts` の `MOODS` 順）で表示
- 選択中カードは STEP1 と同じ反転色で強調表示

### STEP3: セクション ON/OFF ＋ 階層入力

**責務**: 12 セクションの表示切替と content 入力。

**体験仕様**:
- 12 セクション（`hp-template-patterns.md` の共通セクションID）の ON/OFF トグル（`tenant_sections.is_visible` を切替）
- ON にしたセクションは吹き出し UI で階層入力（固定項目型 / 可変配列型 / 画像主体型の 3 パターン。詳細は `hp-db-schema.md` 2.1 節）
- 可変配列型（features / staff / voice / faq / menu）は「+追加」で小見出しが増える
- 入力済みの小見出しは**緑チェック**で状態を明示
- 入力済み小見出しはセクション欄に並び、後から再編集可能
- **画面遷移なし**・同一画面内で完結
- 入力は debounce（500ms〜1s）で `content` へ自動保存（次節「自動保存」参照）
- 吹き出し UI のコンポーネント構造・アニメーション・キーボードナビゲーション等の実装詳細は PR11+ の実装時に確定する（本 doc では体験仕様のみ記述）

### STEP4: 画像

**責務**: セクション画像のアップロード。

**体験仕様**:
- プレビュー全体に**番号付き画像枠**が表示される（テンプレ骨格が「ここに画像 N 番」を示す）
- 番号ごとにアップロード
- アップロード後は該当セクションに即反映
- プレビュー上の直接クリック差替は**後続改善**（Phase 0b の初期実装では番号ベースの UI）
- 画像分類（`classification`）の選択を必須とする
- `treatment_result` の場合は `source_note` 入力を必須とする（`content-image-policy.md` の方針）
- 保存先は `tenant_images` テーブル（既存設計・`hp-db-schema.md` 3 節）

### STEP 間の移動

- 左端に積み重なった過去 STEP のバッジをクリックで即時戻れる
- 現在編集中の STEP の入力は失われずに保持される
- 全 STEP の完了状態は保存インジケータで俯瞰できる（実装詳細は PR11+）

---

## 自動保存・下書き/公開分離

管理画面の編集は**自動保存**を基本とし、公開は明示的な「完了」ボタンで行う。

### 自動保存（下書きへ）

- 入力停止後 500ms〜1s の debounce で `tenant_sections.content`（下書き）へ自動保存
- **保存ボタンは設けない**
- 画面上に**保存インジケータ**を表示（「保存中」「保存済み」「保存失敗」の 3 状態）
- 保存失敗時は次回入力トリガー時に再送。失敗が継続する場合の UI は PR11+ 実装時に確定

### 完了ボタンで公開

- 画面右下に「完了」ボタンを配置
- 押下で `content` を `published_content` へコピー = 本番公開
- 公開 HP は `published_content` のみを読む（下書きの `content` は公開されない）
- 初回公開前（`published_content` IS NULL）の公開 HP 表示は「準備中」相当のプレースホルダ（テンプレ側の実装判断・詳細は `hp-db-schema.md` 2 節）

### プレビューは常に下書き（`content`）を表示

- 管理画面のリアルタイムプレビューは `content` を反映
- 「今何が本番に出ているか」と「今下書きで編集中の状態」を区別する UI（例: 「本番と差分あり」バッジ）の要否は PR11+ 実装時に確定

---

## 実装の分割方針（PRの切り方）

Phase 0b の管理画面実装は複数の小 PR に段階分解する。**1 PR に複数機能を詰めない**。以下は現時点の想定であり、実装時の粒度で調整する余地を残す。

### PR8: テンプレート選択の保存（STEP1）

- `/admin/[tenantSlug]` の 1 画面内で STEP1（テンプレ選択）のみを動作させる
- 選択結果を `tenant_site_settings.template_type` に保存する Server Action を追加
- プレビュー機能は最小限（画像なし・content 空でも骨格が描画される程度）

### PR9: mood 選択の保存（STEP2）＋ mood トークン初期セット

- STEP2（mood 選択）を追加
- mood トークン初期セット（3〜5 個・詳細は `hp-template-patterns.md`）を CSS 変数として実装
- 「おすすめ」定数の表示（実データ集計はまだ）

### PR10: セクション ON/OFF（STEP3 の骨格・階層入力なし）

- 12 セクションの ON/OFF トグルを実装
- ON/OFF は `tenant_sections.is_visible` に保存
- content の階層入力はまだ実装しない

### PR11+: セクション階層入力（content JSON ＋ 自動保存）

- STEP3 の吹き出し UI・可変配列の「+追加」・緑チェック等を実装
- Zod スキーマ（`src/lib/validation/`）を新設し、セクション別バリデーション
- debounce 自動保存の実装
- 吹き出し UI のコンポーネント設計・アクセシビリティ等の詳細を確定

### 後続 PR

- 画像管理（STEP4）
- 下書き/公開分離の完了ボタン + `published_content` コピー処理
- STEP0（店舗基本情報の初回入力・既入力スキップ判定）
- おすすめ/人気ランキングの集計関数実装（時期未定）

### PR8-11+ の順序をロードマップに反映

上記の順序は `docs/roadmap.md` の NOW 節「Phase 0b の PR 分解」にも記録する。詳細（設計判断・却下案）は本 doc で管理し、順序と時期は roadmap.md 側で一元管理する。

---

## Phase 0b で実装しないもの（明示的に除外）

- drag & drop によるセクション並び替えUI
- プレビュー上の直接クリック差替（画像管理は STEP4 の番号ベース UI で完結）
- `admin` / `staff` ロールの管理画面（owner のみ）
- `custom_domain` 設定
- テーマ（配色）選択（mood 選択で代替する範囲）
- 複数テナントの切り替えUI
- 顧客向けアカウント（サロン利用者側）

---

## 次フェーズへの引き継ぎ

この簡易設計を前提として、Phase 0b の管理画面実装 PR（PR8 以降）に進む。各 PR の実装は Claude Code で行い、Codex でレビューする。PR 本文には「AIレビュー」セクションを追加する。

**このドキュメントはDraft。実装を進める中で、画面追加・責務変更が生じた場合はここに戻って更新する。**

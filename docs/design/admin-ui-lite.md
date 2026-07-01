# 管理画面 UI 簡易設計（Lite CMS）

**Status**: Draft
**Owner**: k susa
**Decision date**: 2026-07
**前提ドキュメント**:
- `docs/design/hp-template-patterns.md`（テンプレート・共通セクションID）
- `docs/design/hp-db-schema.md`（tenant_sections / tenant_images / tenant_site_settings）
- `docs/design/auth-tenant-access-control.md`（認証・権限設計）
**Review trigger**:
- 管理画面ルーティング実装着手時
- 新しい管理画面ページを追加したくなった時
- テンプレート切り替えUIを実装したくなった時（未決事項の確定）

---

## このドキュメントの目的

管理画面で「何を作るか」の共通認識を作り、実装タスクを小さく分割できる状態にする。詳細なワイヤーフレーム・UIコンポーネント設計までは踏み込まない。**実装タスクの分割単位を決めることが目的。**

---

## 設計方針

- **Phase 0b の管理画面はLite CMSとして最小限に絞る。** 将来のブロックエディタ（Phase 6+）の土台を今作らない。
- **テンプレートは初回選択のみ。** 自由なテンプレート切り替えUIはPhase 0bでは実装しない（`auth-tenant-access-control.md` の未決事項と同じ方針）。
- **画像管理は各セクション編集画面に内包する。** 独立した画像ライブラリ画面はPhase 0b初期では本格実装しない。

---

## 管理画面のURL構造

**ベースパス**: `/admin/[tenantSlug]/`

`[tenantSlug]` はテナントの識別子（`tenants.slug`）。認証ガードによりログイン済みかつ当該テナントの `owner` のみアクセス可能。

---

## 画面一覧

### 1. `/admin/[tenantSlug]`（ダッシュボード）

**責務**: 管理画面のトップ。公開HPの状態と主要設定の概要を表示。

表示する情報:
- 現在のテンプレート名
- 公開HP の公開状態（published / draft）
- 各セクションのON/OFF概要（一覧表示）
- 公開HPへのリンク

**Phase 0bでは実装する。**

---

### 2. `/admin/[tenantSlug]/template`（テンプレート選択）

**責務**: 初回テンプレート選択、および現在のテンプレート確認。

- テナントが初めてログインした際、テンプレートを1つ選ぶ
- 選択後は「現在のテンプレート」として表示するのみ
- **Phase 0bでは自由なテンプレート切り替えUIは実装しない**（`hp-db-schema.md` 未決事項参照）
- テンプレートを変更したい場合は、将来のフェーズで対応

**Phase 0bでは初回選択フローのみ実装する。**

---

### 3. `/admin/[tenantSlug]/sections`（セクション一覧）

**責務**: 全セクションの表示ON/OFFと並び順の管理。

表示・操作する内容:
- 全セクション一覧（`tenant_sections` の全行。選択テンプレートに応じたデフォルト順）
- 各セクションの `is_visible` トグル（ON/OFF切り替え）
- 各セクションへの編集リンク（→ `/sections/[sectionId]`）
- 並び順の表示（Phase 0bでは並び順の変更UIは実装しない。確認のみ）

**Phase 0bでは実装する。ただし drag & drop による並び替えは実装しない。**

---

### 4. `/admin/[tenantSlug]/sections/[sectionId]`（セクション編集）

**責務**: 特定セクションのコンテンツ編集。

操作する内容:
- `tenant_sections.content`（jsonb）の各フィールドを編集
  - hero: キャッチコピー・サブコピー
  - concept: 見出し・本文
  - menu: メニュー項目（名前・価格・説明）の追加・編集・削除
  - staff: 氏名・肩書き・メッセージ
  - 等（セクションIDごとに入力フォームが変わる）
- 画像のアップロード・差し替え（`tenant_images` への保存を含む）
  - 画像分類（`classification`）の選択を必須とする
  - `treatment_result` の場合は `source_note` 入力を必須とする（`content-image-policy.md` の方針）

**Phase 0bでは全セクションIDに対応した編集フォームを実装する。**
**Zod（`src/lib/validation/`）でコンテンツのバリデーションを行う前提。**

---

### 5. `/admin/[tenantSlug]/settings`（公開設定）

**責務**: HPの公開設定とSEO設定。`tenant_site_settings` テーブルを編集する画面。

操作する内容:
- 公開状態の切り替え（published / draft）
- SEO title / description の編集

将来の拡張先（Phase 0bでは実装しない）:
- `custom_domain` の設定
- テーマ（配色）の選択

**Phase 0bでは公開状態・SEO title / description のみ実装する。**

---

### 6. `/admin/[tenantSlug]/images`（画像ライブラリ）

**責務**: テナントが登録した画像の一覧・管理。

**Phase 0b初期では本格実装しない。**

理由: 画像の登録・差し替えは各セクション編集画面（`/sections/[sectionId]`）内で完結する。独立した画像ライブラリは、画像点数が増えて「使い回したい」ニーズが出た時点で実装する。

画面一覧には定義として載せるが、実装は将来フェーズ。

---

## 実装の分割方針（PRの切り方）

管理画面の実装は、以下のPR単位で進める。各PRは独立してマージできる論理的な完結単位とする。

```
PR1: migration のみ
  - tenant_users
  - tenant_site_settings
  - tenant_sections
  - tenant_images
  - 必要な制約・index・updated_at trigger
  - RLS の土台（read policy のみ先行適用）

PR2: src/lib/auth / src/lib/tenant の土台
  - WorkOS AuthKit 基本設定
  - JWT 検証・セッション管理
  - workos_user_id → tenant_id 解決

PR3: 管理画面ルーティングと認証ガード
  - /admin/[tenantSlug] のルーティング
  - ログインしていなければ /login にリダイレクト
  - 他テナントへのアクセスを拒否

PR4: ダッシュボード + セクション一覧
  - /admin/[tenantSlug]
  - /admin/[tenantSlug]/sections

PR5: セクション編集（テキスト）
  - /admin/[tenantSlug]/sections/[sectionId]
  - tenant_sections.content の編集フォーム

PR6: セクション編集（画像）
  - /admin/[tenantSlug]/sections/[sectionId] に画像アップロードを追加
  - tenant_images への保存・差し替え

PR7: テンプレート選択 + 公開設定
  - /admin/[tenantSlug]/template
  - /admin/[tenantSlug]/settings
```

**PR1 は migration のみ。WorkOS 実装・管理画面UI・セクション編集画面は混ぜない。**

---

## Phase 0b で実装しないもの（明示的に除外）

- drag & drop によるセクション並び替えUI
- テンプレート自由切り替えUI（初回選択のみ）
- 画像ライブラリ（`/admin/[tenantSlug]/images`）の本格実装
- `admin` / `staff` ロールの管理画面（owner のみ）
- `custom_domain` 設定
- テーマ（配色）選択
- 複数テナントの切り替えUI
- 顧客向けアカウント（サロン利用者側）

---

## 次フェーズへの引き継ぎ

この簡易設計を前提として、最初の実装PR（migration）に進む。各PRの実装はClaude Codeで行い、Codexでレビューする。PR本文には「AIレビュー」セクションを追加する。

**このドキュメントはDraft。実装を進める中で、画面追加・責務変更が生じた場合はここに戻って更新する。**

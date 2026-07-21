# HP テンプレートシステム DBスキーマ設計

**Status**: Draft（設計途中）
**Owner**: k susa
**Decision date**: 2026-07
**前提ドキュメント**: `docs/design/hp-template-patterns.md`（テンプレート・共通セクションID定義）
**Review trigger**:
- 認証（WorkOS AuthKit）実装着手時（RLS write policy を有効化する際）
- テンプレート変更UIを実装したくなった時（未決事項を確定させる）
- `tenant_site_settings` に新しいHP設定項目を追加する時

---

## このドキュメントの目的

`docs/design/hp-template-patterns.md` で定義したテンプレート・共通セクションIDを、実際のDBスキーマに落とし込む。まだマイグレーションは実行しない。設計のみ。

---

## 既存スキーマの確認（前提）

`tenants` テーブルの現状（2026-07時点）:

```
id                            uuid (PK)
slug                          varchar
name                          varchar
plan                          varchar default 'trial'
is_recruit_enabled            boolean default false
is_reservation_enabled        boolean default true
is_hpb_integration_enabled    boolean default false
is_line_integration_enabled   boolean default false
created_at                    timestamptz
updated_at                    timestamptz
deleted_at                    timestamptz (nullable)
```

**重要な判断**: `is_X_enabled` 方式は「機能フラグ」（外部連携・予約受付などの ON/OFF）であり、`hero` / `gallery` / `menu` のような「コンテンツセクションの表示制御」とは責務が異なる。後者にこの方式を踏襲しない。理由は `hp-template-patterns.md` 原則1（テンプレートは保存項目を変えるものではない）と同じで、セクションが増えるたびに `tenants` へのカラム追加が発生する設計を避けるため。

---

## 1. `template_type` と `mood` の 2 軸設計（B 案採用）

テンプレート（構造・レイアウト）と mood（雰囲気：色味・質感）は**独立した 2 軸**として扱う。全 mood は全テンプレートで自由に組み合わせ可能とする。

- **テンプレ = HTML 骨格**（セクション並び・強調度・全体構造）
- **mood = デザイントークン**（CSS 変数セット：色・フォント・角丸・影・余白）

この分離により、組み合わせの実装コストは 6×N ではなく **6+N** に抑えられる。テンプレ追加は HTML 骨格 1 パターン追加、mood 追加は Zod 許容値追加 + トークンセット 1 個追加のみで **migration 不要**。詳細は `hp-template-patterns.md` の「原則 4」および「mood パレット定義」節を参照。

### テーブル配置（B 案採用）

`tenant_site_settings` テーブルに `template_type` と `mood` を持つ。理由は責務分離：`tenants` は契約・組織、`tenant_site_settings` は公開 HP の見せ方（性質が異なる）。

```
tenant_id       uuid (PK, FK -> tenants.id)
template_type   text                              -- テンプレート識別子
mood            text                              -- mood 識別子
[店舗基本情報カラム群 → 1.5 節]
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

将来の拡張先（今は追加しない。設計上の置き場所だけ示す）:
```
seo_title           text
seo_description     text
published_at        timestamptz
custom_domain       text
```

- `template_type` / `mood` はいずれも **text**。許容値は Zod（アプリ層）で管理し、**Postgres enum は使わない**（原則: 追加時に migration が必要になるのを避ける・`section_id` / `classification` と同じ方針）
- mood を新規追加しても DB 変更は不要（Zod 列挙値 + CSS 変数トークンセット 1 つの追加のみ）

### A 案（`tenants.template_type` 直置き）を却下した理由

- `tenants` に混在させると「テナントの属性」なのか「HP の表示設定」なのかが曖昧になる
- 将来 SEO 項目・`custom_domain` などの HP 設定が増えるたびに `tenants` が肥大化する
- `tenants` はテナント管理画面・認証・契約プラン等、本来 HP の表示設定とは異なる責務を持つ

`tenant_id` を PK にすることで 1 テナント 1 行が保証され、`tenants` との 1:1 JOIN も単純。責務分離の観点で B 案を採用。

**コンテンツの SSOT は `tenant_sections`（次節）であり、`tenant_site_settings.template_type` / `mood` はあくまで「見せ方・レイアウト選択」に限定する。** テンプレ・mood を変えてもコンテンツ自体（テキスト・画像）は変わらない、という原則をテーブル構造でも表現する。

### mood カラムの追加設計（0007 で実装）

- `mood text NULL`（列挙は DB 側で行わない・許容値管理は `src/lib/constants/site-settings.ts` の `MOODS` 定数）
- CHECK 制約 `tenant_site_settings_mood_length_check`: `mood IS NULL OR char_length(mood) BETWEEN 1 AND 50`
- **mood 保存 RPC は UPDATE 専用**（PR9 の `update_owner_tenant_mood_for_workos_user`）: INSERT はしない。理由は `tenant_site_settings.template_type` が NOT NULL のため、site_settings 行未作成のテナントで mood だけを UPSERT すると `23502 not_null_violation` になる。PR8 の 0006（`upsert_owner_tenant_template_type_for_workos_user`）が行を作成し、PR9 はその既存行の mood を UPDATE する、という役割分担
- 認可 OK でも site_settings 行が未作成の場合は 0 行返却（認可 NG と同じ扱い・案 P）。UI 側で `currentTemplateType === null` 時に事前 disabled して防御（詳細は 0007 SQL ヘッダ【UPDATE 専用にする設計判断】参照）
- mood の NULL 扱いは 2 箇所で意味が異なる（列制約は NULL 許容 / RPC 引数検証は NULL 拒否）。詳細は 0007 SQL ヘッダ【mood の NULL 扱いは 2 箇所で意味が異なる】参照
- **読み取り側でアプリ層定数による正規化**: DB は列挙検証しないため、`getOwnerTenantSiteSettings` は `isMoodId()` 型ガードで既知値へ正規化する。未知値は `null` 化して UI へ渡す（UI 上「未設定」表示・STEP2 で保存すれば既知値に上書きされる。これは意図した挙動: 不正値を UI で温存しない）
- **template_type には対応する正規化を設けない**: 0006 の SECURITY DEFINER 関数が DB 側で列挙検証をしており、不正値が書き込まれる経路が存在しない（mood との非対称は意図的）

---

## 1.5 `tenant_site_settings` に追加する店舗基本情報カラム

店舗基本情報（店名表示用・住所・電話・営業時間・定休日・最寄駅情報）は `tenant_site_settings` に一元化する。STEP0（初回のみ）で一度だけ入力し、`access` / `reservation` セクションが自動参照する。**二度打ちさせない**設計原則。

### 追加カラム

```
display_name     text        -- 店名表示用（tenants.name とは別。表示用の表記揺れを許容）
address          text        -- 住所（1 行文字列。都道府県〜番地〜建物名）
phone            text        -- 電話番号（表記自由。ハイフン有無等）
business_hours   text        -- 営業時間（自由記述。曜日別の細分は初期は文字列で）
closed_days     text        -- 定休日（自由記述。「毎週火曜」「不定休」等）
nearest_station  text        -- 最寄駅情報（「〇〇駅 徒歩5分」等の自由記述）
```

- いずれも text・自由記述。バリデーションは Zod（本 doc 原則: enum 不使用）
- 構造化（jsonb / 曜日別テーブル分離）は現段階では過剰。実際の運用で細かい制約が必要になった段階で見直す
- `deleted_at` は持たない（`tenant_site_settings` 自体が持たない方針を継承）

### 自動参照の設計

- `access` セクションの content は `map_note` のみを持つ（内部記述用）。address / nearest_station は tenant_site_settings から自動読み込み・公開 HP 描画時にセクションレンダラで合成
- `reservation` セクションの電話予約表示は tenant_site_settings.phone を参照
- 「店名表示」（hero や concept 等の見出し）は display_name を参照可能。ただし `tenant_sections.content.headline` 等でセクション独自のキャッチコピーを持つのは自由

### 初回入力タイミング（UI）

`admin-ui-lite.md` の STEP0 で入力する。**STEP0 完了条件**は「必須項目（実装時に確定・`display_name` のみを想定）が入力済みであること。他は任意」とする。既入力の場合は STEP0 をスキップして STEP1（テンプレ選択）に直接進む。

---

## 2. `tenant_sections`（コンテンツのSSOT）

各テナントが、どのセクションを、どんな内容で、どの順番・表示状態で持つかを管理する。

```
id              uuid (PK, default gen_random_uuid())
tenant_id       uuid (FK -> tenants.id)
section_id      text        -- 'hero', 'concept', 'gallery' 等。共通セクションIDそのもの
content         jsonb       -- セクションごとに形が違うテキスト系の中身
is_visible      boolean     default true
display_order   integer
created_at      timestamptz default now()
updated_at      timestamptz default now()

unique制約: (tenant_id, section_id)
```

### `content` を jsonb にする理由

`hero`（キャッチコピー＋サブコピー）と `menu`（メニュー名・価格・説明の配列）と `staff`（氏名・肩書き・メッセージ）では中身の形が根本的に異なる。これを全部別カラムにすると `hp-template-patterns.md` 原則1に違反する（セクション追加のたびにスキーマ変更が必要になる）。jsonb なら「セクションごとに形が違う」を1つのテーブル構造のまま吸収でき、セクションが増えてもこのテーブル自体は変わらない。

### `section_id` のバリデーションは Postgres enum ではなく Zod（アプリ層）で行う

PostgreSQL の enum 型は後から値を追加しづらい（型の ALTER が必要、トランザクション内での扱いに制約がある）ため、`section_id` の正当性チェックはアプリ層（`src/lib/validation/`、Zod）で行う。DB側は `text` 型のまま、taipo（typo）防止と「許可されたセクションIDの一覧」の管理は Zod スキーマが担う。これにより、新しいセクションID（例: 将来の `news`）を追加する際もマイグレーション不要でアプリ側のスキーマ更新だけで済む。

### `content` には画像URLを直接埋め込まない

理由は次節で説明する。

### `tenant_sections` に `deleted_at` を持たせない判断

`tenants` テーブルには `deleted_at`（soft delete）があるが、`tenant_sections` には設けない。理由: セクションの「非表示」は既に `is_visible` が担っており、削除と非表示を区別する実用上のメリットが薄い。テナントが特定セクションのレコード自体を物理的に持たなくなるケース（例: 一度設定したが二度と使わない）は稀で、`is_visible = false` で十分表現できる。これは設計判断であり、運用上ニーズが出れば再検討する。

### `tenant_sections` の下書き/公開分離（`content` / `published_content`）

`tenant_sections` は 2 フィールドで下書きと公開を分離する。

```
content            jsonb NOT NULL DEFAULT '{}'   -- 下書き（管理画面の編集対象）
published_content  jsonb                         -- 公開（公開 HP が読む対象・nullable）
```

- 管理画面の編集入力は debounce（500ms〜1s）で `content` へ自動保存される（保存ボタン不要・保存インジケータ表示）。詳細は `admin-ui-lite.md` の「自動保存・下書き/公開分離」節参照
- 右下の「完了」ボタンで `content` を `published_content` へコピー = 本番公開
- 公開 HP は **`published_content` のみを読む**。`content` は管理画面のプレビューでのみ使う
- 初回公開前（`published_content` IS NULL または空 jsonb）の公開 HP 表示は、テンプレ側で「準備中」の代替表示に統一（セクションを非表示にするか、プレースホルダを出すかはテンプレの実装判断）

### 自動保存の頻度と失敗時の扱い（実装段階で詳細化）

- debounce は入力停止後 500ms〜1s 想定。負荷・UX の実測で調整
- 保存失敗時は保存インジケータを「失敗」表示にし、次回入力トリガー時に再送。実装の詳細は該当 PR（PR11+）で確定

---

## 2.1 セクション別 `content` 形状（Zod スキーマ）

12 セクションの content 形状を型別に分類する。各セクションの Zod スキーマは `src/lib/validation/`（未存在・PR11+ で新設予定）で定義する。

### 固定項目型（6 種）

```
hero          { headline, subcopy, cta_text }
concept       { title, body }
access        { map_note }                                -- address/nearest_station は tenant_site_settings から自動参照
reservation   { title, body, cta_text, line_url }         -- phone は tenant_site_settings から自動参照
campaign      { title, body, period, cta_text }
recruit_cta   { title, body, cta_text }
```

### 可変配列型（5 種）

```
features   { title, items: [{ heading, body }] }
staff      { title, members: [{ name, role, bio }] }
voice      { title, items: [{ customer_label, body }] }
faq        { title, items: [{ question, answer }] }
menu       { title, categories: [{ category_name, items: [{ name, price, description }] }] }
```

- `menu` は **2 階層**（カテゴリ配列 → 各カテゴリの品目配列）
- `menu.items[].price` は **string 型**。理由: 表記自由度（「¥5,000〜」「税抜 4,500 円」「価格応相談」等の柔軟性）。数値計算・並び替えを行わないため string で運用上十分。将来集計等の要件が出た時点で number 化を検討

### 画像主体型（1 種）

```
gallery   { title, note }                                 -- 画像本体・caption・alt は tenant_images 側
```

### 原則: `content` はテキストと構造のみ

- 色・フォント・折り返し・太さは mood / テンプレ側で管理する。**content には visual プロパティを持たせない**
- 空フィールド・空配列は表示側で自然省略（テンプレの HTML 骨格が「空なら描画しない」判定を持つ）
- 全項目 optional（Zod で `.optional()` 適用）。「必須の項目」を管理画面で明示するのは UI 側の責務であり、DB スキーマは緩く保つ

---

## 3. `tenant_images`（画像のSSOT）

画像は `tenant_sections.content` に直接埋め込まず、独立したテーブルで管理する。

```
id              uuid (PK, default gen_random_uuid())
tenant_id       uuid (FK -> tenants.id)
section_id      text        -- どのセクションで使われる画像か
image_role      text        -- 'hero_background', 'gallery_item', 'staff_photo' 等。1セクション内で画像の役割を区別する
url             text        not null
alt_text        text        -- アクセシビリティ用の代替テキスト
caption         text        -- 画面表示用の短い説明文。nullable。ギャラリー画像のキャプション等
classification  text        not null  -- 'background_atmosphere' | 'actual_content' | 'treatment_result'
source_note     text        -- 出典・同意情報。classification = 'treatment_result' の場合は実質必須（アプリ層で強制）
display_order   integer     default 0
created_at      timestamptz default now()
updated_at      timestamptz default now()
deleted_at      timestamptz （nullable, soft delete）
```

### なぜ `tenant_images` を独立させるか（3つの理由）

1. **`content-image-policy.md` の3分類を画像1枚ごとに管理するため**。`classification` を行単位で持つことで、施術結果画像かどうかを個別に判定・検索・監査できる。
2. **施術結果画像の出典・同意情報を追跡するため**。`source_note` を画像に直接紐付けることで、「この画像は誰の同意を得たか」を後から辿れる。jsonbの奥に埋もれさせない。
3. **画像差し替え時に jsonb を書き換えなくて済むため**。`tenant_images` の1行を更新・削除するだけで完結し、`tenant_sections.content` 全体を読み書きする必要がない。

### `classification` も Postgres enum を避け、`section_id` と同様に Zod でバリデーションする（`content-image-policy.md` の3分類と一致させる）。

### `deleted_at` を `tenant_images` には設ける

`tenant_sections` とは異なり、画像は「物理的に差し替えられて使われなくなる」ケースが自然に発生する（新しい写真に入れ替える等）。完全削除ではなくsoft deleteにしておくことで、誤操作からの復旧や、将来的な「画像の利用履歴」監査に対応できる。

---

## 4. `content` と画像の紐付け方針

検討した2案:

**案1: `content` jsonb の中に `image_id` を埋め込む** 
例: `{"image_id": "uuid"}` 、ギャラリーなら `{"image_ids": ["uuid1", "uuid2"]}`
→ jsonbの中にIDを持つことになり、画像が削除された際に jsonb 側との整合性をアプリ層で気にする必要が生じる（DBの外部キー制約がjsonb内部までは効かない）。

**案2: `content` から画像を完全に切り離し、`tenant_images` 側の `(tenant_id, section_id, image_role, display_order)` だけで紐付ける**（**採用**） 
`content` には画像に関する情報を一切持たせない。公開HP表示・管理画面は、あるセクションを描画する際に `tenant_sections`（テキスト系コンテンツ）と `tenant_images`（`tenant_id` + `section_id` で絞り込み、`display_order` 順に並べる）を別クエリで取得し、両方を組み合わせて描画する。

### 採用理由

「画像は `tenant_sections.content` の中に直接埋め込まない」という方針を最も厳密に満たすのは案2であり、jsonb内部にIDという形であっても画像への依存を残さない。`tenant_images` を `tenant_id + section_id` でクエリすれば必要な画像は揃うため、`content` 側が画像の存在を意識する必要が一切ない。

**ギャラリーのキャプション**は `tenant_images.caption` を使う（`alt_text` とは別途管理する）。`tenant_sections.content` 側にキャプション用の項目を別途持たない（画像に紐づくテキスト（alt_text・captionとも）は画像側に置く、という一貫した方針）。

---

## 5. RLS（Row Level Security）方針

`tenant_sections` ・ `tenant_images` はともに `tenant_id` を持つテナントスコープのテーブルであり、RLSを必須とする。**read policy と write policy を明確に分離する。**

### 公開HP表示用の read policy（想定）

- 対象ロール: `anon`（未認証の公開アクセス）
- `tenant_sections`: `is_visible = true` の行のみ SELECT を許可
- `tenant_images`: 紐づく `tenant_sections` が `is_visible = true` の `section_id` に属する画像のみ SELECT を許可（または `deleted_at is null` の画像のみを許可する形でシンプルに設計してもよい。最終形は実装時に確定）

### 管理画面用の owner/admin write policy（想定）

- 対象ロール: 認証済みユーザーのうち、当該 `tenant_id` の owner/admin であるユーザーのみ
- INSERT / UPDATE / DELETE をこの条件で許可
- **この write policy は WorkOS AuthKit によるテナント認証が完成して初めて意味を持つ。** 現時点（認証未実装）では、書き込みは Claude Code・管理者操作（service_role 経由）に限定される前提とし、エンドユーザー向けの write policy 本体は **認証実装フェーズで確定・有効化する**。

### 現時点の扱い

この節は設計のみであり、今回のドキュメント作成時点ではRLSポリシーのSQLは書かない・適用しない。`docs/future-architecture.md` の `src/lib/auth/` 前倒し実装（Phase 0b）と合わせて、write policy を実装する。

---

## 未決事項

### テンプレート変更時の挙動（確定：2 軸独立で解決）

テンプレ（HTML 骨格）と mood（CSS 変数）と content（テキスト・構造）は独立して切替可能。テンプレ変更は**表示側の骨格切替のみで content は不変**。したがってテンプレを別のパターンへ変更しても、`tenant_sections.content` / `published_content` / `tenant_images` はそのまま活きる。テンプレによって描画されないセクション（例: Menu 型を選ぶと `staff` が骨格に含まれない）が発生した場合、content は残るが表示されない状態になる。この挙動は仕様として許容し、テナントには「テンプレによってはこのセクションが非表示になります」と管理画面 UI で明示する（実装は PR11+）。

mood 変更も表示側の CSS 変数差替えのみで content 不変。`display_order` / `is_visible` を新テンプレートのデフォルトに合わせて再初期化するかどうかは、将来の切り替え UI 実装時に検討する。

---

## 次フェーズへの引き継ぎ

このDBスキーマ設計を踏まえ、次のフェーズ（認証・権限設計、その後の管理画面UI設計）では以下を決める:

1. WorkOS AuthKit のテナント認証と、本ドキュメントのRLS write policy をどう接続するか
2. `src/lib/validation/`（Zod）に `section_id` ・ `classification` の許可値リストと、セクションごとの `content` 形状（discriminated union 等）をどう定義するか
3. 管理画面が `tenant_sections` と `tenant_images` をどう同時編集するか（UIのデータフロー）
4. 初回テンプレート選択時に、選んだテンプレートのデフォルト構成（`hp-template-patterns.md` の対応表）から `tenant_sections` の初期レコードをどう生成するか（シード処理）

**このドキュメントはまだ Draft。認証・管理画面設計の議論で、テーブル構造に過不足が見つかれば、ここに戻って更新する。**

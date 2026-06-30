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

## 1. `template_type` の置き場所：A案 / B案 比較

### A案: `tenants.template_type` に直接追加

```
tenants.template_type   text
```

- メリット: 実装が最小。JOINが不要で、Phase 0bの範囲では十分動く。
- デメリット: 将来 `theme`（配色）、`seo_title`、`seo_description`、`published_at`、`custom_domain` などHP設定が増えるたびに `tenants` にカラムが増え続ける。`tenants` はテナント管理画面・認証・契約プラン等、本来HPの表示設定とは異なる責務を持つテーブルであり、肥大化すると責務が混ざる。

### B案: `tenant_site_settings` テーブルを新設

```
tenant_id       uuid (PK, FK -> tenants.id)
template_type   text
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

将来の拡張先（今は追加しない。設計上の置き場所だけ示す）:
```
theme               text      -- 配色テーマ等
seo_title           text
seo_description     text
published_at        timestamptz
custom_domain       text
```

- メリット: `tenants`（テナントの契約・機能フラグ）と `tenant_site_settings`（公開HPの表示設定）の責務が明確に分離される。HP設定が増えてもこのテーブルだけが伸びる。`tenant_id` を PK にすることで1テナント1行が保証され、JOINも単純（`tenants` と 1:1）。
- デメリット: A案よりテーブルが1つ増え、実装時にJOINが必要になる。

### 推奨: B案

理由は3つ。

1. **責務分離**: `tenants` はテナントという「契約・組織」の実体を表すテーブル、`tenant_site_settings` は「公開HPの見せ方」を表すテーブル。性質が異なるものを同じテーブルに置かない。
2. **将来の拡張に耐える**: `theme` / SEO項目 / `custom_domain` など、HP設定は今後確実に増える。B案ならこれらの置き場所が最初から決まっており、`tenants` を触らずに拡張できる。
3. **`template_type` は継続的に参照される値**（今回の合意事項）: 公開HP表示・管理画面の両方で常時参照する値なので、「テナントの公開HP設定」を表すテーブルに置く方が意味的に正しい。`tenants` に置くと「テナントの属性」なのか「HPの表示設定」なのか曖昧になる。

**コンテンツのSSOTは `tenant_sections`（次節）であり、`tenant_site_settings.template_type` はあくまで「見せ方・レイアウト選択」に限定する。** テンプレートを変えてもコンテンツ自体（テキスト・画像）は変わらない、という原則をテーブル構造でも表現する。

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

### テンプレート変更時の挙動（未確定）

テナントが一度選んだ `template_type` を後から別のテンプレートに変更した場合の挙動は、本ドキュメントでは確定しない。

**暫定方針（合意済み）:**
- コンテンツ自体（`tenant_sections.content`）は破壊しない。テンプレートを変えてもテキスト・画像のデータは保持する。
- `display_order` / `is_visible` を新テンプレートのデフォルトに合わせて再初期化するかどうかは、将来検討する。
- **Phase 0b では、初回テンプレート選択後の切り替えUIは実装しない。** テンプレートは初回選択のみを扱う。

この未決事項は、テンプレート切り替えUIを実装したくなった時点で改めて設計する（このドキュメントの Review trigger 参照）。

---

## 次フェーズへの引き継ぎ

このDBスキーマ設計を踏まえ、次のフェーズ（認証・権限設計、その後の管理画面UI設計）では以下を決める:

1. WorkOS AuthKit のテナント認証と、本ドキュメントのRLS write policy をどう接続するか
2. `src/lib/validation/`（Zod）に `section_id` ・ `classification` の許可値リストと、セクションごとの `content` 形状（discriminated union 等）をどう定義するか
3. 管理画面が `tenant_sections` と `tenant_images` をどう同時編集するか（UIのデータフロー）
4. 初回テンプレート選択時に、選んだテンプレートのデフォルト構成（`hp-template-patterns.md` の対応表）から `tenant_sections` の初期レコードをどう生成するか（シード処理）

**このドキュメントはまだ Draft。認証・管理画面設計の議論で、テーブル構造に過不足が見つかれば、ここに戻って更新する。**

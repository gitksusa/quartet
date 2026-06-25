# INC-2026-06-001 Supabase環境変数未設定による本番500エラー

## 発生日時
2026年6月

## 影響範囲
本番環境(`qrtt.jp`)の求人ページ。アクセスすると500エラーで表示できない状態だった。

## 発見経路
Google Search Consoleからの遅延通知でクラッシュを検知。ローカル環境では問題なく動作していた。

## 原因
Vercel側で環境変数(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)が実際には保存されていなかった。コード側で `process.env.XXX!` のようにTypeScriptのNon-null assertionを使っていたため、値が `undefined` になった際にライブラリ内部で分かりにくいクラッシュが発生していた。

## 対応

1. Vercelの環境変数を再設定し、Build Cacheを使わずにクリーンデプロイを実行
2. Supabaseクライアントの初期化処理を修正し、環境変数の存在確認を明示的に行うよう変更

\`\`\`ts
if (!url || !anonKey) {
  throw new Error('Supabase environment variables are missing in server/client!');
}
\`\`\`

3. `feature/susa/fix-supabase-env` ブランチを作成し、developを経由してmainへhotfixを適用

## 再発防止

- 環境変数読み込みはNon-null assertion(`!`)を使わず、明示的な存在チェックとFail-Fastを行う方針に統一
- Vercel環境変数の保存後はダッシュボードで反映状態を確認する
- 環境変数変更後はBuild Cacheを使わないクリーンデプロイを行う

## 学んだこと

- 本番障害はコードだけでなく環境差分も疑う
- Non-null assertion(`!`)は環境変数では使用しない
- Fail-Fastにより原因特定時間を短縮できる

## 関連

- `docs/learning/001_hp_foundation.md`
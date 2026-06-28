# AGENTS.md

このプロジェクトの単一の真実は `/CLAUDE.md` です。

コードを変更する前に、必ず `/CLAUDE.md` を読み、そこに書かれた決定・禁止事項に従ってください。
設計判断の詳細は `/CLAUDE.md` 内で示されたタイミングで `.claude/playbooks/` を参照してください。

**このファイルは規範を保持しません。`/CLAUDE.md` への導線のみを保持します。**
このファイルにルールや禁止事項を直接書き加えないこと。

## Next.js 特有の注意

<!-- BEGIN:nextjs-agent-rules -->
This version of Next.js may have breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

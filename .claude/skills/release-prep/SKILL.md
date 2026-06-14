---
name: release-prep
description: tegakari（Chrome拡張）のリリース準備を行う。未マージのfeat/fix PRの取り込み確認、package.jsonのバージョン更新（公開済みより大きく）、pnpm packageによるZIP生成、追加機能に基づくREADME.md / README.ja.md / docs/store-listing.md の更新までを一括で進める。「リリース準備して」「ストアに出す準備」「バージョン上げてpackage」「新機能をREADME/ストアに反映」などのときに使う。
---

# tegakari リリース準備

Chrome ウェブストアへ公開する前の準備作業をまとめたワークフロー。毎回のリリースで以下を順に実施する。

## 0. 前提

- パッケージマネージャーは **pnpm**
- バージョンは `package.json` の `version` を更新すれば Plasmo が `build/chrome-mv3-prod/manifest.json` に反映する（manifestを直接編集しない）
- ストアは「新パッケージのバージョンが公開済みより大きい」ことを要求する。エラー例: 「マニフェストのバージョン番号が無効です（x.x.x）」

## 1. リリース対象の変更を把握する

```bash
git log --oneline -25
gh pr list --state open --limit 30
```

- 前回リリース以降の `feat:` / `fix:` コミットを洗い出す
- 未マージPRのうちリリースに含めるべきものを確認する。**マージは外向き・不可逆寄りの操作なので、含めるか必ずユーザーに確認してから** `gh pr merge <N> --merge` する
- マージしたら `git checkout main && git pull` で最新化

## 2. バージョンを上げる

- 公開済みバージョンより大きくする（通常はパッチを +1。例: `0.0.2` → `0.0.3`）
- 一度ストアにアップロード（公開でなくても）したバージョン番号は再利用できない点に注意
- 編集対象は `package.json` の `"version"` のみ

## 3. パッケージング

```bash
pnpm package   # plasmo build --zip → build/chrome-mv3-prod.zip
```

- 完了後、`build/chrome-mv3-prod/manifest.json` の `"version"` が意図通りか、`build/chrome-mv3-prod.zip` が更新されたかを確認する
- この ZIP をデベロッパーダッシュボードにアップロードする

## 4. ドキュメントを新機能で更新する

リリースに含めた機能を、以下の3ファイルすべてに反映する。

| ファイル | 更新箇所 |
|---|---|
| `README.md`（英語） | Features / Usage（Toolbar・Inbox手順）/ 出力例（Markdown・JSONL） |
| `README.ja.md`（日本語） | 同上 |
| `docs/store-listing.md` | 「主な機能」リスト / 詳細な説明 / 必要なら短い説明 |

注意点:

- **出力例は実装と一致させる**。出力の正規の仕様は `docs/output-spec.md`、実際の生成は `src/lib/jsonl-generator.ts` / `src/lib/markdown-generator.ts`。新フィールドを追加したら例にも反映する（例: `element.styles`、`component.source`）
- UIラベルは実装の `title` 文言に合わせる（例: ツールバーの「Copy Image」、Inboxの import/export）
- README は英語版・日本語版で**同じ機能セットを記載**し、内容を揃える

## 5. 仕上げ確認

- `pnpm lint` / `pnpm test` が通ること（必要に応じて）
- 変更（version・docs）のコミットはユーザーの指示があるときのみ行う。CLAUDE.md のコミット規約（1コミット1関心、テスト同梱）に従う

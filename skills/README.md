# Skills

tegakari に同梱する [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills)。
[`gh skill`](https://cli.github.com/)（GitHub CLI v2.90.0+ のサブコマンド）でインストールできる。

## 提供スキル

| スキル | 用途 |
|---|---|
| [`tegakari-prefix-rules`](./tegakari-prefix-rules/SKILL.md) | URL パターン → リポジトリ対応づけ（Prefix Rules）の JSON を、正規表現の知識ゼロでも対話形式で生成・取り込みする |
| [`tegakari-fix`](./tegakari-fix/SKILL.md) | 貼り付けられた tegakari 出力（JSONL / Markdown / `<tegakari-output>` XML）を正しくパースし、対象要素のソースコードを特定して修正し、修正後に検証する（消費側スキル） |

## インストール

`gh skill` が使える環境（GitHub CLI v2.90.0 以降）で:

```bash
# プロジェクト単位（カレントリポジトリの .claude/skills に配置）
gh skill install iemong/tegakari tegakari-prefix-rules --agent claude-code --scope project
gh skill install iemong/tegakari tegakari-fix --agent claude-code --scope project

# ユーザー単位（ホームディレクトリの ~/.claude/skills に配置。どのプロジェクトでも使える）
gh skill install iemong/tegakari tegakari-prefix-rules --agent claude-code --scope user
gh skill install iemong/tegakari tegakari-fix --agent claude-code --scope user
```

`--agent` は利用エージェントに合わせて変更する（`claude-code` / `cursor` / `codex` / `gemini` など）。

インストール前に中身を確認したいときは:

```bash
gh skill preview iemong/tegakari tegakari-prefix-rules
gh skill preview iemong/tegakari tegakari-fix
```

> `gh skill install` は **GitHub 上に push されたコミット** から取得する。リポジトリのデフォルトブランチに反映されてからインストールできる。

## 使い方

### tegakari-prefix-rules

インストール後、エージェント（Claude Code など）に「tegakari のプレフィックス（URL とリポジトリの対応づけ）を設定したい」と伝えるとスキルが起動する。
アプリの URL とリポジトリ名を答えていくだけで、Options 画面の **Prefix Rules → Import** に取り込める JSON が生成される。正規表現を書く必要はない。

### tegakari-fix

インストール後、tegakari でコピーした出力（JSONL / Markdown / `<tegakari-output>` XML のいずれか）をエージェントに貼り付けて「この通り直して」と伝えるとスキルが起動する。
出力のスキーマを解析し、`instruction` を唯一の要望として対象要素のソースファイルを特定（source location → コンポーネント名 → class/data 属性 → テキスト内容 → 親コンポーネントの順にフォールバック）した上で修正し、最後にアノテーションごとの「指示 → 変更ファイル → 満たしたか」の検証表を提示する。

## ディレクトリ構成

```
skills/
├── tegakari-prefix-rules/
│   ├── SKILL.md            # スキル本体（frontmatter: name / description / license）
│   └── agents/
│       └── openai.yaml     # Codex / OpenAI 系エージェント向けの表示メタデータ
└── tegakari-fix/
    ├── SKILL.md            # スキル本体（frontmatter: name / description / license）
    └── agents/
        └── openai.yaml     # Codex / OpenAI 系エージェント向けの表示メタデータ
```

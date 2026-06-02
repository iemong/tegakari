---
name: tegakari-prefix-rules
description: tegakari Chrome 拡張の「URL パターン → リポジトリ対応づけ（Prefix Rules）」JSON を、正規表現の知識ゼロでも対話形式で生成・取り込みする。非エンジニアが「どの URL で動くか」「リポジトリ名は何か」を答えるだけで、ホスト名ルール（正規表現不要）や必要時の正規表現ルールを自動生成し、Options 画面で Import 可能な JSON を出力する。Use when setting up, editing, or troubleshooting tegakari prefix rules / URL-to-repository mapping.
license: MIT
---

# tegakari Prefix Rules ジェネレーター

## このスキルの目的

tegakari は、コピー出力の先頭に「どのリポジトリのページか」を示すプレフィックス（例: `[repo=my-app]`）を自動付与できる。どのプレフィックスを付けるかは **Prefix Rules**（URL パターン → プレフィックスの対応表）で決まる。

問題は、Prefix Rules の「正規表現マッチ」を使うには正規表現の知識が要ること。**非エンジニアは正規表現が書けないため、自分でカスタマイズできない。** このスキルは、対話形式の質問に答えてもらうだけで、正しい Prefix Rules の JSON を生成し、取り込み手順まで案内する。

## 絶対の大原則

- **ユーザーに正規表現を書かせない・尋ねない。** 「正規表現」「regex」「パターン」という言葉をユーザーへの質問に使わない。聞くのは「どの URL で動くか」「リポジトリ名は何か」「パスごとに分けたいか」だけ。
- **正規表現が必要かどうかは、こちら（エージェント）が判断する。** ほとんどのケースはホスト名マッチで足り、正規表現は不要。
- **正規表現が必要なときは、こちらが生成する。** 後述の変換表に沿って機械的に作り、ユーザーには「こういうルールになります」と日本語で説明する。

## ステップ 1: 対話で情報を集める

次を、平易な言葉で順に聞く（必要な分だけ）。

1. **アプリはどの URL で動いていますか？** 複数あれば全部。例を添えて聞く:
   - ローカル開発: `http://localhost:3000`
   - ステージング: `https://staging.example.com`
   - 本番: `https://app.example.com`
   - プレビュー: `https://xxx.vercel.app` など
   URL をそのまま貼ってもらえれば OK（こちらでホスト名を取り出す）。
2. **その URL に対応するリポジトリ名は？** 例: `my-app`, `web-frontend`。
   - 複数 URL が同じリポジトリなら、その旨を確認する。
3. **同じサイトの中で、ページ（パス）によって別のリポジトリに分けたいですか？**
   - 例: `example.com` 全体は `main-site` だが、`example.com/admin` 以下だけ `admin-panel`。
   - 「はい」のときだけ正規表現ルールが必要になる（こちらで生成する）。

## ステップ 2: ルールを組み立てる

各ルールは次の 3 フィールドを持つ JSON オブジェクト。

| フィールド | 必須 | 内容 |
|---|---|---|
| `pattern` | ✅ | マッチ対象。ホスト名、または正規表現 |
| `prefix` | ✅ | マッチ時に付与する文字列。慣例は `[repo=<リポジトリ名>]` |
| `isRegex` | 任意 | `true` のときだけ `pattern` を正規表現として扱う。省略＝ホスト名マッチ |

`prefix` は `[repo=my-app]` の形式で作る（README の慣例）。

### 2-A. ホストモード（正規表現は不要・これがデフォルト）

ユーザーが URL を 1 つ挙げたら、そこから**ホスト名（ポート込み）だけ**を取り出して `pattern` にする。`isRegex` は付けない。

| ユーザーが言った URL | `pattern`（ホスト名） |
|---|---|
| `http://localhost:3000/dashboard` | `localhost:3000` |
| `https://app.example.com` | `app.example.com` |
| `https://staging.example.com/foo` | `staging.example.com` |
| `https://my-app.vercel.app` | `vercel.app` ※後述 |

ホストモードの重要な性質（ユーザーに説明してよい）:

- **サブドメインも自動でマッチする。** `example.com` は `www.example.com` や `app.example.com` にもマッチする。だから「本番もステージングも同じ `example.com` ドメイン」なら、`example.com` 1 行で両方カバーできることが多い。
- **プレビュー URL も 1 行でカバーできる。** Vercel のプレビューは `my-app-git-xxx.vercel.app` のように毎回変わるが、ホスト名 `vercel.app` にすればすべての `*.vercel.app` にマッチする（正規表現不要）。Netlify なら `netlify.app`。
- **ポート番号はホストの一部。** `localhost:3000` と `localhost:8080` は別物として扱われる。

> 補足: ホストモードでサブドメインまで広く拾えるため、「環境ごとに URL が違うだけ（パスは関係ない）」ケースは **すべて正規表現なしで書ける**。正規表現に進むのは次の 2-B のときだけ。

### 2-B. 正規表現モード（パスで分けたいときだけ・こちらが生成する）

「同じホストなのに、URL のパスによって別リポジトリにしたい」ときだけ正規表現が必要。ユーザーに正規表現を書かせず、次の手順で**こちらが生成する**。

生成ルール（機械的に適用する）:

1. ベースの形は `https?://<ホスト名>/<パス先頭>.*` とする（プロジェクト同梱の推奨例 `https?://staging\.example\.com/app/.*` と同じ書き方）。
2. **ホスト名とパスに含まれる `.` はすべて `\.` にエスケープする。** これが最重要。tegakari は正規表現を URL 全体に対して（アンカー無しの `test()` で）照合するため、`.` を生のままにすると意図しない文字にマッチする。
3. JSON ファイルに書くときは、`\.` を **`\\.`** と二重バックスラッシュで書く（JSON 文字列のエスケープ規則のため）。`isRegex` は `true` にする。

正規表現の入力 → 出力の対応例（そのまま真似してよい）:

| ユーザーの要望 | 生成する `pattern`（＝ JSON に書く文字列） | `isRegex` |
|---|---|---|
| `example.com/admin` 以下だけ別扱い | `https?://example\\.com/admin.*` | `true` |
| `example.com/blog` 以下だけ別扱い | `https?://example\\.com/blog.*` | `true` |
| `staging.example.com/app` 以下だけ | `https?://staging\\.example\\.com/app/.*` | `true` |
| `localhost:3000/admin` 以下だけ | `https?://localhost:3000/admin.*` | `true` |

注意:
- `localhost` や `:3000`（ポート）には `.` が無いのでエスケープ不要。エスケープするのは `.` だけ。
- 上の `pattern` は「そのパスで**始まる**すべての URL」にマッチする（例: `https?://example\\.com/admin.*` は `/admin` も `/admin/users` もマッチ）。これで通常は十分。

## ステップ 3: ルールの並び順（first match wins）

tegakari はルールを**上から順に評価し、最初にマッチした 1 件だけ**を使う。したがって:

- **具体的なルール（正規表現・パス指定）を先に、広いルール（ホスト名だけ）を後に置く。**
- 逆順にすると、広いルールが先にマッチして具体ルールが永遠に使われない。

例: `example.com` 全体は `main-site`、ただし `/admin` 以下は `admin-panel` の場合、`/admin` の正規表現ルールを**必ず上**に置く。

```json
[
  { "pattern": "https?://example\\.com/admin.*", "prefix": "[repo=admin-panel]", "isRegex": true },
  { "pattern": "example.com", "prefix": "[repo=main-site]" }
]
```

## ステップ 4: 出力スキーマと自己チェック

最終成果物は、ルールオブジェクトの **JSON 配列**。出力前に必ず検証する:

- ルートは `[]`（配列）であること。
- 各要素に `pattern`（空でない文字列）と `prefix`（空でない文字列）があること。
- `isRegex: true` の要素の `pattern` は、`new RegExp(pattern)` が成立する正しい正規表現であること（壊れた正規表現は取り込み時にスキップされる）。
- 並び順が「具体 → 広い」になっていること（ステップ 3）。
- キーの順序は `pattern` → `prefix` → `isRegex` に揃え、インデント 2 スペースで整形する（エクスポート時と同じ体裁で差分が読みやすい）。

## ステップ 5: tegakari に取り込む（Import 手順）

生成した JSON は、**ファイルとして保存して Options 画面からアップロード**する（テキストの貼り付け欄ではなく、ファイル選択方式）。ユーザーに次を案内する:

1. 生成した JSON を `tegakari-prefix-rules.json` という名前で保存する（拡張子 `.json`）。
   - エージェントが手元にファイルを書き出せる場合は書き出してパスを伝える。
2. ブラウザ右下のツールバーの設定アイコン（⚙）から **Options ページ** を開く。
3. **Prefix Rules** セクションの **Import** ボタンを押し、保存した `.json` ファイルを選ぶ。
4. 取り込み結果が表示される（「Imported N rule(s).」など）。同じ `pattern` の既存ルールは上書き、新しい `pattern` は末尾に追加される。
5. 取り込み後、`Pattern` の並び順が「具体 → 広い」になっているか画面で確認する。必要なら各行の上下ボタンで並べ替える。

> 取り込み時、`pattern` と `prefix` が揃っていない要素や壊れた正規表現は自動でスキップされ、警告が表示される。

## 完全な例（対話 → 成果物）

ユーザー回答の例:
- 「ローカルは `http://localhost:3000` で、リポジトリは `my-app`」
- 「本番は `https://app.example.com`、これも `my-app`」
- 「ただし本番の `/admin` 以下は管理画面の別リポジトリ `my-admin` にしたい」

生成する JSON（保存して Import する内容）:

```json
[
  { "pattern": "https?://app\\.example\\.com/admin.*", "prefix": "[repo=my-admin]", "isRegex": true },
  { "pattern": "localhost:3000", "prefix": "[repo=my-app]" },
  { "pattern": "app.example.com", "prefix": "[repo=my-app]" }
]
```

ユーザーへの説明（日本語で添える）:
- `localhost:3000` と `app.example.com` は **ホスト名マッチ**（正規表現なし）。`app.example.com` はサブドメインも自動でカバーします。
- `/admin` 以下だけは管理画面リポジトリに分けたいので、**1 行だけ正規表現**を使い、確実に効くよう **一番上**に置きました。

## 参考: スキーマ仕様（早見表）

```jsonc
// Prefix Rules ファイルの形式（PrefixRule[]）
[
  {
    "pattern": "example.com",   // 必須。ホスト名 or 正規表現
    "prefix": "[repo=my-app]",  // 必須。出力先頭に付与される文字列
    "isRegex": true             // 任意。true のときだけ pattern を正規表現として URL 全体に照合
  }
]
```

- ホストモード（`isRegex` 省略）: `pattern` を `URL.host` と照合。完全一致、またはサブドメイン一致（`host` が `.pattern` で終わる）。ポートはホストの一部。
- 正規表現モード（`isRegex: true`）: `new RegExp(pattern).test(url)` を URL 全体に対して実行（アンカー無し）。`.` のエスケープ（JSON では `\\.`）が正確さの鍵。
- 評価順: 上から順、最初の 1 件のみ採用（first match wins）。

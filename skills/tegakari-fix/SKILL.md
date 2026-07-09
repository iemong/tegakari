---
name: tegakari-fix
description: tegakari Chrome 拡張がクリップボードに出力するアノテーション（JSONL / Markdown / <tegakari-output> XML）を正しくパースし、対象要素のソースコードを特定し、instruction どおりに修正し、修正後に検証する。出力を我流で読むとソース特定精度がぶれるため、パーススキーマ・ソース特定のフォールバック手順・修正後の検証チェックリストを型として与える。Use when the user pastes tegakari output (JSONL, Markdown, or <tegakari-output> XML) and wants the described UI changes applied to the codebase.
license: MIT
---

# tegakari-fix

## このスキルの目的

tegakari は Web ページ上の要素にアノテーション（指示付きピン）を付け、要素のコンテキスト（セレクター・コンポーネント階層・スタイル差分・スクリーンショット）を JSONL/Markdown でクリップボードにコピーする Chrome 拡張。貼り付けられた出力を我流で読むと、どのソースファイルを直すべきかの特定精度がぶれ、`instruction` 以外の情報（現状の値）を「あるべき値」と誤読して的外れな修正をしがち。このスキルは「パース → ソース特定 → 修正 → 検証」の手順を固定する。

## 1. パース知識

### 1-1. 形式の見分け方

- 1行目が `[repo=...]` の角カッコ書き → Prefix Rules によるプレフィックス。以降の本体を見る
- `<tegakari-output version="1" preset="claude-code">` を含む → claude-code XML プリセット
- 各行が独立した `{...}` JSON → JSONL
- `## Page Context` や `## Annotation #N` の見出し → Markdown

**重要**: 実際に UI からクリップボードへコピーされる出力は、ピンを1つだけコピーした場合でも常に「バッチ（アノテーション配列）」形式である。`## Annotation #1` / `{"type":"annotation","id":1,...}` のように **id 付きで1件だけ** 入る。`## User Instruction` + `## Selected Element` のような単一オブジェクト形式（`id` を持たない）は現行 UI からは出力されない旧仕様。見かけたら別バージョン/別経路の出力の可能性を疑う。

### 1-2. プレフィックス行

最初の非空行（または JSONL の `{"type":"prefix","content":"..."}`）が `[repo=my-app]` なら、それは**対象リポジトリの指定**。個々のアノテーションへの指示ではない。現在作業中のリポジトリと異なる場合は 3 章の実行規律に従う。

### 1-3. Markdown 形式のスキーマ

- `## Page Context`（1回のみ）: URL, Framework, Meta Framework（あれば）, Page Title, Viewport/Language/User Agent（バッチ時のみ）
- `## Annotation #N`（アノテーションごとに繰り返し）:
  - `**Instruction**: ...`（自由入力。空なら行自体が省略される）
  - `**Tags**: spacing, color`（クイック指示チップ。定型カテゴリ `spacing`/`color`/`text`/`size`/`align`/`remove` の組み合わせで、instruction の分類ヒント。無ければ行ごと省略）
  - `**Style changes**:`（あれば）インデント配下に `property: before → after`（例: `margin: 16px → 8px`）。1-6 参照
  - `- **Selector**:` 祖先方向へ `>` で辿った一意な CSS セレクターパス
  - `- **Tag**:` `<tag>`
  - `- **Text**:` `innerText`（空なら省略）
  - `- **Attributes**:` インデント配下に `key: value`（class, id, data-*, role, aria-*, name, type, href 等。class に Tailwind ユーティリティが並ぶこともある）
  - `- **Styles**:`（あれば）computed style とタグデフォルトの diff。1-6 の注意点を参照
  - `- **CSS Rules**:` / `- **CSS Variables**:`（あれば）マッチした同一オリジンCSSルールの出所（セレクタ・ファイル名・宣言・@media条件）と、参照された `var(--x)` の解決値。スタイル修正のソース特定における最優先の手がかり（2章参照）
  - `- **Component**:` `Root → ... → Leaf` の階層（ルート→末端の順）
  - `- **Source**:` `path/to/file.tsx:42`（取得できた場合のみ。無いことが多い）
  - `- **Props**:` `{ key: value, ... }`
  - `- **State**:`（React）/ `- **Data**:`（Vue）
- `## Relations`（**バッチ出力のみ**。リレーションが1件もなければ節ごと省略）: 全 `## Annotation` の後に `- [#1 ↔ #2] instruction` の形で1件1行

tegakari の出力に DOM 構造のスナップショット（親要素・兄弟要素を含む周辺HTML）は含まれない。ソース特定は selector・component 階層・text・cssRules 等の手がかりのみで行う（2章）。

### 1-4. JSONL 形式のスキーマ

1行1 JSON。

- `{"type":"prefix","content":"[repo=...]"}`（あれば先頭）
- `{"type":"pageContext","url":...,"pageTitle":...,"framework":...,"metaFramework":...,"viewport":...,"language":...,"userAgent":...}`（1回のみ）
- `{"type":"annotation","id":N,"instruction":...,"tags":["spacing",...],"styleDelta":[{"property":...,"before":...,"after":...}],"element":{"selector":...,"tag":...,"text":...,"attributes":{...},"styles":{...},"cssRules":[{"selector":...,"source":...,"declarations":[...],"media":...}],"customProperties":{"--x":...}},"component":{"framework":"react"|"vue","hierarchy":[...],"source":"file:line","props":{...},"state":{...}|"data":{...}}}`
- `{"type":"relation","id":N,"from":N,"to":M,"instruction":...}`（**バッチ出力のみ**。リレーションがあれば `annotation` 行群の後）

`instruction` / `tags` / `styleDelta` / `element.text` / `element.styles` / `element.cssRules` / `element.customProperties` / `component` / `component.source` は値がある場合のみキーが存在する（`null` では来ず、キーごと省略される）。

### 1-5. claude-code XML プリセット（`<tegakari-output>`）

claude-code プリセット選択時の出力。**不変の契約はマーカー行 `<tegakari-output version="1" preset="claude-code">` そのもの**（このスキルの自動起動トリガーの一つ。生成側は `src/lib/xml-generator.ts` の `CLAUDE_CODE_MARKER` で、変更時は両者を同期させる）。構造:

```
<tegakari-output version="1" preset="claude-code">
<page-context>...</page-context>
<annotation id="1">
<instruction>...</instruction>     <!-- 無ければタグごと省略 -->
<tags>spacing, color</tags>        <!-- クイック指示チップ。無ければ省略 -->
<style-changes>...</style-changes> <!-- styleDelta。無ければ省略。<style-diff>とは別物（1-6参照） -->
<element>...</element>              <!-- selector/tag/text/attributes + CSS Rules/CSS Variables（あれば）。Stylesは含まない -->
<component>...</component>          <!-- フレームワーク未検出なら省略 -->
<style-diff>...</style-diff>        <!-- 差分が無ければ省略 -->
</annotation>
<relation id="1" from="1" to="2">...</relation>  <!-- バッチ出力のみ。リレーションがあれば </annotation> 群の後・</tegakari-output> の前 -->
</tegakari-output>
```

各タグの中身は対応する Markdown セクションと**同等の情報量**を「見出し無し・key: value」の行で持つ。1件だけコピーした場合も `<annotation id="1">` が1つだけ入る（batch と同じ構造）。タグ名・キー名は実装のマイナーな揺れがあり得るため、完全一致より意味で読むこと。

### 1-6. 誤読しやすい点（重要）

- **`instruction` が唯一の要望。** Component / Props / Style-diff / DOM 構造はすべて「対象を特定するための手がかり」。例えば Props に `disabled: false` とあっても「disabled を false にしろ」という指示ではない。
- **Styles / style-diff は「今の computed style」であって「あるべき値」ではない。** タグデフォルトとの差分であり、`padding: 8px 16px` はあくまで現状値。ユーザーが求めるのは instruction に書かれた変更（例:「余白を詰めて」）であり、diff の値をそのまま書き写すのが目的ではない。
- **`styleDelta`（Style changes）は逆に「あるべき値」そのもの。** Tags・Props・Styles/style-diff が「対象特定や現状把握のための手がかり」なのに対し、Style changesパネル経由の `styleDelta`（Markdown: `**Style changes**:` / XML: `<style-changes>` / JSONL: `styleDelta`）はユーザーがプレビューを見ながら明示的に確定させた「変更後の正確な値」。`property: before → after` の `after` をそのまま実装してよい。既存の `<style-diff>`/`Styles`（＝現状の computed style diff）と意味が逆なので混同しないこと。
- **`relations`（Relations）は2アノテーションにまたがる指示。** `{"type":"relation","from":N,"to":M,...}` / `## Relations` の `- [#N ↔ #M] ...` / `<relation id from to>` はいずれも `from`/`to` の2つの `Annotation.id` を指す。**両方のアノテーションが指す要素を先に特定してから**、リレーションの指示（例:「間隔を揃えて」「同じ幅に」）を適用する。片方だけ直して終わらない。
- **`[repo=...]` は出力全体の対象リポジトリ指定。** 個々のアノテーションへの指示ではない。
- **Source location はしばしば欠落する。** prod ビルドでは取得不可、React 19 では `_debugSource` 自体が削除済み。「あれば使う」ではなく、**無いことを前提としたフォールバック（2章）が主経路**。
- **Props/State/Data は簡略化・省略されうる。** シリアライズは深度・キー数・配列長を制限するため、`[Circular]` や `...`（省略マーカー）、`fn`（関数値のプレースホルダ）が混じることがある。これらは実データではない。

## 2. ソース特定戦略

原則: **見つかるまで段階的に狭める。1つの手がかりで確信を持てないなら次の手がかりで裏取りする。**

0. **Source location があれば直行。** `path/to/file.tsx:42` は JSX の記述位置。ただし行番号がずれる／存在しないファイルを指すこともあるため、開いた箇所が selector/text と矛盾しないか確認してから編集する。

0-b. **スタイル変更の指示（「余白を詰めて」「色を変えて」等）なら `cssRules` を最優先で使う。** `element.cssRules`（Markdown: `- **CSS Rules**:` / JSONL: `element.cssRules` / XML: `<element>` 内）には、選択要素に実際にマッチしたCSSルールの出所（ファイル名・セレクタ・宣言）がそのまま入っている。これは grep で探すまでもなく「どのファイルのどのセレクタを直せばよいか」の事実情報なので、(a)〜(d) の探索より先に該当ファイル・セレクタを直接開く。宣言値に `var(--x)` があれば `customProperties` の解決値も併せて確認し、必要ならCSS変数の定義元も辿る。`cssRules` が無い・要素に一致しない場合のみ (a) 以降にフォールバックする。

Source が無い場合、または矛盾がある場合は次を順に試す（前段で候補ゼロなら次段へ、複数候補が残れば後段の手がかりで絞り込む）。

**(a) コンポーネント名で grep。** `component.hierarchy` の末尾（最も具体的な名前）を優先。命名バリエーションを考慮する:
- ファイル名: `MetricCard.tsx` / `metric-card.tsx` / `MetricCard/index.tsx`
- 拡張子: `.tsx` `.jsx` `.vue` `.ts`（Vue はコンポーネント自体が `.vue`）
- PascalCase 名は kebab-case ファイル名にもなりうる（`MetricCard` → `metric-card.tsx`）

**(b) 特徴的な class 名・data 属性で検索。** `attributes` のうち Tailwind 等の汎用ユーティリティ（`px-4`, `flex`, `text-sm`）は除外し、意味のある名前（`metric-value`, `btn-primary`, `data-testid` の値）を優先して grep する。CSS Modules ではハッシュ付きクラス名（`Button_root__a1b2c`）で来ることがあるため、ハッシュ前の部分（`root`）や対応する `*.module.css` 内のセレクタで検索する。

**(c) 要素のテキスト内容で検索。** `element.text` の一部（日本語含む）を JSX/テンプレート内のリテラルとしてそのまま grep する。i18n されている場合はキー文字列も併せて検索する。

**(d) DOM 階層の親コンポーネント名で絞り込み。** `component.hierarchy` は「ルート→末端」の順。末端で見つからない・複数ヒットする場合は1つ手前の親コンポーネント名でファイルを絞り、そのJSX/テンプレート内から selector/attributes に一致する要素を探す。

複数候補が残ったときの絞り込み:
- `hierarchy` の親子関係と実際のファイルの import/JSX ネストが一致するかで消去法にかける
- `selector` の nth-child 位置や属性の組み合わせ（class + data-testid など）で一意化する
- それでも一意化できなければ候補を全部提示し、ユーザーに確認する（推測で直さない）

### 解析からソース特定までの例

貼り付けられた JSONL の1行:

```jsonl
{"type":"annotation","id":1,"instruction":"Stream this revenue figure live over a websocket and animate changes.","element":{"selector":"#root > div.app > div.main > div.content > section.metrics > div:nth-child(1) > div.metric-value","tag":"div","text":"$48,290","attributes":{"class":"metric-value"}},"component":{"framework":"react","hierarchy":["App","DashboardLayout","MetricsGrid","MetricCard"],"props":{"delta":"12.4%","title":"Monthly revenue","value":"$48,290"}}}
```

1. `component.source` が無い → 0番はスキップし (a) から着手。
2. (a) `hierarchy` 末尾 `MetricCard` で grep → `src/components/MetricCard.tsx` が1件ヒット。
3. ファイル内の JSX を確認し、`value` prop を表示する `div` に `metric-value` クラス（(b) の裏取り）と `"$48,290"` 相当のフォーマット済みテキスト（(c) の裏取り）が付くことを確認 → 特定完了。
4. `instruction` は「この売上表示をリアルタイム更新にしたい」であって、`props.value` を書き換えろという意味ではない。`props`/`delta`/`title` は特定・文脈確認のための手がかりに過ぎないので、実装は websocket 購読とアニメーションの追加にとどめる。

## 3. 実行規律

- **アノテーション ID ごとに独立した修正として扱う。** あるIDの指示を満たすための変更に、別IDの指示を混ぜない。コミットを分ける場合はアノテーション単位を基本とする（ただし明示のコミット依頼がない限り勝手にコミットしない）。
- **`[repo=...]` が現在作業中のリポジトリと異なる場合は止まって確認する。** 別リポジトリ宛の指示を誤って現在のコードベースに適用しない。
- **スタイル修正はプロジェクトの実装手法を検出してから合わせる。** 編集対象周辺を見て、CSS Modules（`*.module.css` + `styles.xxx`）/ Tailwind（クラス文字列）/ styled-components / プレーン CSS のいずれかを判定し、その作法に沿う。`cssRules`（2章 0-b）があればそれが実ファイル・実セレクタの一次情報なので優先する。変更後の値は、`styleDelta`（Style changes）があればその`after`をそのまま使い、無ければ`style-diff`（現状値の参考情報に過ぎない）ではなく instruction とプロジェクトの既存スタイル・デザイントークンとの整合から決める。
- **Relations は関連する2アノテーションをまたぐ例外。** `from`/`to` が指す2つのアノテーションIDの要素を両方特定・修正してから、リレーションの指示を満たしたかを判断する（1-6参照）。
- 複数アノテーションにまたがる共通コンポーネントを触る場合、他アノテーションの指示を壊していないか変更後に確認する。

## 4. 検証チェックリスト

全アノテーションの処理後、必ず結果表を出力する。

| ID | 指示 | 変更ファイル | 満たしたか |
|---|---|---|---|
| 1 | ... | `src/components/MetricCard.tsx` | ✅ 満たした |
| 2 | ... | — | ⚠️ 未対応（理由: ソース特定できず） |

- 「満たしたか」列は `✅ 満たした` / `⚠️ 未対応・要確認` / `❓ 判断保留` のいずれかを明示する。
- 未対応・判断保留の ID は、理由（ソースが特定できなかった、指示が曖昧、既存実装と衝突する等）を添えてユーザーに確認する。**沈黙して省略しない。**
- 可能であれば `pnpm lint` / `pnpm test` / 型チェックなど、プロジェクトの品質ゲート（リポジトリの `CLAUDE.md` 参照）を通してから表を提示する。

# tegakari

Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdownまたはJSONL形式で生成するChrome拡張機能です。

生成したテキストをクリップボードにコピーし、AIエディタ（Claude Code、Cursorなど）に貼り付けて活用できます。

## 機能

- ページ上の複数要素をクリックして選択・アノテーション
- 選択要素にピンマーカーを表示し、ピン横のポップオーバーで指示テキストを入力
- 要素クリック時にスクリーンショットを自動キャプチャ（要素周辺をクロップ）
- 選択要素のHTML情報（タグ、属性、テキスト）を取得
- React / Vue のコンポーネント階層・Props・Stateを自動検出
- Next.js / Nuxt などのメタフレームワークを検出
- ページメタデータ（Viewport、UserAgent、Language）を自動収集して出力に含める
- JSONL / Markdown 形式を切り替えてクリップボードにコピー
- URL パターン別のプレフィックス設定（例: `[repo=my-app]`）
- アノテーションをURL単位で永続化（最大50件、ページ再読み込み後も復元）
- アノテーションのアーカイブ管理（Active / Archived）
- Dark / Light テーマ切り替え対応

## 導入方法

### ビルド済みを使う（推奨）

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/iemong/pick-con.git
   ```

2. Chromeで `chrome://extensions` を開く

3. 右上の「デベロッパーモード」を有効にする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. クローンしたリポジトリ内の `build/chrome-mv3-prod` フォルダを選択

### ソースからビルドする場合

```bash
git clone https://github.com/iemong/pick-con.git
cd pick-con
pnpm install
pnpm build
```

ビルド後、上記と同様に `build/chrome-mv3-prod` を Chrome に読み込んでください。

## 使い方

1. 任意のWebページで拡張機能アイコンをクリック（カーソルが十字に変わります）
2. 調べたい要素にマウスを合わせるとハイライト表示されます
3. 要素をクリックすると、ピンマーカーが配置されポップオーバーが開きます
4. ポップオーバー内で指示テキストを入力し、**Save** または `Cmd+Enter` で保存します
5. 複数の要素を続けてクリックすることで、複数要素を同時にアノテーションできます
6. 画面下部のツールバーで操作します：
   - **Inbox**: アノテーション一覧の表示（Active / Archived タブ切替）
   - **Copy**: 全アノテーションをクリップボードにコピー
   - **JSONL / MD**: 出力形式の切り替え
   - **テーマ切替**: ダーク / ライトモード
   - **設定**: プレフィックスルールの管理（Options ページ）
7. Inbox 内の各項目にはコピーボタン（単体コピー）とアーカイブボタンがあります
8. AIエディタに貼り付けて活用してください
9. `Esc` キーでツールバーを閉じます（アノテーションは保持されます）

### プレフィックス設定

ツールバーの設定アイコン（⚙）から Options ページを開き、URLパターンごとにプレフィックスを設定できます。

- **ホスト名マッチ**: `localhost:3000` → そのホストで自動適用
- **正規表現マッチ**: `https?://staging\.example\.com/.*` → URL全体に対してマッチ
- ルールは上から順に評価され、最初にマッチしたものが使われます

設定したプレフィックスはコピー時に出力の先頭に付与されます。

## 出力例

### Markdown形式

```markdown
[repo=my-app]

## Page Context
- **URL**: https://example.com/dashboard/settings
- **Framework**: React
- **Meta Framework**: Next.js (App Router)
- **Page Title**: 設定 | Example App
- **Viewport**: 1920x1080
- **Language**: ja
- **User Agent**: Mozilla/5.0 ...

## Annotation #1
**Instruction**: この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい
- **Selector**: `#settings-form > div:nth-child(2) > button.btn-primary`
- **Tag**: `<button>`
- **Text**: "保存する"
- **Attributes**:
  - class: `btn btn-primary px-4 py-2`
  - data-testid: `settings-submit-btn`
  - type: `submit`
- **Component**: `SettingsPage` → `SettingsForm` → `SubmitButton`
- **Props**: `{ variant: "primary", disabled: false, onClick: fn }`
- **State**: `{ isSubmitting: false }`
```

### JSONL形式（デフォルト）

```jsonl
{"type":"prefix","content":"[repo=my-app]"}
{"type":"pageContext","url":"https://example.com/dashboard/settings","pageTitle":"設定 | Example App","framework":"React","metaFramework":"Next.js (App Router)","viewport":"1920x1080","language":"ja","userAgent":"Mozilla/5.0 ..."}
{"type":"annotation","id":1,"instruction":"この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい","element":{"selector":"#settings-form > div:nth-child(2) > button.btn-primary","tag":"button","text":"保存する","attributes":{"class":"btn btn-primary px-4 py-2","data-testid":"settings-submit-btn","type":"submit"}},"component":{"framework":"react","hierarchy":["SettingsPage","SettingsForm","SubmitButton"],"props":{"variant":"primary","disabled":false,"onClick":"fn"},"state":{"isSubmitting":false}}}
```

## 対応フレームワーク

| フレームワーク | 検出内容 |
|---|---|
| React | コンポーネント階層、Props、State（Hooks） |
| Vue 2 / 3 | コンポーネント階層、Props、Data |
| Next.js | App Router / Pages Router の検出 |
| Nuxt | フレームワーク検出 |

## 開発

```bash
pnpm dev        # 開発モード（ホットリロード対応）
pnpm build      # 本番ビルド
pnpm test       # テスト実行
pnpm package    # ZIP パッケージ化（配布用）
```

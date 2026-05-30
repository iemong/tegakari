# プライバシーポリシー / Privacy Policy

最終更新日 / Last updated: 2026-05-30

本拡張機能「tegakari」（以下「本拡張」）のプライバシーポリシーです。

---

## 日本語

### 収集する情報

本拡張は、ユーザーの個人情報を収集・送信しません。本拡張が扱うデータはすべて、
ユーザーのブラウザ内（ローカル）でのみ処理されます。

本拡張が扱うデータは以下のとおりです。

- **選択した要素のコンテキスト情報**: ユーザーがページ上でクリックして選択した
  要素のHTML情報（タグ・属性・テキスト）、検出したフレームワーク／コンポーネント
  情報、指示テキスト、クリック座標。
- **スクリーンショット**: 選択操作時に表示中タブを撮影し、要素周辺を切り抜いた
  画像。クリップボードへのコピーおよびローカル処理のみに使用します。
- **設定情報**: テーマ設定、URLパターン別のプレフィックスルール、アノテーション
  履歴。

### データの保存場所

- アノテーション履歴・設定・テーマは、ブラウザの `chrome.storage.local` に
  **ローカル保存**されます。外部サーバーには一切送信されません。
- 生成したテキスト／スクリーンショットは、ユーザーの操作に応じて
  **クリップボード**にコピーされます。

### 外部送信について

本拡張は、外部サーバーへのデータ送信、解析ツール（アナリティクス）、広告、
トラッキングを一切行いません。収集したデータがユーザーのデバイスから外部へ
送られることはありません。

### 権限の利用目的

| 権限 | 利用目的 |
|------|----------|
| `activeTab` / `host_permissions: <all_urls>` | ユーザーが選択した任意のページ上で要素の選択・情報収集・スクリーンショット撮影を行うため |
| `scripting` | フレームワーク／コンポーネント情報を取得するためのスクリプトをページに注入するため |
| `storage` | アノテーション履歴・設定をローカルに保存するため |

### お問い合わせ

ご不明点は GitHub リポジトリの Issue までご連絡ください。
<https://github.com/iemong/tegakari/issues>

---

## English

### Information We Collect

tegakari does **not** collect or transmit any personal information. All data
handled by the extension is processed **locally** within the user's browser.

The data handled by the extension includes:

- **Context of selected elements**: HTML information (tag, attributes, text) of
  the element the user clicks to select, detected framework/component
  information, instruction text, and click coordinates.
- **Screenshots**: An image of the visible tab captured during selection and
  cropped around the element. Used only for clipboard copy and local
  processing.
- **Settings**: Theme preference, per-URL prefix rules, and annotation history.

### Where Data Is Stored

- Annotation history, settings, and theme are stored **locally** in the
  browser's `chrome.storage.local`. They are never sent to any external server.
- Generated text and screenshots are copied to the **clipboard** in response to
  user actions.

### No External Transmission

tegakari does not send data to any external server, and does not use analytics,
advertising, or tracking of any kind. Collected data never leaves the user's
device.

### Why We Request Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` / `host_permissions: <all_urls>` | To select elements, collect information, and capture screenshots on any page the user chooses |
| `scripting` | To inject a script that reads framework/component information from the page |
| `storage` | To store annotation history and settings locally |

### Contact

For questions, please open an issue on the GitHub repository:
<https://github.com/iemong/tegakari/issues>

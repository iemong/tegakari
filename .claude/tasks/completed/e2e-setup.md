# Playwright E2E セットアップ (完了)

## 結果
- E2E 基盤を構築（Playwright + persistent context + Service Worker 経由トグル）
- spec `options-button.spec.ts` が **pass**
- → 設定ボタンの click → options ページ起動経路は **コード上は正常動作**

## 完了項目
- [x] `@playwright/test@^1.60.0` を devDependencies に追加
- [x] `.gitignore` に `build/`, `test-results/`, `playwright-report/` を追加
- [x] `tests/fixtures/page.html` （E2E 用ダミー DOM）
- [x] `tests/fixtures/server.mjs` （port 4321 静的サーバ）
- [x] `tests/e2e/global-setup.ts` （`build/chrome-mv3-prod` が無ければ pnpm build）
- [x] `tests/e2e/fixtures.ts` （context / extensionId / serviceWorker / activateExtension）
- [x] `tests/e2e/options-button.spec.ts`
- [x] `playwright.config.ts`
- [x] `package.json` に `e2e` / `e2e:headed` / `e2e:ui` を追加
- [x] Chromium バイナリ取得
- [x] `pnpm e2e` 実行 → 1 passed (5.3s)

## 残課題（次回以降の候補）
- ~~ユーザーが見た「押せない」現象の実機側調査~~ → **z-index 競合が原因と確定**
- 同種バグの他コンポーネント検証（InboxPopover, AnnotationPin） → spawn_task で別チケット化
- 他のシナリオ spec 追加
  - ツールバー起動 → 要素ピック → Copy までの一連
  - prefix-rules 一致時の挙動
- CI 化（new headless or xvfb）

## 追加実施（バグ修正）
- 原因特定: `:host { z-index }` は `position: static` のため無効 + Plasmo host が `<html>` 直下挿入で body 内 overlay より DOM order で前
- 対応: Toolbar を Popover API (`popover="manual"` + `showPopover()`) で top layer に昇格
- `src/style.css` の `:host` に `position: fixed` を追加（pin 等の他要素のため）
- `::backdrop { display: none }` を追加
- `vitest.config.ts` に `tests/e2e/**` の exclude を追加（vitest と playwright の住み分け）
- `playwright.config.ts` に `testIgnore: ["**/_debug/**"]`
- 検証: regression spec (z-index 競合下でも click 通る) と既存 spec、unit 122 件すべて pass

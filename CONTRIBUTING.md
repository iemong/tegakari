# Contributing to tegakari

Thanks for your interest in improving tegakari! This document covers how to
set up your environment, the quality gates your change needs to pass, and how
to open issues and pull requests.

## Development setup

tegakari is a [Plasmo](https://docs.plasmo.com/) (Manifest V3) Chrome
extension. Package management is done with **pnpm** — please don't use npm or
yarn, the lockfile is pnpm-only.

```bash
git clone https://github.com/iemong/tegakari.git
cd tegakari
pnpm install
```

Common commands:

```bash
pnpm dev            # Plasmo dev server with hot reload
pnpm build          # Production build (outputs to build/chrome-mv3-prod/)
pnpm package        # ZIP packaging for distribution

pnpm lint           # Biome lint (lint:fix to auto-fix, format to format)
pnpm test           # vitest unit tests (jsdom environment)
pnpm test:coverage  # Unit tests with coverage (90% threshold)
pnpm e2e            # Playwright E2E tests
```

To try your changes in a real browser, run `pnpm build`, open
`chrome://extensions`, enable "Developer mode", and load the
`build/chrome-mv3-prod` folder as an unpacked extension.

## Quality gates

Every change is expected to pass the following, which mirror what CI
(`.github/workflows/ci.yml`) and the local git hooks enforce:

- **Biome lint** (`pnpm lint`) — includes a nursery rule capping any single
  file at **300 lines**. If a file grows past that, split it (e.g. tests can
  be split by concern, such as `react-collector.source.test.ts` for a subset
  of `react-collector.test.ts`).
- **TypeScript** (`pnpm tsc --noEmit`) — the project must type-check cleanly.
- **Unit tests** (`pnpm test:coverage`) — vitest + Testing Library on jsdom.
  Coverage must stay at or above a **90% threshold** (lines, functions,
  branches, statements). A few UI-heavy files are excluded from the coverage
  gate (see `vitest.config.ts`), but most `src/lib/` and hook logic is
  expected to be fully covered.
- **E2E tests** (`pnpm e2e`) — Playwright against a built extension in
  `tests/e2e/`. MV3 service workers don't run in classic headless mode, so
  these tests run **headed** and serially (`workers: 1`). Use
  `E2E_REBUILD=1 pnpm e2e` to force a fresh build before the suite runs
  (recommended when you've changed extension code, since
  `build/chrome-mv3-prod` is checked into the repo and otherwise may be
  stale).

[lefthook](https://github.com/evilmartians/lefthook) wires most of this up
automatically once you run `pnpm install`:

- **pre-commit**: typecheck + unit tests on staged `.ts`/`.tsx` files
- **pre-push**: full coverage run (90% threshold)

Please don't bypass hooks (`--no-verify`) unless you have a very good reason
and have mentioned it in your PR description.

## Test placement conventions

Unit tests live in a `__tests__/` directory alongside the code they cover
(e.g. `src/lib/__tests__/selector.test.ts` for `src/lib/selector.ts`). Follow
this convention for new modules rather than centralizing tests elsewhere.

E2E specs live under `tests/e2e/*.spec.ts`, driven through the shared
extension fixture in `tests/e2e/fixtures.ts` (persistent browser context +
`--load-extension`). Page fixtures used by E2E tests live in
`tests/fixtures/`.

## Opening issues

- **Bug reports**: use the "Bug report" issue template and include the
  tegakari version, Chrome version, the framework of the page you were on
  (React / Vue / Next.js / Nuxt / other / unknown), and steps to reproduce.
- **Feature requests**: use the "Feature request" issue template and explain
  the problem you're trying to solve, not just the solution you have in mind.
- Blank issues are also allowed if neither template fits.

## Pull requests

- Small, single-purpose PRs are strongly preferred over large ones — it
  makes review and revert easier. If you're planning a large change, consider
  opening an issue first to discuss the approach.
- Include or update tests for any testable behavior change. Untestable UI
  changes (e.g. in `src/contents/` or `src/components/`) are excluded from
  the coverage gate, but please still add tests where practical.
- Update relevant documentation when behavior changes (`README.md` /
  `README.ja.md`, and `docs/output-spec.md` if the Markdown/JSONL output
  format changes).
- Make sure `pnpm lint`, `pnpm tsc --noEmit`, and `pnpm test:coverage` pass
  locally before opening the PR — CI runs the same checks (plus E2E) and will
  block merges otherwise.
- Fill in the pull request template, including the checklist confirming
  you've run the tests locally.

## Code of conduct

Be respectful and constructive. Assume good faith, and keep discussion
focused on the code and the problem at hand.

---

## 日本語での要約

tegakari は Plasmo (Manifest V3) ベースの Chrome 拡張です。パッケージ管理は
**pnpm** を使用します。

```bash
pnpm install
pnpm dev        # 開発モード（ホットリロード）
pnpm build      # 本番ビルド
pnpm test       # ユニットテスト（vitest / jsdom）
pnpm test:coverage  # カバレッジ付きテスト（閾値90%）
pnpm e2e        # E2E テスト（Playwright、headed 必須・直列実行）
```

**品質ゲート**: Biome lint（1ファイル300行制限あり。超えたらファイル分割）、
`tsc --noEmit` による型チェック、vitest によるユニットテスト（カバレッジ
90%閾値）、Playwright による E2E テスト。lefthook が pre-commit で
typecheck + test、pre-push でカバレッジ計測を自動実行します。フックの
バイパス（`--no-verify`）は原則禁止です。

**テスト配置**: ユニットテストは対象コードと同じディレクトリ配下の
`__tests__/` に置きます（例: `src/lib/selector.ts` →
`src/lib/__tests__/selector.test.ts`）。E2E テストは `tests/e2e/*.spec.ts`
に配置し、`tests/e2e/fixtures.ts` の拡張 fixture 経由で persistent context
を作成します。

**Issue の立て方**: バグ報告・機能要望はそれぞれ専用の Issue テンプレートを
使用してください。どちらにも当てはまらない場合は blank issue でも構いません。

**PR の出し方**: 大きな変更よりも、機能単位の小さい PR を歓迎します。
テスト可能な変更にはテストを追加・更新し、出力仕様（Markdown/JSONL）に
関わる変更は `docs/output-spec.md` も更新してください。PR を出す前に
`pnpm lint` / `pnpm tsc --noEmit` / `pnpm test:coverage` をローカルで通して
から、PR テンプレートのチェックリストを埋めて提出してください。

# AGENTS.md — pi-image-url で作業するエージェント向けの指示

読者は pi-image-url を変更する AI エージェントと開発者です。利用者向けの仕様は [README](README.md) に、
設計の判断基準は [DESIGN.md](DESIGN.md) と [PHILOSOPHY.md](PHILOSOPHY.md)(このプラグイン群共通)に書きます。

ここには、壊してはいけない制約と、制約に触れる変更の手順だけを書きます。制約の正はテストで、
下の表はその索引です。実装と表が食い違った場合はテストが正です。検証手段を併記できないものは制約として書かず、
自動テストできない範囲は末尾に分けます。

## 完了条件

`npm run verify`(= `npm run check` + `npm run knip` + `npm test` + `npm run test:coverage`)が通ること。
フックが通っても CI が通らなければ未完了。CI は同じ `verify` を Node 22.19 / 24 で実行します。
カバレッジは `test/unit` と `test/integration` で計測します。下の表の「検証」列は個別の検証箇所であり、
自動検証はすべて `verify` に含まれます。

## 制約

### 拡張の公開面

| 制約 | 検証 | 定義・実装箇所 |
|---|---|---|
| 登録はツール1つだけ | `test/contract/surface.test.ts` | `src/index.ts` |
| ツール名は `read_image_url` | `test/contract/surface.test.ts` | `src/index.ts` |
| 引数は `url` のみで、未知の引数を拒否する(`additionalProperties: false`) | `test/contract/surface.test.ts` | `src/index.ts` |
| コマンドを登録しない | `test/contract/surface.test.ts` | `src/index.ts` |
| イベントハンドラを登録しない(`pi.on` を呼ばない) | `test/contract/surface.test.ts` | `src/index.ts` |
| description は160文字以内 | `test/contract/surface.test.ts` | `src/index.ts` |

### 取得と検証

| 制約 | 検証 | 定義・実装箇所 |
|---|---|---|
| `http` / `https` だけを受け付け、他はスキーム名入りのエラーにする | `test/unit/image-url.test.ts` | `src/image-url.ts` の `toHttpUrl` |
| 対応する Content-Type は `image/png` / `image/jpeg` / `image/gif` / `image/webp` だけ | `test/unit/image-url.test.ts` | `src/image-url.ts` の `SUPPORTED_IMAGE_TYPES` |
| `image/jpg` は `image/jpeg` に正規化する | `test/unit/image-url.test.ts` | `src/image-url.ts` の `toImageMimeType` |
| Content-Type のパラメータ(`; charset=...`)は無視する | `test/unit/image-url.test.ts` | `src/image-url.ts` の `toImageMimeType` |
| Content-Type がない応答はエラーにする | `test/unit/image-url.test.ts` | `src/image-url.ts` の `toImageMimeType` |
| Content-Type の検証を本文の読み込みより先に行う | `test/unit/image-url.test.ts` | `src/image-url.ts` の `fetchImage` |
| 上限は 20 MiB。`Content-Length` があれば本文取得前に、なければストリーム中で拒否する | `test/unit/image-url.test.ts` | `src/image-url.ts` の `MAX_IMAGE_BYTES` / `readBody` |
| 非2xx は HTTPステータス入りのエラーにする | `test/unit/image-url.test.ts` | `src/image-url.ts` の `fetchImage` |
| リダイレクトは追従する | `test/unit/image-url.test.ts` | `src/image-url.ts` の `fetchImage` |
| `signal` を fetch に渡し、abort で中断できる | `test/unit/image-url.test.ts` | `src/image-url.ts` の `fetchImage` |
| ファイルシステムAPIを import しない(`src` が使える node builtin は `node:buffer` だけ) | `test/contract/dependencies.test.ts` | `test/contract/dependencies.test.ts` の `ALLOWED_NODE_BUILTINS` |
| 成功結果は画像ブロック1つだけ。`details` は `undefined` | `test/integration/extension.test.ts` | `src/index.ts` |
| `fetchImage` の失敗(Content-Type / HTTP / スキーム)は `execute` から throw される | `test/integration/extension.test.ts` | `src/index.ts` / `src/image-url.ts` |

### 依存関係・import

| 制約 | 検証 | 定義・実装箇所 |
|---|---|---|
| `dependencies` フィールドは空(実行時依存を同梱しない) | `test/contract/dependencies.test.ts` | `package.json` |
| peerDependency は Pi 提供パッケージのみ(`@earendil-works/pi-coding-agent` / `typebox`) | `test/contract/dependencies.test.ts` | `test/contract/dependencies.test.ts` の `ALLOWED_PEER_DEPENDENCIES` |
| `src` の import は node builtin・相対 `.ts`・Pi 提供パッケージのみ | `test/contract/dependencies.test.ts` | `test/contract/dependencies.test.ts` の `ALLOWED_PEER_DEPENDENCIES` |
| 循環依存を作らない | `npx biome check .` | `biome.jsonc` の `noImportCycles` |
| 未宣言の依存を import しない | `npx biome check .` | `biome.jsonc` の `noUndeclaredDependencies` |
| 未使用の export・依存・ファイルを検出しない | `npm run knip` | `knip.jsonc` |
| devDependency は allowlist 内のみ | `test/contract/dependencies.test.ts` | `test/contract/dependencies.test.ts` の `ALLOWED_DEV_DEPENDENCIES` |

### 配布・ビルド

| 制約 | 検証 | 定義・実装箇所 |
|---|---|---|
| 配布物は `files` の whitelist 内のみ | `test/ci/package-contents.test.ts` | `package.json` の `files` |
| `pi.extensions` のエントリが配布物に含まれる | `test/ci/package-contents.test.ts` | `package.json` の `pi.extensions` |
| ビルド工程を持たない(TS を直接配布) | `test/ci/package-contents.test.ts` | `package.json`(`build` script なし、`pi.extensions` が `./src/index.ts`) |

### コード品質

| 制約 | 検証 | 定義・実装箇所 |
|---|---|---|
| `enum` / `namespace` / parameter properties を使わない | `npx tsc --noEmit` | `tsconfig.json` の `erasableSyntaxOnly` |
| 型は `any` なし、非null断言なし、浮いた Promise なし | `npx biome check .` | `biome.jsonc` の `suspicious` / `nursery` |
| `console` を使わない | `npx biome check .` | `biome.jsonc` |
| 認知複雑度は 12 以下 | `npx biome check .` | `biome.jsonc` の `noExcessiveCognitiveComplexity` |
| 相対 import は `.ts` 拡張子付き、パスエイリアスなし | `npx tsc --noEmit` + Node 実行 | `tsconfig.json` |

## 変更時の手順

- 受け入れる形式・スキーム・サイズ上限を変える場合は、`test/unit/image-url.test.ts` を先に更新し、README の動作表と DESIGN.md を同じコミットで更新する。
- 返却方式(画像ブロックの直接返却)を変える場合は、先に [docs/adr/0001-return-image-directly.md](docs/adr/0001-return-image-directly.md) を読む。却下案を再提案する場合は、実測結果を根拠に ADR と DESIGN.md を同じコミットで更新する。
- ツール名・引数・description を変える場合は `test/contract/surface.test.ts` を先に更新する。契約が変更の入口になる。
- ツールを増やす・コマンドやイベントを足す場合は、DESIGN.md の非目標と ADR を先に見直す。単機能が制約である。
- 依存を追加できるのは devDependency と、Pi が提供する peerDependency(`ALLOWED_PEER_DEPENDENCIES`)のみ。
  devDependency は `ALLOWED_DEV_DEPENDENCIES` を更新し、コミットメッセージに理由を残す。
  実行時依存(`dependencies`)の追加は不可。
- 決定の記録は `docs/adr/` に置く(1決定 = 1ファイル、`NNNN-<topic>.md`)。追加するのは、
  却下した代替を再提案されうる決定、機能や振る舞いを削除・置き換える決定、DESIGN.md / PHILOSOPHY.md に触れる決定のときだけ。
  却下案は結果ではなく理由を書く。
- ドキュメントの段落内の改行は、文末(。！？)・読点(、)・コロン(:)の直後に置く。

## 手動確認

自動検証の対象外の確認は [docs/manual-checks.md](docs/manual-checks.md) に書きます。

# AGENTS.md — pi-image-url

読者: pi-image-url を変更するエージェントと開発者。利用者向けの仕様は [README](README.md)、設計判断は [DESIGN.md](DESIGN.md)。
共通の検証と規則はルートの `AGENTS.md` にある。

## 壊してはいけない制約

- 登録するツールは `read_image_url` の1つだけ。コマンドもイベントハンドラも登録しない（`test/contract/surface.test.ts`）。
- 引数は `url` だけで、未知の引数は拒否する（`additionalProperties: false`）。description は160文字以内（`test/contract/surface.test.ts`）。
- `http` と `https` だけを受け付ける。他のスキームはスキーム名を含むエラーにする（`test/unit/image-url.test.ts`）。
- 対応する Content-Type は `image/png` / `image/jpeg` / `image/gif` / `image/webp` だけ。`image/jpg` は `image/jpeg` に正規化し、パラメータ（`; charset=...`）は無視する。Content-Type が無い応答はエラー（`test/unit/image-url.test.ts`）。
- Content-Type の検証は本文の読み込みより先に行う（`test/unit/image-url.test.ts`）。
- 上限は 20 MiB。`Content-Length` があれば本文取得前に、無ければストリーム中に拒否する（`test/unit/image-url.test.ts`）。
- 非2xx は HTTP ステータス入りのエラーにする。リダイレクトは追従する。`signal` を fetch に渡し、abort で中断できる（`test/unit/image-url.test.ts`）。
- 成功結果は画像ブロック1つだけで、`details` は `undefined`。失敗（Content-Type・HTTP・スキーム）は `execute` から throw する（`test/integration/extension.test.ts`）。
- ファイルシステム API を import しない。`src` が使える node builtin は `node:buffer` だけ（`test/contract/dependencies.test.ts`）。
- 実行時依存を持たず、ビルド工程も持たない。配布は `files` の whitelist 内で、`pi.extensions` のエントリを含む（`test/contract/dependencies.test.ts`、`test/ci/package-contents.test.ts`）。

## 変更手順

- 受け入れる形式・スキーム・サイズ上限を変えるときは、`test/unit/image-url.test.ts` を先に更新し、README の動作表と DESIGN.md を同じコミットで更新する。
- ツール名・引数・description を変えるときは、`test/contract/surface.test.ts` を先に更新する。
- 返却方式（画像ブロックの直接返却）を変えるときは、先に [docs/adr/0001-return-image-directly.md](docs/adr/0001-return-image-directly.md) を読む。却下案を再提案するなら、実測結果を根拠に ADR と DESIGN.md を同じコミットで更新する。
- ツールやコマンドを増やすときは、DESIGN.md の非目標と ADR を先に見直す。単機能であることが制約になっている。
- 手動で確認する項目は [docs/manual-checks.md](docs/manual-checks.md) に書く。

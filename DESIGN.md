# 設計思想 — pi-image-url

読者は pi-image-url を変更する開発者と AI エージェントです。共通の哲学は [PHILOSOPHY.md](PHILOSOPHY.md)、
検証可能な制約と変更手順は [AGENTS.md](AGENTS.md) にあります。
個別の決定の記録は [docs/adr/](docs/adr/) にあり、この文書は現在の判断基準です(ADR の理由を繰り返しません)。

## 目指すべきところ

対象は、URLでしか手に入らない画像(Webページのグラフ、スクリーンショット、生成画像など)を Pi の会話で見たい開発者です。
目的は、画像URLを1つのツール呼び出しでモデルのコンテキストに画像として載せることです。
Pi の `read` はローカルパス専用で URL を開けず、codemode の `image()` は remote URL を受け付けません。

### 達成状態

| 状態 | 観測方法 |
|---|---|
| 画像URLが1手でモデルに見える | `read_image_url` の結果が画像ブロックになる(`test/integration/extension.test.ts`) |
| 一時ファイルが残らない | ファイルシステムに何も書かない(実装が `node:fs` を import しない) |
| 対応外の入力が理由付きで失敗する | HTTPエラー・非画像形式・サイズ超過・非httpスキームがそれぞれの文言で throw する(`test/unit/image-url.test.ts`) |
| 大きすぎる画像でセッションが壊れない | `Content-Length` が上限超過なら本文取得前に、判定できない場合はストリーム中に、20 MiB 超を拒否する(`test/unit/image-url.test.ts`) |
| 中断できる | fetch に signal が渡り、abort で中断する(`test/unit/image-url.test.ts`) |

### 最小の成立条件

| 成立条件 | 達成する状態 |
|---|---|
| http(s) の取得と画像ブロックへの変換 | 画像URLが1手でモデルに見える。一時ファイルが残らない |
| Content-Type / スキーム / サイズの検証 | 対応外の入力が理由付きで失敗する。大きすぎる画像でセッションが壊れない |
| signal の引き渡し | 中断できる |

### 非目標

- ローカルファイル(`read` の担当)と `data:` URL(本拡張の対象外。codemode の `image()` など別手段の担当)
- SVG / BMP など変換が必要な形式の変換
- 一時ファイルへの保存、ダウンロード履歴、キャッシュ
- リサイズ・形式変換(Pi 本体の `normalizeToolResultImages` に任せる)
- 複数URLの一括取得、並列ダウンロード
- 認証(Cookie / Authorization)、プロキシ、リトライ、タイムアウト設定
- 設定ファイル、コマンド、イベントハンドラ

### 拡張の条件

最小の成立条件を超える機能は、最小構成には含めません。

- 維持・追加には、達成状態への寄与を実測で示します。
- 寄与を示せない機能は、削除候補とします。

## 固有の原則

- ツールは1つ(`read_image_url`)、引数は1つ(`url`)です。それ以上は別のツールにします。
- 画像は `ImageContent` として直接返し、ファイルシステムに触りません。正規化と自動リサイズは Pi 本体に任せます([ADR 0001](docs/adr/0001-return-image-directly.md))。
- 受け入れるのは、Pi が変換なしで扱える4形式(`image/png` / `image/jpeg` / `image/gif` / `image/webp`)と、その別名 `image/jpg` だけです。Content-Type の検証は本文取得前に行い、取得後ではなく Content-Type の時点で失敗させます。
- エラーは throw で返し、HTTPステータス・Content-Type・サイズ・URLスキームなどの原因を示します。対応外スキームの場合は、ローカルファイルなら `read` を使うよう案内します。

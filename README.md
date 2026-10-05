# pi-image-url

画像URLを1回のツール呼び出しでモデルに見せる Pi 拡張です。

Pi の `read` はローカルパス専用で URL を開けません。画像URLを見せるには `curl` で保存してから `read` に渡す2手が必要でした。この拡張はその2手を `read_image_url` の1手にします。

```
read_image_url(url: "https://example.com/chart.png")
  → 画像がそのままモデルに届く（一時ファイルなし）
```

## 動作

| 項目 | 値 |
|---|---|
| ツール | `read_image_url`（引数は `url` のみ） |
| 対象URL | `http` / `https` |
| 対応形式 | `image/png` / `image/jpeg` / `image/gif` / `image/webp`（`image/jpg` は jpeg として扱う） |
| サイズ上限 | 20 MiB（受信しながら判定し、超えた時点で中断する） |
| リダイレクト | 追従する |
| 中断 | Esc / ターン中断で停止する |
| リサイズ | Pi 本体の自動リサイズに任せる |

- 画像は一時ファイルに保存せず、ツール結果に画像ブロックとして直接入ります。
- 失敗時は、不正なURL、HTTPステータス、Content-Type の欠落または非対応、サイズ超過、対応外スキームを原因付きでエラーとして返します。

Content-Type は大文字小文字を区別せず、`;` 以降のパラメータを無視して判定します。Content-Type がない応答は拒否します。

## インストール

```bash
pi install git:github.com/kurowashi/pi-image-url
```

ref を固定する場合は `pi install git:github.com/kurowashi/pi-image-url@<tag|commit>`。

ローカルの作業コピーを使う場合:

```bash
pi install /path/to/pi-image-url
```

または直接読み込み:

```bash
pi --extension /path/to/pi-image-url/src/index.ts
```

## 使い方

モデルは画像URLを受け取ると `read_image_url` を呼びます。手動で呼ばせる例:

```
https://example.com/chart.png を read_image_url で表示して
```

## 制限

- ローカルファイルは対象外です。`read` を使ってください。
- `data:` URL、SVG / BMP など変換が必要な形式は対象外です。
- 認証は行いません（Cookie / Authorization ヘッダは送りません）。
- 表示できるのは画像対応モデルだけです。非対応モデルにはプレースホルダが渡ります。
- 一括取得・キャッシュ・リトライはありません。1回の呼び出しで1枚を取得します。

## 関連

| 手段 | 画像URL | ローカルファイル | `data:` URL |
|---|---|---|---|
| `read_image_url`（この拡張） | ✅ | ❌ | ❌ |
| `read`（Pi 本体） | ❌ | ✅ | ❌ |
| codemode の `image()` | ❌（remote URL 非対応） | base64 化すれば可 | ✅ |

## 開発

```bash
npm install
npm run verify
```

## ライセンス

MIT

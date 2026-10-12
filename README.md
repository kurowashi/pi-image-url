# pi-image-url

画像 URL を 1 回のツール呼び出しでモデルに見せる Pi 拡張です。

Pi の `read` はローカルパスしか開けません。URL の画像を見せるには、`curl` で保存してから `read` に渡す 2 手が必要でした。
この拡張は、その 2 手を `read_image_url` の 1 手にまとめます。

```
read_image_url(url: "https://example.com/chart.png")
  → 画像がそのまま会話に入る（一時ファイルは作らない）
```

## 使い方

モデルは画像 URL を受け取ると `read_image_url` を呼びます。手動で頼む場合は、次のように書きます。

```
https://example.com/chart.png を read_image_url で表示して
```

## インストール

```bash
pi install git:github.com/kurowashi/pi-image-url
```

バージョンを固定する場合は `pi install git:github.com/kurowashi/pi-image-url@<tag|commit>` を使います。
ローカルの作業コピーを使う場合は `pi install /path/to/pi-image-url` を使います。

開発とテストは Pi 1.0.3 と Node.js 22.19 以上で行っています。

## ツールの仕様

| 項目 | 内容 |
|---|---|
| ツール名 | `read_image_url` |
| 引数 | `url`（文字列）のみ。`http` / `https` の絶対 URL |
| 対応形式 | PNG / JPEG / GIF / WebP（`image/jpg` は JPEG として扱う） |
| サイズ上限 | 20 MiB |
| リダイレクト | 追従する |
| 表示サイズ | Pi 本体が自動リサイズする（2000×2000 以内。Pi の自動リサイズ設定に従う） |
| 中断 | Esc またはターンの中断で止まる |

- 画像は一時ファイルに保存せず、ツールの結果としてモデルに直接渡します。
- Cookie や Authorization ヘッダーは送りません。認証が必要な URL は取得できません。

### Content-Type の判定

- 大文字と小文字を区別せず、`;` 以降のパラメータ（`charset=...` など）は無視します。
- `image/jpg` は `image/jpeg` として扱います。
- Content-Type がない応答は拒否します。
- Content-Type は本文を読む前に判定します。対応外の形式は、本文を取得せずに失敗します。

### 失敗の例

失敗すると、原因を示すエラーがツール結果として返ります。セッションは続きます。

| 原因 | エラーの例 |
|---|---|
| URL が不正、または `http` / `https` 以外 | `Unsupported URL scheme "file". read_image_url accepts http and https; use read for local files.` |
| HTTP エラー | `Failed to download image: HTTP 404.` |
| Content-Type がない、または対応外 | `Unsupported image type "text/html". Supported: image/png, image/jpeg, image/gif, image/webp.` |
| サイズ超過 | `Image is over the 20 MiB limit (received 25.3 MiB).` |

サイズは次の順で確認します。

1. 応答の `Content-Length` が 20 MiB を超えていれば、本文を取得せずに失敗します。
2. `Content-Length` がない場合、または上限以内の場合も、受信しながら数えます。20 MiB を超えた時点で中断します。

## 画像の入り方

| 入力 | 使うツール |
|---|---|
| 画像の URL（`http` / `https`） | `read_image_url`（この拡張） |
| ローカルファイルのパス | `read`（Pi 本体） |
| `data:` URL | 対象外 |

- 画像を表示できるのは、画像入力に対応したモデルだけです。対応していないモデルには画像は渡らず、「画像は省略された」という旨のテキストが渡ります。
- SVG や BMP などの対応外の形式は、Content-Type の判定で失敗します。

## 制限

- 一度に取得するのは 1 枚です。一括取得、キャッシュ、リトライはありません。
- 認証付きの URL は取得できません。
- タイムアウトはありません。応答しないサーバーでは、Esc で中断するまで待ちます。
- サイズの上限を変更する設定はありません。

## ライセンス

MIT

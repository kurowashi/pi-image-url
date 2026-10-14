# 手動確認 — pi-image-url

自動検証の対象外の確認項目と手順です。

## 手動確認項目

前提: 画像対応モデルで Pi を起動します。

1. 実在する画像URL（`image/png` / `image/jpeg` / `image/webp`）を `read_image_url` に渡し、TUI に画像が表示されること。
2. Pi の既定の画像上限（2000×2000 px）を超える画像が、縮小されて表示されること。上限は Pi の `inputLimits.images.resize` で変わります。
3. HTML ページの URL を渡すと `Unsupported image type "text/html"` で失敗し、セッションが続くこと。
4. `file:///tmp/image.png` を渡すとスキームエラーになり、`read` を使うよう案内されること。
5. 20 MiB を超える画像 URL を渡すとサイズエラーになり、セッションが続くこと。
6. 大きな画像のダウンロード中に Esc を押すと中断し、再開後もセッションが壊れないこと。

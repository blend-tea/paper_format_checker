# paper_format_checker

論文のフォーマットを正規表現に基づいてチェックする Tauri 2 アプリです。

## 使い方

1. `rules.toml` を `paper_format_checker.exe` と同じディレクトリに配置（ビルド時に同梱されます）
2. アプリを起動
3. メニュー **File → File Open...**、**ドラッグ＆ドロップ**、または `.tex` / `.txt` をドロップして開く
4. **File → File Save...** または **Ctrl+S** で保存ダイアログを開いて保存
5. 未保存の変更がある状態で終了すると、保存確認ダイアログが表示されます

設定ファイルは Tauri 2 の TOML 形式で [`src-tauri/Tauri.toml`](src-tauri/Tauri.toml) にあります（`config-toml` feature 使用）。

## 開発

```bash
npm install
npm run tauri dev
```

## ビルド

```bash
npm run tauri build
```

リリース後の UPX 圧縮（Linux/macOS の Git Bash 等）:

```bash
./build.sh
```

## rules.toml の編集

`regex` に検知ルールを正規表現で記述します。`error` にマッチ時のメッセージを書きます。セクション名（例: `comma-space`）は任意です。

正規表現はシングルクオート（TOML のリテラル文字列）で囲んでください。リテラル文字列ではバックスラッシュがそのまま扱われるため、`\s` や `\{` などをエスケープせずに記述します（ダブルクオートで囲む場合のみ `\\s` のようなエスケープが必要です）。

```toml
[comma-space]
regex = ',[^\s]'
error = "半角カンマの後ろにはスペースを入れてください"
```

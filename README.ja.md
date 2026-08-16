# Music Practice Kit

スマホの楽器練習でよく使う道具を、1ページ・1ファイルにまとめたブラウザーアプリです。

**チューナー / メトロノーム / TAP BPM / ドローン音 / 練習タイマー / 録音 / 周波数スペクトラム**を、インストールやアカウントなしで使えます。設定と音声処理はブラウザー内で完結します。

## 主な機能

- クロマチックチューナー
- ギター標準チューニング E2 / A2 / D3 / G3 / B3 / E4
- ウクレレ high-G G4 / C4 / E4 / A4
- 4弦ベース E1 / A1 / D2 / G2
- A4基準ピッチ 430.0〜450.0 Hz
- 音程の周波数・セント差・ニードル表示
- 30〜300 BPMのメトロノーム
- TAP BPM、2〜7拍子、1拍目アクセント、音量調整
- C2〜B5のドローン音、サイン波 / トライアングル波
- 5 / 10 / 15 / 30分プリセットとカスタム練習タイマー
- 対応ブラウザーでScreen Wake Lock
- MediaRecorderによる端末内録音、再生、ファイル保存
- マイク入力の周波数スペクトラム
- 日本語 / English 切替
- スマホ用ボトムナビとsafe-area対応

## プライバシー

マイク音声、録音、設定はこのページ内で処理されます。アプリから外部サーバーへ音声を送信しません。CSPは `connect-src 'none'` を維持し、解析・広告・テレメトリも含みません。

録音データはメモリ上だけに保持し、「録音を保存」を押したときにのみファイルとして端末へ保存します。ページを閉じると未保存の録音は失われます。

## マイクについて

チューナー、録音、スペクトラムはブラウザーのマイク権限が必要です。ブラウザーによってローカルHTML (`file://`) からのマイク利用が制限される場合があります。その場合はHTTPSまたはlocalhostで開いてください。

メトロノーム、TAP、ドローン音、タイマーはマイク権限なしで利用できます。

## ビルド

Windows PowerShellで次を実行します。

```powershell
.\build-standalone.bat
```

生成物:

- `dist/index.html` — 読みやすい完全内包HTML
- `dist/index.self-extract.html` — gzip自己展開版

静的確認:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

## 開発構成

```text
src/index.template.html      編集対象のアプリ本体
APP_SPEC.md                  製品仕様・受入条件
app.config.json              アプリ名・バージョン等
dependencies.json            内包依存（現在は0件）
build-standalone.ps1         単一HTMLビルド
dist/                        生成物
.github/workflows/           GitHub Pages / build workflow
```

`dist/` は手編集せず、`src/index.template.html` を変更して再ビルドします。

## ブラウザー

現在の主要なChromium / Firefox / Safariのデスクトップ・モバイルを対象にしています。API対応状況によって、録音形式、Wake Lock、マイク入力デバイス名などは挙動が異なります。

## License

MIT License

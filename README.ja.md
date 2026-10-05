# Music Practice Kit

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-music-practice-kit/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-music-practice-kit/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-music-practice-kit/)

[English README](README.md)

楽器練習で毎日のように使う道具を、スマートフォン向けの1ページ・1ファイルにまとめたブラウザーアプリです。

**チューナー / メトロノーム / TAP BPM / ドローン音 / 練習タイマー / 録音 / 周波数スペクトラム**を1つの画面から使えます。マイク音声はブラウザー内で処理され、アプリから外部へアップロードされません。

[Browser Kitty](https://browser-kitty.com/) のアプリとして開発しています。

## 🚀 デモ

### [GitHub PagesでMusic Practice Kitを開く](https://ttomohisa.github.io/htmlapps-music-practice-kit/)

GitHub Pagesから最初のHTMLを読み込んだ後、音程解析、メトロノーム、ドローン音、録音、スペクトラム解析、設定保存は端末側で処理されます。

![メトロノームと練習タイマーを動作させたMusic Practice Kit](assets/screenshot.png)

チューナー・録音・スペクトラムはマイク権限が必要です。メトロノーム・TAP BPM・ドローン音・タイマーはマイク権限なしでも利用できます。

## 主な機能

- 音名・周波数・セント差・ニードルを大きく表示するクロマチックチューナー
- 楽器別プリセット
  - ギター: E2 / A2 / D3 / G3 / B3 / E4
  - ウクレレ high-G: G4 / C4 / E4 / A4
  - 4弦ベース: E1 / A1 / D2 / G2
- 楽器モードでは弦をタップして狙う音を固定可能
- A4基準ピッチを430.0〜450.0 Hzで調整
- マイク入力レベル・チューナー感度調整
- 30〜300 BPMのメトロノーム
- ±1 / ±5 BPM、TAP BPM
- 2〜7拍子、1拍目アクセントON/OFF
- **最初から練習**で、設定を保ったまま再生中のテンポ練習を開始BPM・1拍目からやり直し
- メトロノーム音量0%では拍表示を続けて消音。音声を開始できない場合は停止状態に戻り、再試行可能
- Web Audioの時間軸を使った先読みスケジューリングでテンポを安定化
- C2〜B5のドローン音、サイン波 / トライアングル波
- 5 / 10 / 15 / 30分プリセット＋任意時間の練習タイマー
- 対応ブラウザーでは練習中のScreen Wake Lock
- マイク録音、ページ内再生、破棄、ファイル保存
- マイク入力のリアルタイム周波数スペクトラム
- 1つのHTML内で日本語・英語を切り替え
- safe-area対応のスマホ向けボトムナビ
- 実行時CDN、解析、テレメトリ、外部API通信なし

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-music-practice-kit/)だけで利用できます。インストールやアカウント登録は不要です。

チューナー・録音・スペクトラムを初めて使うときは、ブラウザーに表示されるマイク利用の確認で許可してください。

### HTMLをダウンロードして使う

1. このリポジトリまたはReleaseの成果物から `dist/index.html` をダウンロードします。
2. 最新のChromium系ブラウザー、Firefox、Safariで開きます。
3. メトロノーム・TAP BPM・ドローン音・タイマーはそのまま利用できます。
4. `file://` からマイクを利用できないブラウザーでは、GitHub Pages版を使うか、HTTPS / localhostからHTMLを開いてください。

### 完全オフラインで使う（advanced）

1. このリポジトリをダウンロードまたはクローンします。
2. Windowsで `build-standalone.bat` をダブルクリックします。
3. 生成された `dist/index.html` を任意の場所へコピーします。
4. 以降は1つのHTMLをネットワーク接続なしで開けます。

現在は外部の音声ライブラリを使用していないため、ビルド時にオーディオライブラリを取得する必要もありません。Web Audio、Media Capture、MediaRecorder、Canvas、Wake Lockなどのブラウザー標準APIで実装しています。

## 使い方

### チューナー

1. **チューナー**を開いてマイクを許可します。
2. **Chromatic / Guitar / Ukulele / Bass** からモードを選びます。
3. 音を鳴らし、大きな音名・周波数・セント差・ニードルを確認します。
4. 楽器モードでは弦をタップすると狙う音を固定でき、1本ずつ調弦したいときに便利です。
5. 合奏相手や楽器に合わせて、必要ならA4基準ピッチを変更します。

### メトロノーム

1. **メトロノーム**を開きます。
2. スライダー、±1 / ±5、または **TAP** でBPMを設定します。
3. 2〜7拍子を選び、必要に応じて1拍目アクセントをON/OFFします。
4. 開始ボタンを押します。メトロノームを鳴らしたまま他の練習ツールへ移動できます。

### 少しずつ速くする練習

メトロノーム下の**少しずつ速くする練習**をオンにして開始します。初期設定は**60 → 100 BPM、4小節ごとに +5**。停止中に開始・目標BPM（30〜300）、増分（1〜270）、変更間隔（1〜64小節）を設定できます。目標は開始BPM以上にしてください。

指定した小節数を終えた次の小節頭でテンポを上げ、目標BPMで維持します。現在のBPMと次の変更までの小節数を表示します。再生中や音声中断中に**最初から練習**を押すと、設定を保ったまま開始BPM・1拍目・最初の小節数からやり直せます。停止中と通常モードでは押せません。停止後の再開も開始BPMから。スライダー・±ボタン・最初のTAP操作で通常モードに戻ります。再生中にオン／オフを切り替えると、選んだモードで最初から再生します。設定は端末内に保存しますが、ページを開いても自動再生しません。

ページを離れたり音声が中断された場合はメトロノームを一時停止し、戻ると同じテンポで中断した小節をやり直します。遅れた拍をまとめて鳴らすことはありません。マイク権限は不要です。

### ドローン音

1. 練習ツールからC2〜B5の音を選択します。
2. サイン波またはトライアングル波を選びます。
3. ドローンを開始し、音量を調整します。
4. 周波数は現在設定しているA4基準ピッチに連動します。

### 練習タイマー

1. 5 / 10 / 15 / 30分、または任意の時間を設定します。
2. 開始・一時停止・再開・リセットを使って練習時間を管理します。
3. 終了時には短いチャイムが鳴ります。
4. 対応環境では、タイマー実行中にScreen Wake Lockで画面消灯を抑制できます。

### 録音・スペクトラム

1. マイク利用を許可します。
2. 録音を開始し、テイクが終わったら停止します。
3. ページ内で再生するか、録音ファイルとして保存します。
4. 周波数スペクトラムは同じマイク入力を使うため、録音を開始しなくても確認できます。

録音データは明示的にファイル保存するまでメモリ上だけに保持されます。ページを閉じたり再読み込みすると、未保存の録音は失われます。

## GitHub Pagesで公開する

このリポジトリには、リポジトリ検査 → 単一HTMLビルド → `dist/` のGitHub Pages公開まで自動で行うworkflowが含まれています。

1. リポジトリ名を `htmlapps-music-practice-kit` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` ブランチへプッシュするか、Actions画面から **Deploy GitHub Pages** を手動実行します。
4. 成功後、`https://ttomohisa.github.io/htmlapps-music-practice-kit/` で公開されます。

`main` へのpush時には、リポジトリ検査、生成HTMLの再ビルドを行ってから `dist/` を公開します。

## 開発とビルド

```text
.
├─ src/index.template.html          # 編集対象のアプリ本体
├─ APP_SPEC.md                      # 製品仕様・受入条件
├─ app.config.json                  # アプリ名・バージョン等
├─ dependencies.json                # 内包依存（現在は0件）
├─ build-standalone.bat             # Windows用ビルド入口
├─ build-standalone.ps1             # 単一HTMLビルダー
├─ scripts/
│  ├─ check-repository.ps1          # リポジトリ検査
│  └─ verify-standalone.ps1         # 生成HTMLの検証
├─ dist/
│  ├─ index.html                    # 読みやすい単一HTML版
│  └─ index.self-extract.html       # gzip自己展開版
└─ .github/workflows/
   ├─ build-standalone.yml          # Pull Request時のビルド検証
   └─ deploy-pages.yml              # mainからPagesへ自動公開
```

`dist/` 配下は手編集せず、`src/index.template.html` や設定・ドキュメントを変更してから再ビルドします。

### ビルド

Windowsでは次を実行します。

```powershell
.\build-standalone.bat
```

リポジトリ検査だけを実行する場合:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

生成される1ファイル版は2種類です。

- `dist/index.html` — 読みやすい完全内包HTML
- `dist/index.self-extract.html` — gzip自己展開形式の完全内包HTML

## プライバシーと通信防止

生成されたアプリは、練習データを端末内に保つ設計です。

- マイク音声はブラウザー内のオーディオ処理にだけ使用します。
- 音程検出とスペクトラム解析はページ内で実行します。
- 録音はユーザーが明示的に保存するまでメモリ上に保持します。
- 設定は利用可能な場合のみブラウザーのローカルストレージへ保存します。
- アカウント、解析、テレメトリ、クラウド保存、音声アップロード機能はありません。
- Runtime CSPには `connect-src 'none'` を含めています。
- 実行時CDN、外部フォント、外部スクリプト、外部APIを必要としません。

GitHub Pages版では最初のHTMLを取得する通信は発生します。ネットワークを完全に切って使う場合は、生成済みの `dist/index.html` をローカルで開いてください。ただし `file://` からのマイク利用可否はブラウザーのセキュリティ方針に依存します。

## ブラウザー・端末について

現在の主要なChromium / Firefox / Safariのデスクトップ・モバイルを対象にしています。

ブラウザー標準の音声APIは環境によって差があるため、以下は端末やブラウザーによって挙動が異なります。

- マイク権限、特にローカル `file://` から開いた場合
- 利用可能なマイク入力デバイス名
- MediaRecorderの対応状況、録音コンテナ・コーデック
- Screen Wake Lockの利用可否
- ブラウザーやOSがページを休止した場合のバックグラウンド音声
- マイク品質、自動ゲイン、ノイズ抑制、端末固有の音声フィルタ

チューニング時は、できるだけ端末を楽器の近くに置き、周囲の大きな音を減らすと安定しやすくなります。

## 制限事項

- チューナー精度はマイク品質、入力レベル、周囲のノイズ、楽器の倍音構成に影響されます。
- 非常に低い音では、検出が安定するまで少し長めに音を伸ばす必要があります。
- 校正された測定器ではなく、楽器練習用の補助ツールです。
- ブラウザーのバックグラウンド制限や端末スリープによって、長時間の音声再生が影響を受ける場合があります。
- Wake LockはOSやブラウザーの判断で解除される場合があります。
- ページを再読み込み・終了すると、保存していない録音は失われます。
- 録音形式は現在のブラウザーが対応している形式から選択するため、端末によって異なります。

## 使用ライブラリ / API

Music Practice Kitは現在、**サードパーティのランタイムライブラリを使用していません**。主要機能はブラウザー標準APIで実装しています。

| API | 用途 |
| --- | --- |
| Web Audio API | チューナー解析、メトロノーム、ドローン、効果音 |
| Media Capture and Streams | マイク入力 |
| MediaRecorder | 端末内録音 |
| Canvas 2D | チューニング表示、スペクトラム描画 |
| Screen Wake Lock | 対応環境で練習中の画面消灯を抑制 |
| Web Storage | 設定のローカル保存 |

依存・ライセンスの詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を確認してください。

## コントリビューション

バグ報告や機能提案はIssueからお願いします。開発への参加方法は [CONTRIBUTING.md](CONTRIBUTING.md) を確認してください。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。

### 自動回帰テスト

依存ライブラリー不要のテストには Node.js 18以上が必要です。ビルド後に `node --test` を実行します。リポジトリーチェックでメトロノームの動作を、単一HTML検証で生成JavaScript、日英訳、オフライン制約、gzip復元、Browser Kitty用ルートHTMLの一致を確認します。

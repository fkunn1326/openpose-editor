## Openpose Editor

日本語 | [English](README.en.md)|[简体中文](README.zh-cn.md)

![image](https://user-images.githubusercontent.com/92153597/219921945-468b2e4f-a3a0-4d44-a923-13ceb0258ddc.png)

Automatic1111/stable-diffusion-webui用のOpenpose Editor

- ポーズの編集
- ポーズの検出

ができます

- 「Add」: 人を追加する
- 「Detect from image」: 画像からポーズを検出する
- 「Add Background image」: 背景を追加する

- 「Save PNG」: PNGで保存する
- 「Send to ControlNet」: Controlnet拡張機能がインストールされている場合、画像をそこに送る

## インストール方法

1. "Extension" タブを開く
2. "Install from URL" タブを開く
3. "URL for extension's git repository" 欄にこのリポジトリの URL (https://github.com/fkunn1326/openpose-editor.git) を入れます。
4. "Install" ボタンを押す
5. WebUIを再起動する

## 注意

ConrtolNetの "Preprocessor" には、何も指定しないようにしてください。

## エラーの対策

> urllib.error.URLError: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:997)>


以下のファイルを開いてださい
```
/Applications/Python\ $version /Install\ Certificates.command
```

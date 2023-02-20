## Openpose Editor

[日本語](README.md) | [English](README.en.md)|中文

![image](https://user-images.githubusercontent.com/92153597/219921945-468b2e4f-a3a0-4d44-a923-13ceb0258ddc.png)

适用于Automatic1111/stable-diffusion-webui 的Openpose Editor 插件。

功能：
- 直接编辑骨骼动作
- 从图像识别姿势

本插件实现以下操作：

-  「Add」：添加一个新骨骼
-  「Detect from image」: 从图片中识别姿势
-  「Add Background image」: 添加背景图片
-  「Load JSON」：载入JSON文件

-  「Save PNG」: 保存为PNG格式图片
-  「Send to ControlNet」:将骨骼姿势发送到 ControlNet 
-  「Save JSON」：将骨骼保存为JSON
## 安装方法

1. 打开扩展（Extension）标签。
2. 点击从网址安装（Install from URL）
3. 在扩展的 git 仓库网址（URL for extension's git repository）处输入 https://github.com/fkunn1326/openpose-editor.git
4. 点击安装（Install）
5. 重启 WebUI
## 注意

不要给ConrtolNet 的 "Preprocessor" 选项指定任何值，请保持在none状态

## 常见问题
Mac OS可能会出现：
> urllib.error.URLError: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:997)>

请执行文件
```
/Applications/Python\ $version /Install\ Certificates.command
```

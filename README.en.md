## Openpose Editor

[日本語](README.md) | English

![image](https://user-images.githubusercontent.com/92153597/219921945-468b2e4f-a3a0-4d44-a923-13ceb0258ddc.png)

Openpose Editor for Automatic1111/stable-diffusion-webui

- Pose editing
- Pose detection

This can:

-  Add a new person
-  Detect pose from an image
-  Add background image

-  Save as a PNG
-  Send to ControlNet extension

## Installation

1. Open the "Extension" tab
2. Click on "Install from URL"
3. In "URL for extension's git repository" enter this extension, https://github.com/fkunn1326/openpose-editor.git
4. Click "Install"
5. Restart WebUI

## Attention

Do not select anything for the Preprocessor in ControlNet.


## Fix Error
> urllib.error.URLError: <urlopen error [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:997)>

Run
```
/Applications/Python\ $version /Install\ Certificates.command
```

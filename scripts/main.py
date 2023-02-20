import os
import numpy as np
import cv2

import gradio as gr

import modules.scripts as scripts
from modules import script_callbacks
from modules import extensions

from basicsr.utils.download_util import load_file_from_url

from scripts.openpose.body import Body

body_estimation = None

def pil2cv(in_image):
  out_image = np.array(in_image, dtype=np.uint8)

  if out_image.shape[2] == 3:
      out_image = cv2.cvtColor(out_image, cv2.COLOR_RGB2BGR)
  return out_image

def candidate2li(li):
  res = []
  for x, y, *_ in li:
    res.append([x, y])
  return res

def subset2li(li):
  res = []
  for r in li:
    for c in r:
      res.append(c)
  return res

class Script(scripts.Script):
  def __init__(self) -> None:
    super().__init__()

  def title(self):
    return "OpenPose Editor"

  def show(self, is_img2img):
    return scripts.AlwaysVisible

  def ui(self, is_img2img):
    return ()

def on_ui_tabs():
  with gr.Blocks(analytics_enabled=False) as openpose_editor:
    with gr.Row():
      with gr.Column():
        width = gr.Slider(label="width", minimum=64, maximum=2048, value=512, step=64, interactive=True)
        height = gr.Slider(label="height", minimum=64, maximum=2048, value=512, step=64, interactive=True)
        with gr.Row():
          add = gr.Button(value="Add", variant="primary")
          # delete = gr.Button(value="Delete")
        with gr.Row():
          reset_btn = gr.Button(value="Reset")
          json_input = gr.Button(value="Load from JSON")
          png_input = gr.Button(value="Detect from image")
          png_input_area = gr.Image(label="Detect from image", elem_id="openpose_editor_input")
          bg_input = gr.Button(value="Add Background image")

      with gr.Column():
        # gradioooooo...
        canvas = gr.HTML('<canvas id="openpose_editor_canvas" width="512" height="512" style="margin: 0.25rem; border-radius: 0.25rem; border: 0.5px solid"></canvas>')
        jsonbox = gr.Text(label="json", elem_id="hide_json")
        with gr.Row():
          json_output = gr.Button(value="Save JSON")
          png_output = gr.Button(value="Save PNG")
          send_output = gr.Button(value="Send to ControlNet")

    def estimate(img):
      global body_estimation

      modeldir = os.path.join(extensions.extensions_dir, "sd-webui-controlnet", "annotator", "openpose")
      if body_estimation is None:
        if not os.path.isfile(os.path.join(modeldir, "body_pose_model.pth")):
          body_model_path = "https://huggingface.co/lllyasviel/ControlNet/resolve/main/annotator/ckpts/body_pose_model.pth"
          load_file_from_url(body_model_path, model_dir=modeldir)
        body_estimation = Body(os.path.join(modeldir, "body_pose_model.pth"))
        
      candidate, subset = body_estimation(pil2cv(img))

      result = {
        "candidate": candidate2li(candidate),
        "subset": subset2li(subset)
      }
      
      return result


    width.change(None, [width, height], None, _js="(w, h) => {resizeCanvas(w, h)}")
    height.change(None, [width, height], None, _js="(w, h) => {resizeCanvas(w, h)}")
    png_output.click(None, [], None, _js="savePNG")
    bg_input.click(None, [], None, _js="addBackground")
    png_input.click(None, [], None, _js="detectImage")
    add.click(None, [], None, _js="addPose")
    png_input_area.change(estimate, [png_input_area], [jsonbox])
    send_output.click(None, [], None, _js="sendImage")
    reset_btn.click(None, [], None, _js="resetCanvas")
    json_input.click(None, None, [width, height], _js="loadJSON")
    json_output.click(None, None, None, _js="saveJSON")

  return [(openpose_editor, "OpenPose Editor", "openpose_editor")]

script_callbacks.on_ui_tabs(on_ui_tabs)
import os
import io
import json
import numpy as np
import cv2

import gradio as gr

import modules.scripts as scripts
from modules import script_callbacks
from modules.shared import opts
from modules.paths import models_path

from basicsr.utils.download_util import load_file_from_url

from scripts.openpose.body import Body

from PIL import Image

body_estimation = None
presets_file = os.path.join(scripts.basedir(), "presets.json")
presets = {}

try: 
  with open(presets_file) as file:
    presets = json.load(file)
except FileNotFoundError:
  pass

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
          json_input = gr.UploadButton(label="Load from JSON", file_types=[".json"], elem_id="openpose_json_button")
          png_input = gr.UploadButton(label="Detect from Image", file_types=["image"], type="bytes", elem_id="openpose_detect_button")
          bg_input = gr.UploadButton(label="Add Background Image", file_types=["image"], elem_id="openpose_bg_button")
        with gr.Row():
          preset_list = gr.Dropdown(label="Presets", choices=sorted(presets.keys()), interactive=True)
          preset_load = gr.Button(value="Load Preset")
          preset_save = gr.Button(value="Save Preset")

      with gr.Column():
        # gradioooooo...
        canvas = gr.HTML('<canvas id="openpose_editor_canvas" width="512" height="512" style="margin: 0.25rem; border-radius: 0.25rem; border: 0.5px solid"></canvas>')
        jsonbox = gr.Text(label="json", elem_id="jsonbox", visible=False)
        with gr.Row():
          json_output = gr.Button(value="Save JSON")
          png_output = gr.Button(value="Save PNG")
          send_t2t = gr.Button(value="Send to txt2img")
          send_i2i = gr.Button(value="Send to img2img")
          control_net_max_models_num = getattr(opts, 'control_net_max_models_num', 0)
          select_target_index = gr.Dropdown([str(i) for i in range(control_net_max_models_num)], label="Send to", value="0", interactive=True, visible=(control_net_max_models_num > 1))

    def estimate(file):
      global body_estimation

      if body_estimation is None:
        model_path = os.path.join(models_path, "openpose", "body_pose_model.pth")
        if not os.path.isfile(model_path):
          body_model_path = "https://huggingface.co/lllyasviel/ControlNet/resolve/main/annotator/ckpts/body_pose_model.pth"
          load_file_from_url(body_model_path, model_dir=os.path.join(models_path, "openpose"))
        body_estimation = Body(model_path)
        
      stream = io.BytesIO(file)
      img = Image.open(stream)
      candidate, subset = body_estimation(pil2cv(img))

      result = {
        "candidate": candidate2li(candidate),
        "subset": subset2li(subset),
      }
      
      return str(result).replace("'", '"')

    def savePreset(name, data):
      if name:
        presets[name] = json.loads(data)
        with open(presets_file, "w") as file:
          json.dump(presets, file)
        return gr.update(choices=sorted(presets.keys()), value=name), json.dumps(data)
      return gr.update(), gr.update()

    dummy_component = gr.Label(visible=False)
    preset = gr.Text(visible=False)
    width.change(None, [width, height], None, _js="(w, h) => {resizeCanvas(w, h)}")
    height.change(None, [width, height], None, _js="(w, h) => {resizeCanvas(w, h)}")
    png_output.click(None, [], None, _js="savePNG")
    bg_input.upload(None, [], [width, height], _js="() => {addBackground('openpose_bg_button')}")
    png_input.upload(estimate, png_input, jsonbox)
    png_input.upload(None, [], [width, height], _js="() => {addBackground('openpose_detect_button')}")
    add.click(None, [], None, _js="addPose")
    send_t2t.click(None, select_target_index, None, _js="(i) => {sendImage('txt2img', i)}")
    send_i2i.click(None, select_target_index, None, _js="(i) => {sendImage('img2img', i)}")
    reset_btn.click(None, [], None, _js="resetCanvas")
    json_input.upload(None, json_input, [width, height], _js="() => {loadJSON('openpose_json_button')}")
    json_output.click(None, None, None, _js="saveJSON")
    preset_save.click(savePreset, [dummy_component, dummy_component], [preset_list, preset], _js="savePreset")
    preset_load.click(None, preset, [width, height], _js="loadPreset")
    preset_list.change(lambda selected: json.dumps(presets[selected]), preset_list, preset)

  return [(openpose_editor, "OpenPose Editor", "openpose_editor")]

script_callbacks.on_ui_tabs(on_ui_tabs)

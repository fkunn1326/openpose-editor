fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#108ce6';
fabric.Object.prototype.borderColor = '#108ce6';
fabric.Object.prototype.cornerSize = 10;

let count = 0;
let executed_openpose_editor = false;

let lockMode = false;
const undo_history = [];
const redo_history = [];

coco_body_keypoints = [
    "nose",
    "neck",
    "right_shoulder",
    "right_elbow",
    "right_wrist",
    "left_shoulder",
    "left_elbow",
    "left_wrist",
    "right_hip",
    "right_knee",
    "right_ankle",
    "left_hip",
    "left_knee",
    "left_ankle",
    "right_eye",
    "left_eye",
    "right_ear",
    "left_ear",
]

let connect_keypoints = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [14, 0], [14, 16], [15, 0], [15, 17]]

let connect_color = [[0, 0, 255], [255, 0, 0], [255, 170, 0], [255, 255, 0], [255, 85, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0],
[0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [85, 0, 255],
[170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]

let openpose_obj = {
    // width, height
    resolution: [512, 512],
    // fps...?
    fps: 1,
    // frames
    frames: [
        {
            frame_current: 1,
            // armatures
            armatures: {
            },
        }
    ]
}

let visibleEyes = true;
let flipped = false;
const default_keypoints = [[241,77],[241,120],[191,118],[177,183],[163,252],[298,118],[317,182],[332,245],[225,241],[213,359],[215,454],[270,240],[282,360],[286,456],[232,59],[253,60],[225,70],[260,72]]

async function fileToDataUrl(file) {
    if (file.data) {
        // Gradio version < 3.23
        return file.data
    }
    return await new Promise(r => {let a=new FileReader(); a.onload=r; a.readAsDataURL(file.blob)}).then(e => e.target.result)
}

function calcResolution(width, height){
    const viewportWidth = window.innerWidth / 2.25;
    const viewportHeight = window.innerHeight * 0.75;
    const ratio = Math.min(viewportWidth / width, viewportHeight / height);
    return {width: width * ratio, height: height * ratio}
}

function resizeCanvas(width, height){
    const elem = openpose_editor_elem;
    const canvas = openpose_editor_canvas;

    let resolution = calcResolution(width, height)

    canvas.setWidth(width);
    canvas.setHeight(height);
    elem.style.width = resolution["width"] + "px"
    elem.style.height = resolution["height"] + "px"
    elem.nextElementSibling.style.width = resolution["width"] + "px"
    elem.nextElementSibling.style.height = resolution["height"] + "px"
    elem.parentElement.style.width = resolution["width"] + "px"
    elem.parentElement.style.height = resolution["height"] + "px"
}

function undo() {
    const canvas = openpose_editor_canvas;
    if (undo_history.length > 0) {
        lockMode = true;
        if (undo_history.length > 1) redo_history.push(undo_history.pop());
        const content = undo_history[undo_history.length - 1];
        canvas.loadFromJSON(content, function () {
            canvas.renderAll();
            lockMode = false;
        });
    }
}

function redo() {
    const canvas = openpose_editor_canvas;
    if (redo_history.length > 0) {
        lockMode = true;
        const content = redo_history.pop();
        undo_history.push(content);
        canvas.loadFromJSON(content, function () {
        canvas.renderAll();
            lockMode = false;
        });
    }
}

function setPose(keypoints){
    const canvas = openpose_editor_canvas;
    
    canvas.clear()

    canvas.backgroundColor = "#000"

    const res = [];
    for (let i = 0; i < keypoints.length; i += 18) {
        const chunk = keypoints.slice(i, i + 18);
        res.push(chunk);
    }

    for (item of res){
        addPose(item)
        openpose_editor_canvas.discardActiveObject();
    }
}

function addPose(keypoints=undefined){
    if (keypoints === undefined){
        keypoints = default_keypoints;
    }

    const canvas = openpose_editor_canvas;
    const group = new fabric.Group()

    function makeCircle(color, left, top, line1, line2, line3, line4, line5) {
        var c = new fabric.Circle({
            left: left,
            top: top,
            strokeWidth: 1,
            radius: 5,
            fill: color,
            stroke: color,
            originX: 'center',
            originY: 'center',
        });
        c.hasControls = c.hasBorders = false;

        c.line1 = line1;
        c.line2 = line2;
        c.line3 = line3;
        c.line4 = line4;
        c.line5 = line5;

        return c;
    }

    function makeLine(coords, color) {
        return new fabric.Line(coords, {
            fill: color,
            stroke: color,
            strokeWidth: 10,
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
        });
    }

    const lines = []
    const circles = []

    for (i = 0; i < connect_keypoints.length; i++){
        // 接続されるidxを指定　[0, 1]なら0と1つなぐ
        const item = connect_keypoints[i]
        const line = makeLine(keypoints[item[0]].concat(keypoints[item[1]]), `rgba(${connect_color[i].join(", ")}, 0.7)`)
        lines.push(line)
        canvas.add(line)
        line['id'] = item[0];
    }

    for (i = 0; i < keypoints.length; i++){
        list = []
        connect_keypoints.filter((item, idx) => {
            if(item.includes(i)){
                list.push(lines[idx])
                return idx
            }
        })
        circle = makeCircle(`rgb(${connect_color[i].join(", ")})`, keypoints[i][0], keypoints[i][1], ...list)
        circle["id"] = i
        circles.push(circle)
        // canvas.add(circle)
        group.addWithUpdate(circle);
    }

    canvas.discardActiveObject();
    canvas.setActiveObject(group);
    canvas.add(group);
    group.toActiveSelection();
    canvas.requestRenderAll();
}

function initCanvas(elem){
    const canvas = window.openpose_editor_canvas = new fabric.Canvas(elem, {
        backgroundColor: '#000',
        // selection: false,
        preserveObjectStacking: true
    });

    window.openpose_editor_elem = elem

    function updateLines(target) {
        if ("_objects" in target) {
            const flipX = target.flipX ? -1 : 1;
            const flipY = target.flipY ? -1 : 1;
            flipped = flipX * flipY === -1;
            const showEyes = flipped ? !visibleEyes : visibleEyes;

            if (target.angle === 0) {
                const rtop = target.top
                const rleft = target.left
                for (const item of target._objects){
                    let p = item;
                    p.scaleX = 1;
                    p.scaleY = 1;
                    const top = rtop + p.top * target.scaleY * flipY + target.height * target.scaleY / 2;
                    const left = rleft + p.left * target.scaleX * flipX + (target.width * target.scaleX / 2);
                    p['_top'] = top;
                    p['_left'] = left;
                    if (p["id"] === 0) {
                        p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                    }else{
                        p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                    }
                    if (p['id'] === 14 || p['id'] === 15) {
                        p.radius = showEyes ? 5 : 0;
                        if (p.line1) p.line1.strokeWidth = showEyes ? 10 : 0;
                        if (p.line2) p.line2.strokeWidth = showEyes ? 10 : 0;
                    }
                    p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                    p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                    p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                    p.line5 && p.line5.set({ 'x1': left, 'y1': top });

                }
            } else {
                const aCoords = target.aCoords;
                const center = {'x': (aCoords.tl.x + aCoords.br.x)/2, 'y': (aCoords.tl.y + aCoords.br.y)/2};
                const rad = target.angle * Math.PI / 180;
                const sin = Math.sin(rad);
                const cos = Math.cos(rad);
    
                for (const item of target._objects){
                    let p = item;
                    const p_top = p.top * target.scaleY * flipY;
                    const p_left = p.left * target.scaleX * flipX;
                    const left = center.x + p_left * cos - p_top * sin;
                    const top = center.y + p_left * sin + p_top * cos;
                    p['_top'] = top;
                    p['_left'] = left;
                    if (p["id"] === 0) {
                        p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                    }else{
                        p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                    }
                    if (p['id'] === 14 || p['id'] === 15) {
                        p.radius = showEyes ? 5 : 0.3;
                        if (p.line1) p.line1.strokeWidth = showEyes ? 10 : 0;
                        if (p.line2) p.line2.strokeWidth = showEyes ? 10 : 0;
                    }
                    p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                    p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                    p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                    p.line5 && p.line5.set({ 'x1': left, 'y1': top });
                }
            }
        } else {
            var p = target;
            if (p["id"] === 0) {
                p.line1 && p.line1.set({ 'x1': p.left, 'y1': p.top });
            }else{
                p.line1 && p.line1.set({ 'x2': p.left, 'y2': p.top });
            }
            p.line2 && p.line2.set({ 'x1': p.left, 'y1': p.top });
            p.line3 && p.line3.set({ 'x1': p.left, 'y1': p.top });
            p.line4 && p.line4.set({ 'x1': p.left, 'y1': p.top });
            p.line5 && p.line5.set({ 'x1': p.left, 'y1': p.top });
        }
        canvas.renderAll();
    }

    canvas.on('object:moving', function(e) {
        updateLines(e.target);
    });

    canvas.on('object:scaling', function(e) {
        updateLines(e.target);
        canvas.renderAll();
    });

    canvas.on('object:rotating', function(e) {
        updateLines(e.target);
        canvas.renderAll();
    });

    canvas.on("object:modified", function () {
        if (lockMode) return;
        undo_history.push(JSON.stringify(canvas));
        redo_history.length = 0;
    });

    resizeCanvas(...openpose_obj.resolution)

    setPose(default_keypoints)

    undo_history.push(JSON.stringify(canvas));

    const json_observer = new MutationObserver((m) => {
        if(gradioApp().querySelector('#tab_openpose_editor').style.display!=='block') return;
        try {
            const raw = gradioApp().querySelector("#jsonbox").querySelector("textarea").value
            if(raw.length!==0) detectImage(raw);
        } catch(e){console.log(e)}
    })
    json_observer.observe(gradioApp().querySelector("#jsonbox"), { "attributes": true })

    // document.addEventListener('keydown', function(e) {
    //     if (e.key !== undefined) {
    //         if((e.key == "z" && (e.metaKey || e.ctrlKey || e.altKey))) undo()
    //         if((e.key == "y" && (e.metaKey || e.ctrlKey || e.altKey))) redo()
    //     }
    // })
}

function resetCanvas(){
    const canvas = openpose_editor_canvas;
    canvas.clear()
    canvas.backgroundColor = "#000"
}

function savePNG(){
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 0
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0
    openpose_editor_canvas.discardActiveObject();
    openpose_editor_canvas.renderAll()
    openpose_editor_elem.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "pose.png";
        a.click();
        URL.revokeObjectURL(a.href);
    });
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 1
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0.5
    openpose_editor_canvas.renderAll()
    return openpose_editor_canvas
}

function serializeJSON(){
    const json = JSON.stringify({
        "width": openpose_editor_canvas.width,
        "height": openpose_editor_canvas.height,
        "keypoints": openpose_editor_canvas.getObjects().filter((item) => {
            if (item.type === "circle") return item
        }).map((item) => {
            return [Math.round(item.left), Math.round(item.top)]
        })
    }, null, 4)
    return json;
}

function saveJSON(){
    const json = serializeJSON()
    const blob = new Blob([json], {
        type: "application/json"
    });
    const filename = "pose-" + Date.now().toString() + ".json"
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

async function loadJSON(file){
    const url = await fileToDataUrl(file)
    const response = await fetch(url)
    const json = await response.json()
    if (json["width"] && json["height"]) {
        resizeCanvas(json["width"], json["height"])
    }else{
        throw new Error('width, height is invalid');
    }
    if (json["keypoints"].length % 18 === 0) {
        setPose(json["keypoints"])
    }else{
        throw new Error('keypoints is invalid')
    }
    return [json["width"], json["height"]]
}

function savePreset(){
    var name = prompt("Preset Name")
    const json = serializeJSON()
    return [name, json]
}

function loadPreset(json){
    try {
        json = JSON.parse(json)
        if (json["width"] && json["height"]) {
            resizeCanvas(json["width"], json["height"])
        }else{
            throw new Error('width, height is invalid');
        }
        if (json["keypoints"].length % 18 === 0) {
            setPose(json["keypoints"])
        }else{
            throw new Error('keypoints is invalid')
        }
        return [json["width"], json["height"]]
    }catch(e){
        console.error(e)
        alert("Invalid JSON")
    }
}

async function addBackground(file){
    const url = await fileToDataUrl(file)
    openpose_editor_canvas.setBackgroundImage(url, openpose_editor_canvas.renderAll.bind(openpose_editor_canvas), {
        opacity: 0.5
    });
    const img = new Image();
    await (img.src = url);
    resizeCanvas(img.width, img.height)
    return [img.width, img.height]
}

function detectImage(raw){
    const json = JSON.parse(raw)

    let candidate = json["candidate"]
    let subset = json["subset"]
    const li = []
    subset = subset.splice(0, 18)
    for (i=0; subset.length > i; i++){
        if (Number.isInteger(subset[i]) && subset[i] >= 0){
            li.push(candidate[subset[i]])
        }else{
            li.push([-1,-1])
        }
    }
    if(li.length === 0){
        const bgimage = openpose_editor_canvas.backgroundImage
        setPose(li);
        openpose_editor_canvas.backgroundImage = bgimage
        return;
    }
    if(li.every(([x,y])=>x===-1&&y===-1)){
        const ra_width = Math.floor(Math.random() * openpose_editor_canvas.width)
        const ra_height = Math.floor(Math.random() * openpose_editor_canvas.height)
        li[0] = [ra_width, ra_height]
    }
    default_relative_keypoints = []
    for(i=0;i<default_keypoints.length;i++){
        default_relative_keypoints.push([])
        for(j=0;j<default_keypoints.length;j++){
            x = default_keypoints[j][0] - default_keypoints[i][0];
            y = default_keypoints[j][1] - default_keypoints[i][1];
            default_relative_keypoints[i].push([x,y])
        }
    }
    kp_connect = (i,j)=>{
        for(idx=0;idx<connect_keypoints.length;idx++){
            cp = connect_keypoints[idx];
            if(((cp[0]===i)&&(cp[1]===j)) || ((cp[0]===j)&&(cp[1]===i))){
                return true;
            }
        }
        return false;
    }
    // bfs propagate
    while(li.some(([x,y])=>x===-1&&y===-1)){
        for(i=0;i<li.length;i++){
            if(li[i][0]===-1){
                continue;
            }
            for(j=0;j<li.length;j++){
                if(li[j][0]===-1 && kp_connect(i,j)){
                    x = li[i][0] + default_relative_keypoints[i][j][0]
                    y = li[i][1] + default_relative_keypoints[i][j][1]
                    x = Math.min(Math.max(x, 0), openpose_editor_canvas.width);
                    y = Math.min(Math.max(y, 0), openpose_editor_canvas.height);
                    li[j] = [x,y];
                }
            }
        }
    }
    const bgimage = openpose_editor_canvas.backgroundImage
    setPose(li);
    openpose_editor_canvas.backgroundImage = bgimage
}

function sendImage(type, index){
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 0
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0
    openpose_editor_canvas.discardActiveObject();
    openpose_editor_canvas.renderAll()
    openpose_editor_elem.toBlob((blob) => {
        const file = new File(([blob]), "pose.png")
        const dt = new DataTransfer();
        dt.items.add(file);
        const list = dt.files
        const selector = type === "txt2img" ? "#txt2img_script_container" : "#img2img_script_container"
        if (type === "txt2img"){
            switch_to_txt2img()
        }else if(type === "img2img"){
            switch_to_img2img()
        }

        const isNew =  window.gradio_config.version.replace("\n", "") >= "3.23.0"
        const accordion_selector = isNew ? "#controlnet > .label-wrap > .icon" : "#controlnet .transition"
        const accordion = gradioApp().querySelector(selector).querySelector(accordion_selector)
        if (isNew ? accordion.style.transform == "rotate(90deg)" : accordion.classList.contains("rotate-90")) {
            accordion.click()
        }
        
        let input = gradioApp().querySelector(selector).querySelector("#controlnet").querySelector("input[type='file']");
        
        const input_image = (input) =>{
            try {
                if(input.previousElementSibling  
                    && input.previousElementSibling.previousElementSibling 
                    && input.previousElementSibling.previousElementSibling.querySelector("button[aria-label='Clear']")) {
                input.previousElementSibling.previousElementSibling.querySelector("button[aria-label='Clear']").click()
                }
            } catch (e) {
                console.error(e)
            }
            input.value = "";
            input.files = list;
            const event = new Event('change', { 'bubbles': true, "composed": true });
            input.dispatchEvent(event);
        }

        if (input == null){
            const callback = (observer) => {
                input = gradioApp().querySelector(selector).querySelector("#controlnet").querySelector("input[type='file']");
                if (input == null) {
                    console.error('input[type=file] NOT exists')
                    return
                }else{
                    input_image(input)
                    observer.disconnect()
                }
            }
            const observer = new MutationObserver(callback);
            observer.observe(gradioApp().querySelector(selector).querySelector("#controlnet"), { childList: true });
        }else{
            input_image(input)
        }
    });
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 1
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0.5
    openpose_editor_canvas.renderAll()
}

function canvas_onDragOver(event) {
    canvas_drag_overlay = gradioApp().querySelector("#canvas_drag_overlay");

    if (event.dataTransfer.items[0].type.startsWith("image/")) {
        event.preventDefault();
        canvas_drag_overlay.textContent = "Add Background";
        canvas_drag_overlay.style.visibility = "visible";
    } else if (event.dataTransfer.items[0].type == "application/json") {
        event.preventDefault();
        canvas_drag_overlay.textContent = "Load JSON";
        canvas_drag_overlay.style.visibility = "visible";
    }
}

function canvas_onDrop(event) {
    canvas_drag_overlay = gradioApp().querySelector("#canvas_drag_overlay");

    if (event.dataTransfer.items[0].type.startsWith("image/")) {
        event.preventDefault();
        input = gradioApp().querySelector("#openpose_bg_button").previousElementSibling;
        input.files = event.dataTransfer.files;
        const changeEvent = new Event('change', { 'bubbles': true, "composed": true });
        input.dispatchEvent(changeEvent);
        canvas_drag_overlay.style.visibility = "hidden";
    } else if (event.dataTransfer.items[0].type == "application/json") {
        event.preventDefault();
        input = gradioApp().querySelector("#openpose_json_button").previousElementSibling;
        input.files = event.dataTransfer.files;
        const changeEvent = new Event('change', { 'bubbles': true, "composed": true });
        input.dispatchEvent(changeEvent);
        canvas_drag_overlay.style.visibility = "hidden";
    }
}

function button_onDragOver(event) {
    if (((event.target.id == "openpose_detect_button" || event.target.id == "openpose_bg_button") && event.dataTransfer.items[0].type.startsWith("image/")) ||
        (event.target.id == "openpose_json_button" && event.dataTransfer.items[0].type == "application/json")) {
        event.preventDefault();
        event.target.classList.remove("gr-button-secondary");
    }
}

function button_onDragLeave(event) {
    event.target.classList.add("gr-button-secondary");
}

function detect_onDrop(event) {
    if (event.dataTransfer.items[0].type.startsWith("image/")) {
        event.preventDefault();
        input = event.target.previousElementSibling;
        input.files = event.dataTransfer.files;
        const changeEvent = new Event('change', { 'bubbles': true, "composed": true });
        input.dispatchEvent(changeEvent);
    }
}

function json_onDrop(event) {
    if (event.dataTransfer.items[0].type == "application/json") {
        event.preventDefault();
        input = event.target.previousElementSibling;
        input.files = event.dataTransfer.files;
        const changeEvent = new Event('change', { 'bubbles': true, "composed": true });
        input.dispatchEvent(changeEvent);
    }
}

onUiLoaded(function() {
    initCanvas(gradioApp().querySelector('#openpose_editor_canvas'))

    var canvas_drag_overlay = document.createElement("div");
    canvas_drag_overlay.id = "canvas_drag_overlay"
    canvas_drag_overlay.style = "pointer-events: none; visibility: hidden; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: white; font-size: 2.5em; font-family: inherit; font-weight: 600; line-height: 100%; background: rgba(0,0,0,0.5); margin: 0.25rem; border-radius: 0.25rem; border: 0.5px solid; position: absolute;"

    var canvas = gradioApp().querySelector("#tab_openpose_editor .canvas-container")
    canvas.appendChild(canvas_drag_overlay)
    canvas.addEventListener("dragover", canvas_onDragOver);
    canvas.addEventListener("dragleave", () => gradioApp().querySelector("#canvas_drag_overlay").style.visibility = "hidden");
    canvas.addEventListener("drop", canvas_onDrop);

    var bg_button = gradioApp().querySelector("#openpose_bg_button")
    bg_button.addEventListener("dragover", button_onDragOver);
    bg_button.addEventListener("dragleave", button_onDragLeave);
    bg_button.addEventListener("drop", canvas_onDrop);
    bg_button.addEventListener("drop", event => event.target.classList.add("gr-button-secondary"));
    bg_button.classList.add("gr-button-secondary");

    var detect_button = gradioApp().querySelector("#openpose_detect_button")
    detect_button.addEventListener("dragover", button_onDragOver);
    detect_button.addEventListener("dragleave", button_onDragLeave);
    detect_button.addEventListener("drop", detect_onDrop);
    detect_button.classList.add("gr-button-secondary");
    
    var json_button = gradioApp().querySelector("#openpose_json_button")
    json_button.addEventListener("dragover", button_onDragOver);
    json_button.addEventListener("dragleave", button_onDragLeave);
    json_button.addEventListener("drop", json_onDrop);
    json_button.classList.add("gr-button-secondary");

})

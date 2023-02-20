fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#108ce6';
fabric.Object.prototype.borderColor = '#108ce6';
fabric.Object.prototype.cornerSize = 10;
fabric.Object.prototype.lockRotation = true;

let count = 0;
let executed = false;

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

let connect_keypoints = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [0, 14], [14, 16], [0, 15], [15, 17]]

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

const default_keypoints = [[241,77],[241,120],[191,118],[177,183],[163,252],[298,118],[317,182],[332,245],[225,241],[213,359],[215,454],[270,240],[282,360],[286,456],[232,59],[253,60],[225,70],[260,72]]

function gradioApp() {
    const elems = document.getElementsByTagName('gradio-app')
    const gradioShadowRoot = elems.length == 0 ? null : elems[0].shadowRoot
    return !!gradioShadowRoot ? gradioShadowRoot : document;
}

function calcResolution(resolution){
    const width = resolution[0]
    const height = resolution[1]
    const viewportWidth = window.innerWidth / 2.25;
    const viewportHeight = window.innerHeight * 0.75;
    const ratio = Math.min(viewportWidth / width, viewportHeight / height);
    return {width: width * ratio, height: height * ratio}
}

function resizeCanvas(width, height){
    const elem = openpose_editor_elem;
    const canvas = openpose_editor_canvas;

    let resolution = calcResolution([width, height])

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
            stroke: color
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

    canvas.on('object:moving', function(e) {
        if ("_objects" in e.target) {
            const rtop = e.target.top
            const rleft = e.target.left
            for (const item of e.target._objects){
                let p = item;
                const top = rtop + p.top * e.target.scaleY + e.target.height * e.target.scaleY / 2;
                const left = rleft + p.left * e.target.scaleX + e.target.width * e.target.scaleX / 2;
                if (p["id"] === 0) {
                    p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                }else{
                    p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                }
                p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                p.line5 && p.line5.set({ 'x1': left, 'y1': top });
            }
        }else{
            var p = e.target;
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
    });

    canvas.on('object:scaling', function(e) {
        if ("_objects" in e.target) {
            const rtop = e.target.top
            const rleft = e.target.left
            for (const item of e.target._objects){
                let p = item;
                const top = rtop + p.top * e.target.scaleY + e.target.height * e.target.scaleY / 2;
                const left = rleft + p.left * e.target.scaleX + e.target.width * e.target.scaleX / 2;
                if (p["id"] === 0) {
                    p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                }else{
                    p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                }
                p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                p.line5 && p.line5.set({ 'x1': left, 'y1': top });
            }
        }
        canvas.renderAll();
    });

    canvas.on('object:rotating', function(e) {
        if ("_objects" in e.target) {
            const rtop = e.target.top
            const rleft = e.target.left
            for (const item of e.target._objects){
                let p = item;
                const top = rtop + p.top // + e.target.height / 2;
                const left = rleft + p.left // + e.target.width / 2;
                if (p["id"] === 0) {
                    p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                }else{
                    p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                }
                p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                p.line5 && p.line5.set({ 'x1': left, 'y1': top });
            }
        }
        canvas.renderAll();
    });

    canvas.on("object:added", function () {
        if (lockMode) return;
        undo_history.push(JSON.stringify(canvas));
        redo_history.length = 0;
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
            const raw = gradioApp().querySelector("#hide_json").querySelector("textarea").value.replaceAll("'", '"')
            const json = JSON.parse(raw)

            let candidate = json["candidate"]
            let subset = json["subset"]
            const li = []
            subset = subset.splice(0, 18)
            for (i=0; subset.length > i; i++){
                if (Number.isInteger(subset[i]) && subset[i] >= 0){
                    li.push(candidate[subset[i]])
                }else{
                    const ra_width = Math.floor(Math.random() * canvas.width)
                    const ra_height = Math.floor(Math.random() * canvas.height)
                    li.push([ra_width, ra_height])
                }
            }

            setPose(li);

            const fileReader = new FileReader();
            fileReader.onload = function() {
                const dataUri = this.result;
                canvas.setBackgroundImage(dataUri, canvas.renderAll.bind(canvas), {
                    opacity: 0.5
                });
                const img = new Image();
                img.onload = function() {
                    resizeCanvas(this.width, this.height)
                }
                img.src = dataUri;
            }
            fileReader.readAsDataURL(gradioApp().querySelector("#openpose_editor_input").querySelector("input").files[0]);
        } catch(e){console.log(e)}
    })
    json_observer.observe(gradioApp().querySelector("#hide_json"), { "attributes": true })

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
    return
}

function saveJSON(){
    const canvas = openpose_editor_canvas
    const json = JSON.stringify({
        "width": canvas.width,
        "height": canvas.height,
        "keypoints": openpose_editor_canvas.getObjects().filter((item) => {
            if (item.type === "circle") return item
        }).map((item) => {
            return [Math.round(item.left), Math.round(item.top)]
        })
    }, null, 4)
    const blob = new Blob([json], {
        type: 'text/plain'
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pose.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

function loadJSON(){
    const input = document.createElement("input");
    input.type = "file"
    input.click()
    input.addEventListener("change", function(e){
        const file = e.target.files[0];
		var fileReader = new FileReader();
		fileReader.onload = function() {
            try {
                const json = JSON.parse(this.result)
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
		fileReader.readAsText(file);
    })
    input.click()
}

function addBackground(){
    const input = document.createElement("input");
    input.type = "file"
    input.accept = "image/*"
    input.addEventListener("change", function(e){
        const canvas = openpose_editor_canvas
        const file = e.target.files[0];
		var fileReader = new FileReader();
		fileReader.onload = function() {
			var dataUri = this.result;
            canvas.setBackgroundImage(dataUri, canvas.renderAll.bind(canvas), {
                opacity: 0.5
            });
            const img = new Image();
            img.onload = function() {
                resizeCanvas(this.width, this.height)
            }
            img.src = dataUri;
		}
		fileReader.readAsDataURL(file);
    })
    input.click()
}

function detectImage(){
    gradioApp().querySelector("#openpose_editor_input").querySelector("input").click()
}

function sendImage(){
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
        gradioApp().querySelector("#txt2img_script_container").querySelectorAll("span.transition").forEach((elem) => {
            if (elem.previousElementSibling.textContent === "ControlNet"){
                switch_to_txt2img()
                elem.className.includes("rotate-90") && elem.parentElement.click();
                const input = elem.parentElement.parentElement.querySelector("input[type='file']");
                const button = elem.parentElement.parentElement.querySelector("button[aria-label='Clear']")
                button && button.click();
                input.value = "";
                input.files = list;
                const event = new Event('change', { 'bubbles': true, "composed": true });
                input.dispatchEvent(event);
            }
        })
    });
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 1
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0.5
    openpose_editor_canvas.renderAll()
}

window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((m) => {
        if(!executed && gradioApp().querySelector('#openpose_editor_canvas')){
            executed = true;
            initCanvas(gradioApp().querySelector('#openpose_editor_canvas'))
            // gradioApp().querySelectorAll("#tabs > div > button").forEach((elem) => {
            //     if (elem.innerText === "OpenPose Editor") elem.click()
            // })
            observer.disconnect();
        }
    })
    observer.observe(gradioApp(), { childList: true, subtree: true })
})

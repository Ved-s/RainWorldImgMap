var context: CanvasRenderingContext2D;
var canvas: HTMLCanvasElement;
var objects: MapObject[] | null = null;
var layers: ImageMapLayer[] | null = null;

var translationX = 0;
var translationY = 0;
var scale = 1;
var scrollAcc = 0;

class Position {
    x = 0;
    y = 0;
}

class PositionedImage {
    image: HTMLImageElement;
    pos: Position;

    constructor(image: string, pos: Position) {
        this.image = new Image();
        this.image.src = "data:image/png;base64," + image;
        this.pos = pos;
    }
}

class MapObject {
    image: PositionedImage | null = null;
    shade: PositionedImage | null = null;

    layer: string = null!;

    constructor(data: ImageMapObject) {

        this.layer = data.layer;
        if (data.image && data.pos)
            this.image = new PositionedImage(data.image, data.pos);
        
        if (data.shade && data.shade_pos)
            this.shade = new PositionedImage(data.shade, data.shade_pos);
    }
}

class ImageMapDimensions {
    width = 0;
    height = 0;
}

class ImageMapLayer {
    id: string = null!;
    name: string = null!;
    visible: boolean = true;
}

class ImageMapObject {

    layer: string = null!;

    image: string | null = null;
    pos: Position | null = null;

    shade: string | null = null;
    shade_pos: Position | null = null;
}

class SerializedImageMap {
    dimensions: ImageMapDimensions = null!;
    layers: ImageMapLayer[] = null!;
    objects: ImageMapObject[] = null!;
}

function frame() {
    context.resetTransform();

    context.fillStyle = "cornflowerBlue";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.scale(scale, scale);
    context.translate(translationX, translationY);

    if (objects && layers) {
        context.imageSmoothingEnabled = false;
        for (const layer of layers)
            if (layer.visible)
                for (const obj of objects)
                    if (obj.layer == layer.id && obj.shade)
                        context.drawImage(obj.shade.image, obj.shade.pos.x, obj.shade.pos.y);

        for (const layer of layers)
            if (layer.visible)
                for (const obj of objects)
                    if (obj.layer == layer.id && obj.image)
                        context.drawImage(obj.image.image, obj.image.pos.x, obj.image.pos.y);
    }

    context.resetTransform();

    context.fillStyle = "yellow";
    context.fillText(`Objects: ${objects?.length ?? "None"}`, 10, 10);
    context.fillText(`Layers: ${layers?.length ?? "None"}`, 10, 20);
    context.fillText(`Trans: ${translationX}, ${translationY}`, 10, 30);
    context.fillText(`Scale: ${scale}, acc ${scrollAcc}`, 10, 40);
}

function frameHandler() {
    frame();
    window.requestAnimationFrame(frameHandler);
}

async function asyncLoad() {
    let res = await fetch("maps/main.json");
    let map = await res.json() as SerializedImageMap;

    objects = map.objects.map(o => new MapObject(o));
    layers = map.layers;

    let scaleX = canvas.width / map.dimensions.width;
    let scaleY = canvas.height / map.dimensions.height;
    scale = Math.min(scaleX, scaleY);

    // Inverse if the formula used to calculate scale from scroll
    scrollAcc = scale < 1 ? Math.floor((scale - 1) / (scale * 0.2)) : Math.ceil(5 * scale - 5);

    translationX = (canvas.width - map.dimensions.width * scale) / 2 / scale;
    translationY = (canvas.height - map.dimensions.height * scale) / 2 / scale;
}

function onMouseWheel(e: WheelEvent) {
    // cross-browser wheel delta
    e = (window.event || e) as WheelEvent; // old IE support

    console.log(e);

    var delta = Math.max(-1, Math.min(1, ((e as any).wheelDelta || -e.detail)));

    let mouseX = e.offsetX;
    let mouseY = e.offsetY;

    let befX = mouseX / scale + translationX;
    let befY = mouseY / scale + translationY;

    scrollAcc += delta;
    scale = scrollAcc < 0 ? -1 / (0.2 * scrollAcc - 1) : 0.2 * scrollAcc + 1;

    let aftX = mouseX / scale + translationX;
    let aftY = mouseY / scale + translationY;

    translationX += aftX - befX;
    translationY += aftY - befY;

    return false;
}

window.addEventListener("mousemove", (e: MouseEvent) => {
    //dbgX = e.offsetX;
    //dbgY = e.offsetY;

    if ((e.buttons & 1) != 0) {
        translationX += e.movementX / scale;
        translationY += e.movementY / scale;
    }
});

window.addEventListener("resize", (e) => {
    if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
});

window.addEventListener("DOMContentLoaded", (e) => {
    asyncLoad();
    canvas = document.getElementById("maincanvas") as HTMLCanvasElement;
    context = canvas.getContext("2d") as CanvasRenderingContext2D;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // https://stackoverflow.com/a/26067800
    let elm = canvas as any;
    if (elm.addEventListener) {
        // IE9, Chrome, Safari, Opera
        elm.addEventListener("mousewheel", onMouseWheel, false);
        // Firefox
        elm.addEventListener("DOMMouseScroll", onMouseWheel, false);
    }
    // IE 6/7/8
    else {
        elm.attachEvent("onmousewheel", onMouseWheel);
    }

    frameHandler();
});


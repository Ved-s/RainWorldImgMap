var context: CanvasRenderingContext2D;
var canvas: HTMLCanvasElement;
var objects: MapObject[] | null = null;

var translationX = 0;
var translationY = 0;
var scale = 1;
var scrollAcc = 0;

class MapObject 
{
    image: HTMLImageElement | null = null;
    shade: HTMLImageElement | null = null;
    pos: Position;

    constructor (data: ImageMapObject) 
    {
        this.pos = data.pos;
        if (data.image)
        {
            this.image = new Image();
            this.image.src = "data:image/png;base64," + data.image;
        }
        if (data.shade)
        {
            this.shade = new Image();
            this.shade.src = "data:image/png;base64," + data.shade;
        }
    }
}

class ImageMapDimensions 
{
    top = 0;
    left = 0;
    bottom = 0;
    right = 0;
}

class Position 
{
    x = 0;
    y = 0;
}

class ImageMapObject 
{
    image: string | null = null;
    shade: string | null = null;
    pos: Position = null!;
}

class SerializedImageMap 
{
    dimensions: ImageMapDimensions = null!;
    objects: ImageMapObject[] = null!;
}

function frame() 
{
    context.resetTransform();

    context.fillStyle = "cornflowerBlue";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.scale(scale, scale);
    context.translate(translationX, translationY);

    if (objects)
    {
        context.imageSmoothingEnabled = false;
        for (const obj of objects)
        {
            if (obj.shade)
            {
                let ox = 0;
                let oy = 0;

                if (obj.image)
                {
                    ox = (obj.shade.width  - obj.image.width) / 2;
                    oy = (obj.shade.height - obj.image.height) / 2;
                }

                context.drawImage(obj.shade, obj.pos.x - ox, obj.pos.y - oy);
            }
        }

        for (const obj of objects)
        {
            if (obj.image)
            {
                context.drawImage(obj.image, obj.pos.x, obj.pos.y);

                context.lineWidth = 1/scale;
                context.strokeStyle = "lime";
                context.strokeRect(obj.pos.x, obj.pos.y, obj.image.width, obj.image.height);
            }
        }
    }

    context.resetTransform();

    context.fillStyle = "yellow";
    context.fillText(`Objects: ${objects?.length ?? "None"}`, 10, 10);
}

function frameHandler() 
{
    frame();
    window.requestAnimationFrame(frameHandler);
}

async function asyncLoad() 
{
    let res = await fetch("maps/main.json");
    let map = await res.json() as SerializedImageMap;

    objects = map.objects.map(o => new MapObject(o));
}

function onMouseWheel(e: WheelEvent)
{
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

window.addEventListener("mousemove", (e: MouseEvent) => 
{
    //dbgX = e.offsetX;
    //dbgY = e.offsetY;

    if ((e.buttons & 1) != 0)
    {
        translationX += e.movementX / scale;
        translationY += e.movementY / scale;
    }
});

window.addEventListener("resize", (e) => 
{
    if (canvas)
    {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
});

window.addEventListener("DOMContentLoaded", (e) => 
{
    asyncLoad();
    canvas = document.getElementById("maincanvas") as HTMLCanvasElement;
    context = canvas.getContext("2d") as CanvasRenderingContext2D;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // https://stackoverflow.com/a/26067800
    let elm = canvas as any;
    if (elm.addEventListener)
    {
        // IE9, Chrome, Safari, Opera
        elm.addEventListener("mousewheel", onMouseWheel, false);
        // Firefox
        elm.addEventListener("DOMMouseScroll", onMouseWheel, false);
    }
    // IE 6/7/8
    else
    {
        elm.attachEvent("onmousewheel", onMouseWheel);
    }

    frameHandler();
});


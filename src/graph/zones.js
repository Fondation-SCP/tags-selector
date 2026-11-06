import { app } from "../state.js";
import { getChildNodes, getJointId, getRootNodes } from "./nodes.js";
import { getThemeColor } from "./palette.js";
import { isDarkTheme } from "../theme.js";

const   ZONE_PADDING = 24;
const   ZONE_OPACITY = 0.33;
const   ZONE_DARK_OPACITY = 0.28;

const   TRUNK_PADDING = 11;

const   ZONE_BORDER = 3;
const   ZONE_BORDER_SHADE = 0.35;
const   ZONE_DARK_BORDER_SHADE = 0.5;

const   layer =
{
    canvas: null,
    context: null,
    buffer: null,
    bufferContext: null,
    zones: null,
    parts: null,
    moved: true
};

function shadeColor(color, amount)
{
    const   value = parseInt(color.slice(1), 16);

    const   mix = (channel) => amount < 0
        ? Math.round(channel * (1 + amount))
        : Math.round(channel + (255 - channel) * amount);

    return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`;
}

function collectZones(node, zones, parts)
{
    const   owned = [];
    const   expanded = node.data("childIds") != null;

    if (expanded)
    {
        const   part = { nodes: [node], box: null };

        getChildNodes(node).forEach((child, index) =>
        {
            const   joint = app.cy.getElementById(getJointId(node.id(), index));

            if (joint.length > 0 && child.length > 0)
                part.nodes.push(joint, child);
        });

        owned.push(part);
        parts.push(part);
    }

    for (const child of getChildNodes(node))
        if (child.length > 0)
            owned.push(...collectZones(child, zones, parts));

    if (expanded && node.hasClass("tag"))
    {
        const   color = getThemeColor(node.data("zoneColor"));

        zones.push({
            color: color,
            borderColor: shadeColor(color, isDarkTheme() ? ZONE_DARK_BORDER_SHADE : -ZONE_BORDER_SHADE),
            order: node.data("zoneOrder"),
            parts: owned
        });
    }

    return owned;
}

function buildZones()
{
    const   zones = [];
    const   parts = [];

    if (app.hierarchy != null)
        for (const root of getRootNodes())
            if (root.length > 0)
                collectZones(root, zones, parts);

    layer.zones = zones.sort((first, second) => second.order - first.order);
    layer.parts = parts;
    layer.moved = true;
}

function getPartBox(part)
{
    let     x1 = Infinity;
    let     y1 = Infinity;
    let     x2 = -Infinity;
    let     y2 = -Infinity;

    for (const node of part.nodes)
    {
        const   position = node.position();
        const   tag = node.hasClass("tag");

        const   halfWidth = tag ? node.width() / 2 + ZONE_PADDING : TRUNK_PADDING;
        const   halfHeight = tag ? node.height() / 2 + ZONE_PADDING : TRUNK_PADDING;

        x1 = Math.min(x1, position.x - halfWidth);
        y1 = Math.min(y1, position.y - halfHeight);
        x2 = Math.max(x2, position.x + halfWidth);
        y2 = Math.max(y2, position.y + halfHeight);
    }

    return { x1: x1, y1: y1, x2: x2, y2: y2 };
}

function updateBoxes()
{
    if (!layer.moved)
        return;

    for (const part of layer.parts)
        part.box = getPartBox(part);

    layer.moved = false;
}

function paintZone(target, zone, padding, color)
{
    target.beginPath();

    for (const part of zone.parts)
    {
        const   box = part.box;

        target.rect(box.x1 - padding, box.y1 - padding, box.x2 - box.x1 + 2 * padding, box.y2 - box.y1 + 2 * padding);
    }

    target.fillStyle = color;
    target.fill();
}

function resizeLayer(width, height, ratio)
{
    const   pixelWidth = Math.round(width * ratio);
    const   pixelHeight = Math.round(height * ratio);

    if (layer.canvas.width == pixelWidth && layer.canvas.height == pixelHeight)
        return;

    layer.canvas.width = pixelWidth;
    layer.canvas.height = pixelHeight;

    layer.canvas.style.width = `${width}px`;
    layer.canvas.style.height = `${height}px`;

    layer.buffer.width = pixelWidth;
    layer.buffer.height = pixelHeight;
}

function drawZones()
{
    if (layer.canvas == null || app.cy == null)
        return;

    const   ratio = window.devicePixelRatio || 1;
    const   context = layer.context;
    const   buffer = layer.bufferContext;

    resizeLayer(app.cy.width(), app.cy.height(), ratio);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

    if (layer.zones == null)
        buildZones();

    if (layer.zones.length == 0)
        return;

    updateBoxes();

    const   zoom = app.cy.zoom();
    const   pan = app.cy.pan();

    buffer.setTransform(1, 0, 0, 1, 0, 0);
    buffer.clearRect(0, 0, layer.buffer.width, layer.buffer.height);

    buffer.setTransform(ratio * zoom, 0, 0, ratio * zoom, ratio * pan.x, ratio * pan.y);
    buffer.globalCompositeOperation = "destination-over";

    for (const zone of layer.zones)
    {
        paintZone(buffer, zone, 0, zone.color);
        paintZone(buffer, zone, ZONE_BORDER, zone.borderColor);
    }

    context.globalAlpha = isDarkTheme() ? ZONE_DARK_OPACITY : ZONE_OPACITY;
    context.drawImage(layer.buffer, 0, 0);
    context.globalAlpha = 1;
}

export function invalidateZones()
{
    layer.zones = null;
    layer.parts = null;
}

function resetLayer()
{
    layer.canvas = null;
    layer.context = null;
    layer.buffer = null;
    layer.bufferContext = null;

    invalidateZones();
}

export function initZonesLayer()
{
    const   container = app.cy.container();
    const   canvas = document.createElement("canvas");

    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";

    container.insertBefore(canvas, container.firstChild);

    layer.canvas = canvas;
    layer.context = canvas.getContext("2d");

    layer.buffer = document.createElement("canvas");
    layer.bufferContext = layer.buffer.getContext("2d");

    invalidateZones();

    app.cy.on("add remove", invalidateZones);
    app.cy.on("position", () => layer.moved = true);
    app.cy.on("render", drawZones);

    app.cy.on("destroy", () =>
    {
        canvas.remove();

        resetLayer();
    });
}

import { app } from "../state.js";
import { getChildNodes, getJointId } from "./layout.js";
import { getThemeColor } from "./init.js";
import { isDarkTheme } from "../theme.js";

const   ZONE_PADDING = 24;
const   ZONE_OPACITY = 0.33;
const   ZONE_DARK_OPACITY = 0.28;

const   TRUNK_PADDING = 11;

const   ZONE_BORDER = 3;
const   ZONE_BORDER_SHADE = 0.35;
const   ZONE_DARK_BORDER_SHADE = 0.5;

let     canvas = null;
let     context = null;

let     buffer = null;
let     bufferContext = null;

let     zones = null;

function shadeColor(color, amount)
{
    const   value = parseInt(color.slice(1), 16);

    const   mix = (channel) => amount < 0
        ? Math.round(channel * (1 + amount))
        : Math.round(channel + (255 - channel) * amount);

    return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`;
}

function collectParts(node, parts)
{
    const   part = [node];

    getChildNodes(node).forEach((child, index) =>
    {
        const   joint = app.cy.getElementById(getJointId(node.id(), index));

        if (joint.length == 0 || child.length == 0)
            return;

        part.push(joint);
        part.push(child);

        if (child.data("childIds") != null)
            collectParts(child, parts);
    });

    parts.push(part);
}

function visitZone(node, list)
{
    if (node.hasClass("tag") && node.data("childIds") != null)
    {
        const   parts = [];
        const   color = getThemeColor(node.data("zoneColor"));

        collectParts(node, parts);

        list.push({
            color: color,
            borderColor: shadeColor(color, isDarkTheme() ? ZONE_DARK_BORDER_SHADE : -ZONE_BORDER_SHADE),
            order: node.data("zoneOrder"),
            parts: parts
        });
    }

    for (const child of getChildNodes(node))
        if (child.length > 0)
            visitZone(child, list);
}

function buildZones()
{
    const   list = [];

    if (app.hierarchy == null)
        return list;

    for (const url of app.hierarchy.roots)
    {
        const   root = app.cy.getElementById(url);

        if (root.length > 0)
            visitZone(root, list);
    }

    return list.sort((first, second) => second.order - first.order);
}

function getPartBox(part, padding)
{
    let     x1 = Infinity;
    let     y1 = Infinity;
    let     x2 = -Infinity;
    let     y2 = -Infinity;

    for (const node of part)
    {
        const   position = node.position();
        const   tag = node.hasClass("tag");

        const   halfWidth = (tag ? node.width() / 2 + ZONE_PADDING : TRUNK_PADDING) + padding;
        const   halfHeight = (tag ? node.height() / 2 + ZONE_PADDING : TRUNK_PADDING) + padding;

        x1 = Math.min(x1, position.x - halfWidth);
        y1 = Math.min(y1, position.y - halfHeight);
        x2 = Math.max(x2, position.x + halfWidth);
        y2 = Math.max(y2, position.y + halfHeight);
    }

    return { x1: x1, y1: y1, x2: x2, y2: y2 };
}

function paintZone(target, zone, padding, color)
{
    target.beginPath();

    for (const part of zone.parts)
    {
        const   box = getPartBox(part, padding);

        target.rect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
    }

    target.fillStyle = color;
    target.fill();
}

function drawZone(target, zone)
{
    paintZone(target, zone, 0, zone.color);
    paintZone(target, zone, ZONE_BORDER, zone.borderColor);
}

function resizeLayer(width, height, ratio)
{
    const   pixelWidth = Math.round(width * ratio);
    const   pixelHeight = Math.round(height * ratio);

    if (canvas.width == pixelWidth && canvas.height == pixelHeight)
        return;

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    buffer.width = pixelWidth;
    buffer.height = pixelHeight;
}

function drawZones()
{
    if (canvas == null || app.cy == null)
        return;

    const   ratio = window.devicePixelRatio || 1;

    resizeLayer(app.cy.width(), app.cy.height(), ratio);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (zones == null)
        zones = buildZones();

    if (zones.length == 0)
        return;

    const   zoom = app.cy.zoom();
    const   pan = app.cy.pan();

    bufferContext.setTransform(1, 0, 0, 1, 0, 0);
    bufferContext.clearRect(0, 0, buffer.width, buffer.height);

    bufferContext.setTransform(ratio * zoom, 0, 0, ratio * zoom, ratio * pan.x, ratio * pan.y);
    bufferContext.globalCompositeOperation = "destination-over";

    for (const zone of zones)
        drawZone(bufferContext, zone);

    context.globalAlpha = isDarkTheme() ? ZONE_DARK_OPACITY : ZONE_OPACITY;
    context.drawImage(buffer, 0, 0);
    context.globalAlpha = 1;
}

export function invalidateZones()
{
    zones = null;
}

export function initZonesLayer()
{
    const   container = app.cy.container();

    canvas = document.createElement("canvas");

    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";

    container.insertBefore(canvas, container.firstChild);

    context = canvas.getContext("2d");

    buffer = document.createElement("canvas");
    bufferContext = buffer.getContext("2d");

    zones = null;

    app.cy.on("add remove", invalidateZones);
    app.cy.on("render resize", drawZones);

    app.cy.on("destroy", () =>
    {
        canvas.remove();

        canvas = null;
        context = null;
        buffer = null;
        bufferContext = null;
        zones = null;
    });
}

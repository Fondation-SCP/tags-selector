import { app } from "../../main.js";
import { updateTagsBox } from "../../selection/tools.js";
import { buildTagNode, getTrunkColor } from "./init.js";
import { buildBranches, clampPan, getChildNodes, getEdgeWidth, getJointId, limitPan, updateBranchesLayout } from "./layout.js";

const   ANIMATION_DURATION = 300;
const   UNFURL_SPREAD = 250;

let     zoneOrder = 0;

const   ZOOM_STEP = 1.15;
const   WHEEL_LINE = 40;
const   WHEEL_LIMIT = 120;

function updateSelection()
{
    app.selectedTags = new Set(app.cy.nodes(".tag.selected").map(node => node.data("label")));

    updateTagsBox();
}

function createBranches(elements, ownerId, items, depth, position, delays, counter, color, avoided)
{
    const   ids = [];
    const   trunkWidth = getEdgeWidth(depth);
    const   branchWidth = getEdgeWidth(depth + 1);

    let     previous = ownerId;

    items.forEach((item, index) =>
    {
        const   jointId = getJointId(ownerId, index);
        const   childId = item.group != null ? `${ownerId}|fork|${index}` : `${ownerId}|${item.url}`;
        const   delay = Math.round((counter.done / counter.total) * UNFURL_SPREAD);

        elements.push({
            data: { id: jointId },
            position: { x: position.x, y: position.y },
            classes: "joint"
        });

        elements.push({
            data: { id: `${previous}>${jointId}`, source: previous, target: jointId, width: trunkWidth, color: color },
            classes: "trunk"
        });

        if (item.group != null)
        {
            const   fork = {
                data: { id: childId },
                position: { x: position.x, y: position.y },
                classes: "fork"
            };

            elements.push(fork);

            fork.data.childIds = createBranches(elements, childId, item.group, depth + 1, position, delays, counter, getTrunkColor(childId, [...avoided, color]), avoided);
        }
        else
        {
            const   tag = buildTagNode(childId, item.url, ownerId, index, depth + 1, { x: position.x, y: position.y });

            tag.data.ownerColor = color;

            elements.push(tag);

            counter.done++;
        }

        elements.push({
            data: { id: `${jointId}>${childId}`, source: jointId, target: childId, width: branchWidth },
            classes: "branch"
        });

        delays.set(jointId, delay);
        delays.set(childId, delay);

        ids.push(childId);
        previous = jointId;
    });

    return ids;
}

function getUsedColors(node)
{
    const   branch = node.id().split("|")[0];
    const   colors = [];

    app.cy.nodes(".tag").forEach((other) =>
    {
        const   color = other.data("zoneColor");

        if (color == null || other.id() == node.id())
            return;

        if (other.data("childIds") == null || other.hasClass("leaving"))
            return;

        if (other.data("depth") == 0 || other.id().split("|")[0] == branch)
            colors.push(color);
    });

    return colors;
}

function expand(node)
{
    const   urls = app.hierarchy.children.get(node.data("url"));
    const   delays = new Map();

    if (urls == null || node.data("childIds") != null)
        return delays;

    const   elements = [];
    const   position = node.position();
    const   counter = { done: 0, total: urls.length };
    const   avoided = getUsedColors(node);

    avoided.push(node.data("ownerColor"));

    const   color = getTrunkColor(node.id(), avoided);

    node.data("zoneColor", color);
    node.data("zoneOrder", ++zoneOrder);

    const   ids = createBranches(elements, node.id(), buildBranches(urls), node.data("depth"), position, delays, counter, color, avoided);

    app.cy.add(elements);

    node.data("childIds", ids);

    return delays;
}

function detach(node, elements)
{
    const   ids = node.data("childIds");

    if (ids == null)
        return elements;

    for (const child of getChildNodes(node))
    {
        detach(child, elements);
        elements.push(child);
    }

    for (let index = 0; index < ids.length; index++)
        elements.push(app.cy.getElementById(getJointId(node.id(), index)));

    node.data("childIds", null);

    return elements;
}

function collapse(node)
{
    const   elements = app.cy.collection(detach(node, []));

    elements.removeClass("selected");
    elements.addClass("leaving");

    return elements;
}

function retract(elements, position)
{
    elements.stop(true);
    elements.animate(
        { position: { x: position.x, y: position.y } },
        { duration: ANIMATION_DURATION, easing: "ease-in" }
    );

    setTimeout(() => elements.remove(), ANIMATION_DURATION);
}

function startChange(node)
{
    if (node.hasClass("leaving"))
        return false;

    app.cy.nodes(".leaving").remove();

    return true;
}

function getAnchor(node)
{
    const   position = node.renderedPosition();

    return { x: position.x, y: position.y };
}

function applyChange(node, delays, leaving, anchor)
{
    updateSelection();

    if (delays.size == 0 && leaving.length == 0)
        return;

    const   targets = updateBranchesLayout({ duration: ANIMATION_DURATION, delays: delays });
    const   target = targets.get(node.id());
    const   zoom = app.cy.zoom();

    app.cy.animate(
        { pan: limitPan({ x: anchor.x - target.x * zoom, y: anchor.y - target.y * zoom }) },
        { duration: ANIMATION_DURATION }
    );

    if (leaving.length > 0)
        retract(leaving, target);
}

function collapseAll()
{
    app.cy.nodes(".leaving").remove();

    const   roots = app.hierarchy.roots.map(id => app.cy.getElementById(id));
    const   elements = roots.reduce((list, node) => detach(node, list), []);

    app.cy.collection(elements).remove();

    updateBranchesLayout();

    app.cy.fit(app.cy.nodes(), 80);

    if (app.cy.zoom() > 1)
    {
        app.cy.zoom(1);
        app.cy.center(app.cy.nodes());
    }
}

function getWheelSteps(event)
{
    let     delta = event.deltaY;

    if (event.deltaMode == 1)
        delta *= WHEEL_LINE;
    else if (event.deltaMode == 2)
        delta *= app.cy.height();

    return Math.max(-WHEEL_LIMIT, Math.min(WHEEL_LIMIT, delta)) / 100;
}

function registerWheelZoom()
{
    const   container = app.cy.container();

    const   onWheel = (event) =>
    {
        event.preventDefault();

        const   steps = getWheelSteps(event);

        if (steps == 0)
            return;

        const   box = container.getBoundingClientRect();

        app.cy.zoom({
            level: app.cy.zoom() * Math.pow(ZOOM_STEP, -steps),
            renderedPosition: { x: event.clientX - box.left, y: event.clientY - box.top }
        });
    };

    container.addEventListener("wheel", onWheel, { passive: false });

    app.cy.on("destroy", () => container.removeEventListener("wheel", onWheel));
}

export function registerBranchesEvents()
{
    registerWheelZoom();

    let     clamping = false;

    app.collapse = collapseAll;

    app.cy.on("viewport", () =>
    {
        if (clamping)
            return;

        clamping = true;
        clampPan();
        clamping = false;
    });

    app.cy.on("mouseover", "node.tag", () => {
        app.cy.container().style.cursor = "pointer";
    });

    app.cy.on("mouseout", "node.tag", () => {
        app.cy.container().style.cursor = "default";
    });

    app.cy.on("tap", "node.tag", (event) =>
    {
        const   node = event.target;

        if (!startChange(node))
            return;

        const   anchor = getAnchor(node);

        node.toggleClass("selected");

        if (node.hasClass("selected"))
            applyChange(node, expand(node), app.cy.collection(), anchor);
        else
            applyChange(node, new Map(), collapse(node), anchor);
    });

    app.cy.on("cxttap", "node.tag", (event) =>
    {
        const   node = event.target;

        if (!startChange(node))
            return;

        const   anchor = getAnchor(node);

        if (node.data("childIds") == null)
            applyChange(node, expand(node), app.cy.collection(), anchor);
        else
            applyChange(node, new Map(), collapse(node), anchor);
    });
}

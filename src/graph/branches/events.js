import { app } from "../../main.js";
import { updateTagsBox } from "../../selection/tools.js";
import { recordSelection } from "../../selection/history.js";
import { showPopup } from "../../popup.js";
import { getTagName } from "../../database/tools.js";
import { buildTagNode, getTagPath, getTrunkColor, MISC_TAG } from "./init.js";
import { buildBranches, clampPan, getChildNodes, getEdgeWidth, getJointId, limitPan, updateBranchesLayout } from "./layout.js";
import { addAncestors, findConflict, getConflict } from "./disjoint.js";
import { showTagInfo, hideTagInfo } from "./info.js";

const   ANIMATION_DURATION = 300;
const   UNFURL_SPREAD = 250;

const   HIGHLIGHT_BLINKS = 3;
const   HIGHLIGHT_STEP = 250;

let     zoneOrder = 0;
const   blinkTimers = new Map();

const   ZOOM_STEP = 1.15;
const   WHEEL_LINE = 40;
const   WHEEL_LIMIT = 120;

function getSelectedUrls()
{
    return new Set(app.cy.nodes(".tag.selected").map(node => node.data("url")));
}

function getClosure(urls)
{
    const   closure = new Set(urls);

    urls.forEach(url => addAncestors(url, closure));

    return closure;
}

function updateSelection()
{
    const   urls = getSelectedUrls();
    const   required = new Set();

    urls.forEach(url => addAncestors(url, required));

    const   closure = new Set([...required, ...urls]);

    app.cy.nodes(".tag").forEach((node) =>
    {
        const   url = node.data("url");

        node.toggleClass("implied", required.has(url) && !node.hasClass("selected"));
        node.toggleClass("excluded", findConflict(url, closure) != null);
    });

    app.selectedTags = new Set([...closure].map(getTagName).sort((first, second) => first.localeCompare(second)));

    updateTagsBox();

    recordSelection([...urls]);
}

export function explainConflict(url)
{
    const   conflict = getConflict(url, getSelectedUrls());

    return conflict == null ? null : conflict.text;
}

function showConflict(node)
{
    const   conflict = getConflict(node.data("url"), getSelectedUrls());

    if (conflict == null)
        return;

    showPopup("Tag incompatible", conflict.message);

    blink(app.cy.nodes(".tag").filter(other => conflict.causes.has(other.data("url"))), "conflict", 0);
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
            data: { id: `${jointId}>${childId}`, source: jointId, target: childId, width: branchWidth, color: color },
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

function fitGraph()
{
    updateBranchesLayout();

    app.cy.fit(app.cy.nodes(), 80);

    if (app.cy.zoom() > 1)
    {
        app.cy.zoom(1);
        app.cy.center(app.cy.nodes());
    }
}

export function collapseAll()
{
    app.cy.elements().stop(true);
    app.cy.nodes(".leaving").remove();

    const   roots = app.hierarchy.roots.map(id => app.cy.getElementById(id));
    const   elements = roots.reduce((list, node) => detach(node, list), []);

    app.cy.collection(elements).remove();

    updateSelection();
    fitGraph();
}

export function expandAll()
{
    app.cy.elements().stop(true);
    app.cy.nodes(".leaving").remove();

    const   isPending = node => node.data("childIds") == null && !node.id().split("|").slice(0, -1).includes(node.data("url"));

    let     pending = app.cy.nodes(".tag.expandable").filter(isPending);

    while (pending.length > 0)
    {
        pending.forEach(node => expand(node));

        pending = app.cy.nodes(".tag.expandable").filter(isPending);
    }

    updateSelection();
    fitGraph();
}

function findChild(node, url)
{
    for (const child of getChildNodes(node))
    {
        if (child.hasClass("fork"))
        {
            const   found = findChild(child, url);

            if (found != null)
                return found;
        }
        else if (child.data("url") == url)
            return child;
    }

    return null;
}

function openTag(url, delays)
{
    const   path = getTagPath(url);

    if (path == null)
        return null;

    let     node = app.cy.getElementById(path[0]);

    for (const step of path.slice(1))
    {
        expand(node).forEach((delay, id) => delays.set(id, delay));

        node = findChild(node, step);

        if (node == null)
            return null;
    }

    return node;
}

export function changeSelection(urls)
{
    app.cy.elements().stop(true);
    app.cy.nodes(".leaving").remove();

    const   target = new Set(urls);

    app.cy.nodes(".tag.selected").forEach((node) =>
    {
        if (node.removed() || target.has(node.data("url")))
            return;

        node.removeClass("selected");

        app.cy.collection(detach(node, [])).remove();
    });

    const   delays = new Map();

    for (const url of target)
    {
        const   selected = getSelectedUrls();

        if (selected.has(url) || findConflict(url, getClosure(selected)) != null)
            continue;

        const   node = openTag(url, delays);

        if (node == null)
            continue;

        node.addClass("selected");

        expand(node).forEach((delay, id) => delays.set(id, delay));
    }

    updateSelection();
    updateBranchesLayout({ duration: ANIMATION_DURATION, delays: delays });
}

export function deselectTag(url)
{
    changeSelection([...getSelectedUrls()].filter(selected => !getClosure([selected]).has(url)));
}

export function clearSelection()
{
    app.cy.nodes(".tag.selected").removeClass("selected");

    updateSelection();
}

export function revealTag(url)
{
    app.cy.nodes(".leaving").remove();

    const   delays = new Map();
    const   node = openTag(url, delays);

    if (node == null)
        return;

    updateSelection();

    const   targets = updateBranchesLayout({ duration: ANIMATION_DURATION, delays: delays });
    const   target = targets.get(node.id());
    const   zoom = Math.max(app.cy.zoom(), 1);

    app.cy.stop(true);
    app.cy.animate(
        {
            zoom: zoom,
            pan: { x: app.cy.width() / 2 - target.x * zoom, y: app.cy.height() / 2 - target.y * zoom }
        },
        { duration: ANIMATION_DURATION }
    );

    blink(node, "highlighted", ANIMATION_DURATION);
}

function blink(nodes, name, delay)
{
    (blinkTimers.get(name) ?? []).forEach(timer => clearTimeout(timer));
    app.cy.nodes(`.${name}`).removeClass(name);

    const   timers = [];

    for (let index = 0; index < HIGHLIGHT_BLINKS * 2; index++)
    {
        const   timer = setTimeout(() =>
        {
            nodes.forEach((node) =>
            {
                if (node.cy() == app.cy && !node.removed())
                    node.toggleClass(name, index % 2 == 0);
            });
        }, delay + index * HIGHLIGHT_STEP);

        timers.push(timer);
    }

    blinkTimers.set(name, timers);
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

    app.cy.on("viewport", () =>
    {
        if (clamping)
            return;

        clamping = true;
        clampPan();
        clamping = false;
    });

    app.cy.on("mouseover", "node.tag", (event) =>
    {
        const   container = app.cy.container();
        const   url = event.target.data("url");
        const   text = event.target.hasClass("excluded") ? explainConflict(url) : null;

        container.style.cursor = text == null ? "pointer" : "not-allowed";
        container.title = text ?? "";

        if (url != MISC_TAG)
            showTagInfo(url);
    });

    app.cy.on("mouseout", "node.tag", () =>
    {
        app.cy.container().style.cursor = "default";
        app.cy.container().title = "";

        hideTagInfo();
    });

    app.cy.on("tap", "node.tag", (event) =>
    {
        const   node = event.target;

        if (node.data("url") == MISC_TAG)
        {
            toggleBranch(node);
            return;
        }

        if (node.hasClass("excluded"))
        {
            showConflict(node);
            return;
        }

        if (!startChange(node))
            return;

        const   anchor = getAnchor(node);

        node.toggleClass("selected");

        if (node.hasClass("selected"))
            applyChange(node, expand(node), app.cy.collection(), anchor);
        else
            applyChange(node, new Map(), collapse(node), anchor);
    });

    app.cy.on("cxttap", "node.tag", (event) => toggleBranch(event.target));
}

function toggleBranch(node)
{
    if (!startChange(node))
        return;

    const   anchor = getAnchor(node);

    if (node.data("childIds") == null)
        applyChange(node, expand(node), app.cy.collection(), anchor);
    else
        applyChange(node, new Map(), collapse(node), anchor);
}

import { app } from "../state.js";
import { showPopup } from "../popup.js";
import { MISC_TAG } from "./hierarchy.js";
import { fitGraph, limitPan, updateLayout } from "./layout.js";
import { getChildTags, getRootNodes, getSelectedUrls } from "./nodes.js";
import { getConflict } from "./disjoint.js";
import { ANIMATION_DURATION, collapse, detach, expand, openTag, resetBranches, retract, settleGraph } from "./branches.js";
import { resetSelection, updateSelection } from "./selection.js";
import { registerHover } from "./hover.js";
import { registerViewport } from "./wheel.js";

const   HIGHLIGHT_BLINKS = 3;
const   HIGHLIGHT_STEP = 250;

const   blinkTimers = new Map();

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

function showConflict(node)
{
    const   conflict = getConflict(node.data("url"), getSelectedUrls());

    if (conflict == null)
        return;

    showPopup("Tag incompatible", conflict.message);

    blink(app.cy.nodes(".tag").filter(other => conflict.causes.has(other.data("url"))), "conflict", 0);
}

function startChange(node)
{
    if (node.hasClass("leaving"))
        return false;

    app.cy.nodes(".leaving").remove();

    return true;
}

function applyChange(node, delays, leaving, anchor)
{
    updateSelection();

    if (delays.size == 0 && leaving.length == 0)
        return;

    const   targets = updateLayout({ duration: ANIMATION_DURATION, delays: delays });
    const   target = targets.get(node.id());
    const   zoom = app.cy.zoom();

    app.cy.animate(
        { pan: limitPan({ x: anchor.x - target.x * zoom, y: anchor.y - target.y * zoom }) },
        { duration: ANIMATION_DURATION }
    );

    if (leaving.length > 0)
        retract(leaving, target);
}

function setBranch(node, open)
{
    const   position = node.renderedPosition();
    const   anchor = { x: position.x, y: position.y };

    if (open)
        applyChange(node, expand(node), app.cy.collection(), anchor);
    else
        applyChange(node, new Map(), collapse(node), anchor);
}

function toggleBranch(node)
{
    if (startChange(node))
        setBranch(node, node.data("childIds") == null);
}

export function collapseAll()
{
    settleGraph();

    const   elements = getRootNodes().reduce((list, node) => detach(node, list), []);

    app.cy.collection(elements).remove();

    updateSelection();
    fitGraph();
}

export function expandAll()
{
    settleGraph();

    const   isPending = node => node.hasClass("expandable") && node.data("childIds") == null && !node.id().split("|").slice(0, -1).includes(node.data("url"));

    app.cy.batch(() =>
    {
        let     pending = app.cy.nodes(".tag").filter(isPending).toArray();

        while (pending.length > 0)
        {
            pending.forEach(node => expand(node));

            pending = pending.flatMap(node => getChildTags(node)).filter(isPending);
        }
    });

    updateSelection();
    fitGraph();
}

export function revealTag(url)
{
    settleGraph();

    const   delays = new Map();
    const   node = openTag(url, delays);

    if (node == null)
        return;

    updateSelection();

    const   targets = updateLayout({ duration: ANIMATION_DURATION, delays: delays });
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

export function registerGraphEvents()
{
    resetBranches();
    resetSelection();

    registerViewport();
    registerHover();

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

        node.toggleClass("selected");

        setBranch(node, node.hasClass("selected"));
    });

    app.cy.on("cxttap", "node.tag", (event) => toggleBranch(event.target));
}

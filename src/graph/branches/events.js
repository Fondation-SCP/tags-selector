import { app } from "../../main.js";
import { updateTagsBox } from "../../selection/tools.js";
import { buildTagNode, getTrunkColor } from "./init.js";
import { buildBranches, clampPan, getChildNodes, getEdgeWidth, getJointId, limitPan, updateBranchesLayout } from "./layout.js";

const   ANIMATION_DURATION = 300;
const   UNFURL_SPREAD = 250;

function updateSelection()
{
    app.selectedTags = new Set(app.cy.nodes(".tag.selected").map(node => node.data("label")));

    updateTagsBox();
}

function createBranches(elements, ownerId, items, depth, position, delays, counter, parentColor)
{
    const   ids = [];
    const   color = getTrunkColor(ownerId, parentColor);
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

            fork.data.childIds = createBranches(elements, childId, item.group, depth + 1, position, delays, counter, color);
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

function expand(node)
{
    const   urls = app.hierarchy.children.get(node.data("url"));
    const   delays = new Map();

    if (urls == null || node.data("childIds") != null)
        return delays;

    const   elements = [];
    const   position = node.position();
    const   counter = { done: 0, total: urls.length };

    const   ids = createBranches(elements, node.id(), buildBranches(urls), node.data("depth"), position, delays, counter, node.data("ownerColor"));

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

export function registerBranchesEvents()
{
    let     clamping = false;

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

        if (node.hasClass("leaving"))
            return;

        app.cy.nodes(".leaving").remove();

        const   anchor = node.renderedPosition();
        const   before = { x: anchor.x, y: anchor.y };

        node.toggleClass("selected");

        let     delays = new Map();
        let     leaving = app.cy.collection();

        if (node.hasClass("selected"))
            delays = expand(node);
        else
            leaving = collapse(node);

        updateSelection();

        if (delays.size == 0 && leaving.length == 0)
            return;

        const   targets = updateBranchesLayout({ duration: ANIMATION_DURATION, delays: delays });
        const   target = targets.get(node.id());
        const   zoom = app.cy.zoom();

        app.cy.animate(
            { pan: limitPan({ x: before.x - target.x * zoom, y: before.y - target.y * zoom }) },
            { duration: ANIMATION_DURATION }
        );

        if (leaving.length > 0)
            retract(leaving, target);
    });
}

import { app } from "../state.js";
import { buildTagNode } from "./init.js";
import { getTrunkColor } from "./palette.js";
import { buildBranches, getEdgeWidth } from "./layout.js";
import { getChildNodes, getChildTags, getJointId } from "./nodes.js";
import { getTagPath } from "./hierarchy.js";

export const   ANIMATION_DURATION = 300;
const   UNFURL_SPREAD = 250;

let     zoneOrder = 0;

const   usedColors = { roots: new Map(), branches: new Map() };

export function resetBranches()
{
    zoneOrder = 0;

    usedColors.roots.clear();
    usedColors.branches.clear();
}

function getBranch(node)
{
    return node.id().split("|")[0];
}

function getColorCounts(node)
{
    if (node.data("depth") == 0)
        return usedColors.roots;

    const   branch = getBranch(node);

    if (!usedColors.branches.has(branch))
        usedColors.branches.set(branch, new Map());

    return usedColors.branches.get(branch);
}

function countColor(node, step)
{
    const   counts = getColorCounts(node);
    const   color = node.data("zoneColor");
    const   count = (counts.get(color) ?? 0) + step;

    if (count > 0)
        counts.set(color, count);
    else
        counts.delete(color);
}

function getUsedColors(node)
{
    const   branch = usedColors.branches.get(getBranch(node));

    return [...usedColors.roots.keys(), ...(branch?.keys() ?? [])];
}

function createBranches(context, ownerId, items, depth, color)
{
    const   ids = [];
    const   trunkWidth = getEdgeWidth(depth);
    const   branchWidth = getEdgeWidth(depth + 1);
    const   position = context.position;

    let     previous = ownerId;

    items.forEach((item, index) =>
    {
        const   jointId = getJointId(ownerId, index);
        const   childId = item.group != null ? `${ownerId}|fork|${index}` : `${ownerId}|${item.url}`;
        const   delay = Math.round((context.done / context.total) * UNFURL_SPREAD);

        context.elements.push({
            data: { id: jointId },
            position: { x: position.x, y: position.y },
            classes: "joint"
        });

        context.elements.push({
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

            context.elements.push(fork);

            fork.data.childIds = createBranches(context, childId, item.group, depth + 1, getTrunkColor(childId, [...context.avoided, color]));
        }
        else
        {
            const   tag = buildTagNode(childId, item.url, depth + 1, { x: position.x, y: position.y });

            tag.data.ownerColor = color;

            context.elements.push(tag);

            context.done++;
        }

        context.elements.push({
            data: { id: `${jointId}>${childId}`, source: jointId, target: childId, width: branchWidth, color: color },
            classes: "branch"
        });

        context.delays.set(jointId, delay);
        context.delays.set(childId, delay);

        ids.push(childId);
        previous = jointId;
    });

    return ids;
}

export function expand(node, delays = new Map())
{
    const   urls = app.hierarchy.children.get(node.data("url"));

    if (urls == null || node.data("childIds") != null)
        return delays;

    const   avoided = getUsedColors(node);

    avoided.push(node.data("ownerColor"));

    const   color = getTrunkColor(node.id(), avoided);

    const   context =
    {
        elements: [],
        delays: delays,
        position: node.position(),
        avoided: avoided,
        done: 0,
        total: urls.length
    };

    node.data("zoneColor", color);
    node.data("zoneOrder", ++zoneOrder);

    const   ids = createBranches(context, node.id(), buildBranches(urls), node.data("depth"), color);

    app.cy.add(context.elements);

    node.data("childIds", ids);

    countColor(node, 1);

    return delays;
}

export function detach(node, elements = [])
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

    if (node.hasClass("tag"))
        countColor(node, -1);

    return elements;
}

export function collapse(node)
{
    const   elements = app.cy.collection(detach(node));

    elements.removeClass("selected");
    elements.addClass("leaving");

    return elements;
}

export function retract(elements, position)
{
    elements.stop(true);
    elements.animate(
        { position: { x: position.x, y: position.y } },
        { duration: ANIMATION_DURATION, easing: "ease-in" }
    );

    setTimeout(() =>
    {
        if (elements.cy() == app.cy)
            elements.filter(element => !element.removed()).remove();
    }, ANIMATION_DURATION);
}

export function settleGraph()
{
    app.cy.elements().stop(true);
    app.cy.nodes(".leaving").remove();
}

function findTagNode(url)
{
    const   nodes = app.cy.nodes(".tag").filter(node => node.data("url") == url && !node.hasClass("leaving"));
    const   selected = nodes.filter(".selected");

    if (selected.length > 0)
        return selected[0];

    return nodes.length > 0 ? nodes[0] : null;
}

export function openTag(url, delays)
{
    const   shown = findTagNode(url);

    if (shown != null)
        return shown;

    const   path = getTagPath(url);

    if (path == null)
        return null;

    let     node = app.cy.getElementById(path[0]);

    for (const step of path.slice(1))
    {
        expand(node, delays);

        node = getChildTags(node).find(child => child.data("url") == step) ?? null;

        if (node == null)
            return null;
    }

    return node;
}

import { app } from "../state.js";

export function getJointId(ownerId, index)
{
    return `${ownerId}|joint|${index}`;
}

export function getChildNodes(node)
{
    const   ids = node.data("childIds");

    if (ids == null)
        return [];

    return ids.map(id => app.cy.getElementById(id));
}

export function getChildTags(node)
{
    return getChildNodes(node).flatMap(child => child.hasClass("fork") ? getChildTags(child) : [child]);
}

export function getRootNodes()
{
    return app.hierarchy.roots.map(id => app.cy.getElementById(id));
}

export function getSelectedUrls()
{
    return new Set(app.cy.nodes(".tag.selected").map(node => node.data("url")));
}

import { app } from "../state.js";
import { getTagName } from "../database/tools.js";
import { toText } from "../message.js";

function addAncestors(url, ancestors)
{
    for (const parent of app.hierarchy.parents.get(url) ?? [])
    {
        if (ancestors.has(parent))
            continue;

        ancestors.add(parent);
        addAncestors(parent, ancestors);
    }
}

function getAncestors(url)
{
    let     ancestors = app.hierarchy.ancestors.get(url);

    if (ancestors == null)
    {
        ancestors = new Set();

        addAncestors(url, ancestors);

        app.hierarchy.ancestors.set(url, ancestors);
    }

    return ancestors;
}

export function hasLineage(url, ancestor)
{
    return url == ancestor || getAncestors(url).has(ancestor);
}

export function getRequired(urls)
{
    const   required = new Set();

    urls.forEach(url => getAncestors(url).forEach(ancestor => required.add(ancestor)));

    return required;
}

export function getClosure(urls)
{
    const   closure = getRequired(urls);

    urls.forEach(url => closure.add(url));

    return closure;
}

export function getBlocked(closure)
{
    const   blocked = new Set();

    for (const [first, second] of app.hierarchy.disjoints)
    {
        if (closure.has(second))
            blocked.add(first);

        if (closure.has(first))
            blocked.add(second);
    }

    return blocked;
}

export function isExcluded(url, closure, blocked)
{
    if (closure.has(url))
        return false;

    if (blocked.has(url))
        return true;

    for (const ancestor of getAncestors(url))
        if (blocked.has(ancestor))
            return true;

    return false;
}

export function findConflict(url, closure)
{
    if (closure.has(url))
        return null;

    for (const [first, second] of app.hierarchy.disjoints)
    {
        if (hasLineage(url, first) && closure.has(second))
            return { own: first, other: second };

        if (hasLineage(url, second) && closure.has(first))
            return { own: second, other: first };
    }

    return null;
}

export function tagPart(url)
{
    return { italic: getTagName(url) };
}

function listTags(urls)
{
    const   parts = [];

    urls.forEach((url, index) =>
    {
        if (index > 0)
            parts.push(index == urls.length - 1 ? " et " : ", ");

        parts.push(tagPart(url));
    });

    return parts;
}

export function getConflict(url, urls, closure = getClosure(urls))
{
    const   conflict = findConflict(url, closure);

    if (conflict == null)
        return null;

    const   sources = [...urls].filter(selected => hasLineage(selected, conflict.other));
    const   message = [tagPart(url), " ne peut pas être sélectionné.\n\n"];

    message.push(tagPart(conflict.own), " et ", tagPart(conflict.other), " sont incompatibles : une même page ne peut pas porter ces deux tags.");

    if (conflict.own != url)
        message.push("\n", tagPart(url), " est un sous-tag de ", tagPart(conflict.own), ".");

    if (!urls.has(conflict.other))
        message.push("\n", tagPart(conflict.other), " est sélectionné automatiquement en tant que parent de ", ...listTags(sources), ".");

    message.push("\n\nDésélectionnez d'abord ", ...listTags(sources), " pour lever cette incompatibilité.");

    return {
        message: message,
        text: toText(message),
        causes: new Set([conflict.other, ...sources])
    };
}

export function explainConflict(url, urls, closure)
{
    return getConflict(url, urls, closure)?.text ?? null;
}

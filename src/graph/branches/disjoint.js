import { app } from "../../main.js";
import { getTagName } from "../../database/tools.js";

export function addAncestors(url, ancestors)
{
    for (const parent of app.hierarchy.parents.get(url) ?? [])
    {
        if (ancestors.has(parent))
            continue;

        ancestors.add(parent);
        addAncestors(parent, ancestors);
    }
}

function getLineage(url)
{
    const   lineage = new Set([url]);

    addAncestors(url, lineage);

    return lineage;
}

export function findConflict(url, closure)
{
    if (closure.has(url))
        return null;

    const   lineage = getLineage(url);

    for (const [first, second] of app.hierarchy.disjoints)
    {
        if (lineage.has(first) && closure.has(second))
            return { own: first, other: second };

        if (lineage.has(second) && closure.has(first))
            return { own: second, other: first };
    }

    return null;
}

function tag(url)
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

        parts.push(tag(url));
    });

    return parts;
}

export function getConflict(url, urls)
{
    const   closure = new Set(urls);

    urls.forEach(selected => addAncestors(selected, closure));

    const   conflict = findConflict(url, closure);

    if (conflict == null)
        return null;

    const   sources = [...urls].filter(selected => getLineage(selected).has(conflict.other));
    const   message = [tag(url), " ne peut pas être sélectionné.\n\n"];

    message.push(tag(conflict.own), " et ", tag(conflict.other), " sont incompatibles : une même page ne peut pas porter ces deux tags.");

    if (conflict.own != url)
        message.push("\n", tag(url), " est un sous-tag de ", tag(conflict.own), ".");

    if (urls.has(conflict.other))
        message.push("\n", tag(conflict.other), " est sélectionné.");
    else
        message.push("\n", tag(conflict.other), " est sélectionné automatiquement en tant que parent de ", ...listTags(sources), ".");

    message.push("\n\nDésélectionnez d'abord ", ...listTags(sources), " pour lever cette incompatibilité.");

    return {
        message: message,
        text: message.map(part => typeof part == "string" ? part : part.italic).join(""),
        causes: new Set([conflict.other, ...sources])
    };
}

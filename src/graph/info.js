import { app } from "../state.js";
import { getTagName } from "../database/tools.js";

function collectPaths(url, seen, trail, paths)
{
    seen.add(url);

    for (const parent of app.hierarchy.parents.get(url) ?? [])
    {
        if (seen.has(parent))
            continue;

        const   count = paths.length;

        trail.push(parent);

        collectPaths(parent, seen, trail, paths);

        if (paths.length == count)
            paths.push([...trail].reverse());

        trail.pop();
    }

    seen.delete(url);
}

function buildParentsText(url)
{
    const   paths = [];

    collectPaths(url, new Set(), [], paths);

    const   lines = paths.map(path => path.map(getTagName).join(" › "));

    if (lines.length == 0)
        return null;

    if (lines.length == 1)
        return `Sous-tag de : ${lines[0]}`;

    return `Sous-tag de :\n${lines.join("\n")}`;
}

export function getParentsText(url)
{
    const   texts = app.hierarchy.parentsTexts;

    if (!texts.has(url))
        texts.set(url, buildParentsText(url));

    return texts.get(url);
}

export function showTagInfo(url)
{
    const   parents = getParentsText(url);
    const   comments = app.hierarchy.comments.get(url) ?? [];

    const   parentsText = document.getElementById("tag-info-parents");
    const   commentText = document.getElementById("tag-info-comment");

    document.getElementById("tag-info-name").textContent = getTagName(url);

    parentsText.textContent = parents ?? "";
    parentsText.classList.toggle("hidden", parents == null);

    commentText.textContent = comments.length == 0 ? "Aucune définition dans l'ontologie." : comments.join("\n\n");
    commentText.classList.toggle("empty", comments.length == 0);

    document.getElementById("tag-info").classList.remove("hidden");
}

export function hideTagInfo()
{
    document.getElementById("tag-info").classList.add("hidden");
}

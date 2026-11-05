import { app } from "../../main.js";
import { getTagName } from "../../database/tools.js";

function getAncestorPaths(url, visited)
{
    const   seen = new Set(visited).add(url);
    const   parents = (app.hierarchy.parents.get(url) ?? []).filter(parent => !seen.has(parent));

    return parents.flatMap(parent =>
    {
        const   paths = getAncestorPaths(parent, seen);

        return paths.length == 0 ? [[parent]] : paths.map(path => [...path, parent]);
    });
}

export function getParentsText(url)
{
    const   paths = getAncestorPaths(url, []).map(path => path.map(getTagName).join(" › "));

    if (paths.length == 0)
        return null;

    if (paths.length == 1)
        return `Sous-tag de : ${paths[0]}`;

    return `Sous-tag de :\n${paths.join("\n")}`;
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

import { app } from "../../main.js";
import { getTagName } from "../../database/tools.js";

export function showTagInfo(url)
{
    const   parents = (app.hierarchy.parents.get(url) ?? []).map(getTagName);
    const   comments = app.hierarchy.comments.get(url) ?? [];

    const   parentsText = document.getElementById("tag-info-parents");
    const   commentText = document.getElementById("tag-info-comment");

    document.getElementById("tag-info-name").textContent = getTagName(url);

    parentsText.textContent = `Sous-tag de : ${parents.join(", ")}`;
    parentsText.classList.toggle("hidden", parents.length == 0);

    commentText.textContent = comments.length == 0 ? "Aucune définition dans l'ontologie." : comments.join("\n\n");
    commentText.classList.toggle("empty", comments.length == 0);

    document.getElementById("tag-info").classList.remove("hidden");
}

export function hideTagInfo()
{
    document.getElementById("tag-info").classList.add("hidden");
}

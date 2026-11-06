import { app } from "../state.js";
import { MISC_TAG } from "./hierarchy.js";
import { getSelectedUrls } from "./nodes.js";
import { explainConflict } from "./disjoint.js";
import { showTagInfo, hideTagInfo } from "./info.js";

let     hovered = null;

function updateHover()
{
    const   container = app.cy.container();

    if (hovered == null || hovered.removed())
    {
        hovered = null;

        container.style.cursor = "default";
        container.title = "";

        hideTagInfo();
        return;
    }

    const   url = hovered.data("url");
    const   text = hovered.hasClass("excluded") ? explainConflict(url, getSelectedUrls()) : null;

    container.style.cursor = text == null ? "pointer" : "not-allowed";
    container.title = text ?? "";

    if (url != MISC_TAG)
        showTagInfo(url);
}

export function refreshHover()
{
    if (hovered != null)
        updateHover();
}

export function registerHover()
{
    hovered = null;

    app.cy.on("mouseover", "node.tag", (event) =>
    {
        hovered = event.target;

        updateHover();
    });

    app.cy.on("mouseout", "node.tag", () =>
    {
        hovered = null;

        updateHover();
    });

    app.cy.on("remove", "node.tag", () =>
    {
        if (hovered != null && hovered.removed())
            updateHover();
    });
}

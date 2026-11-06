import { app } from "../state.js";
import { updateTagsBox } from "../selection/tools.js";
import { getSelectionKey, recordSelection } from "../selection/history.js";
import { compareTags, getTagName } from "../database/tools.js";
import { ANIMATION_DURATION, detach, expand, openTag, settleGraph } from "./branches.js";
import { updateLayout } from "./layout.js";
import { getSelectedUrls } from "./nodes.js";
import { findConflict, getBlocked, getClosure, getRequired, hasLineage, isExcluded } from "./disjoint.js";
import { refreshHover } from "./hover.js";

let     committed = "";

export function resetSelection()
{
    committed = "";
}

function refreshClasses(required, closure)
{
    const   blocked = getBlocked(closure);
    const   excluded = new Map();

    app.cy.batch(() =>
    {
        app.cy.nodes(".tag").forEach((node) =>
        {
            const   url = node.data("url");

            if (!excluded.has(url))
                excluded.set(url, isExcluded(url, closure, blocked));

            node.toggleClass("implied", required.has(url) && !node.hasClass("selected"));
            node.toggleClass("excluded", excluded.get(url));
        });
    });
}

export function updateSelection()
{
    const   urls = getSelectedUrls();
    const   required = getRequired(urls);
    const   closure = new Set([...required, ...urls]);
    const   key = getSelectionKey(urls);

    refreshClasses(required, closure);

    if (key != committed)
    {
        committed = key;

        app.selectedTags = new Set([...closure].sort(compareTags).map(getTagName));

        updateTagsBox();

        recordSelection(urls, key);
    }

    refreshHover();
}

export function changeSelection(urls)
{
    settleGraph();

    const   target = new Set(urls);

    app.cy.nodes(".tag.selected").forEach((node) =>
    {
        if (node.removed() || target.has(node.data("url")))
            return;

        node.removeClass("selected");

        app.cy.collection(detach(node)).remove();
    });

    const   selected = getSelectedUrls();
    const   closure = getClosure(selected);
    const   delays = new Map();

    for (const url of target)
    {
        if (selected.has(url) || findConflict(url, closure) != null)
            continue;

        const   node = openTag(url, delays);

        if (node == null)
            continue;

        node.addClass("selected");

        expand(node, delays);

        selected.add(url);
        getClosure([url]).forEach(other => closure.add(other));
    }

    updateSelection();
    updateLayout({ duration: ANIMATION_DURATION, delays: delays });
}

export function deselectTag(url)
{
    changeSelection([...getSelectedUrls()].filter(selected => !hasLineage(selected, url)));
}

export function clearSelection()
{
    app.cy.nodes(".tag.selected").removeClass("selected");

    updateSelection();
}

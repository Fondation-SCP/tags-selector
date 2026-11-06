import { app } from "../state.js";
import { getTagName } from "../database/tools.js";
import { revealTag } from "../graph/events.js";
import { getSelectedUrls } from "../graph/nodes.js";
import { explainConflict, getClosure } from "../graph/disjoint.js";

const   MAX_RESULTS = 10;

let     results = [];
let     active = -1;

let     index = null;

function normalize(text)
{
    return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s'’_-]+/g, "-")
        .replace(/^[-°~!¬]+|-+$/g, "");
}

function getPrefixDistance(query, name)
{
    let     previous = Array.from({ length: name.length + 1 }, (value, column) => column);

    for (let row = 1; row <= query.length; row++)
    {
        const   current = [row];

        for (let column = 1; column <= name.length; column++)
        {
            const   cost = query[row - 1] == name[column - 1] ? 0 : 1;

            current.push(Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost));
        }

        previous = current;
    }

    return Math.min(...previous);
}

function getScore(name, query)
{
    if (name == query)
        return 0;

    if (name.startsWith(query))
        return 1;

    if (name.split("-").some(part => part.startsWith(query)))
        return 2;

    if (name.includes(query))
        return 3;

    const   tolerance = query.length >= 6 ? 2 : (query.length >= 3 ? 1 : 0);

    if (tolerance == 0)
        return null;

    const   distance = getPrefixDistance(query, name);

    if (distance > tolerance)
        return null;

    return 4 + distance;
}

function getIndex()
{
    if (index == null || index.hierarchy != app.hierarchy)
    {
        const   entries = app.hierarchy.tags.map((url) =>
        {
            const   name = getTagName(url);

            return { url: url, name: name, normalized: normalize(name) };
        });

        index = { hierarchy: app.hierarchy, entries: entries };
    }

    return index.entries;
}

function findTags(text)
{
    const   query = normalize(text);

    if (query.length == 0 || app.hierarchy == null)
        return [];

    const   found = [];

    for (const entry of getIndex())
    {
        const   score = getScore(entry.normalized, query);

        if (score != null)
            found.push({ url: entry.url, name: entry.name, score: score });
    }

    found.sort((first, second) => first.score - second.score
        || first.name.length - second.name.length
        || first.name.localeCompare(second.name));

    return found.slice(0, MAX_RESULTS);
}

function updateExpanded()
{
    const   input = document.getElementById("search-input");

    input.setAttribute("aria-expanded", results.length > 0 ? "true" : "false");

    if (active >= 0)
        input.setAttribute("aria-activedescendant", `search-result-${active}`);
    else
        input.removeAttribute("aria-activedescendant");
}

function closeResults()
{
    results = [];
    active = -1;

    document.getElementById("search-results").classList.add("hidden");

    updateExpanded();
}

function renderResults()
{
    const   list = document.getElementById("search-results");
    const   urls = app.cy == null ? new Set() : getSelectedUrls();
    const   closure = getClosure(urls);

    list.replaceChildren();

    results.forEach((result, index) =>
    {
        const   item = document.createElement("li");
        const   conflict = explainConflict(result.url, urls, closure);

        item.id = `search-result-${index}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", index == active ? "true" : "false");

        item.textContent = result.name;
        item.classList.toggle("active", index == active);
        item.classList.toggle("excluded", conflict != null);

        if (conflict != null)
            item.title = conflict;

        item.addEventListener("mousedown", (event) =>
        {
            event.preventDefault();
            pickResult(index);
        });

        item.addEventListener("mousemove", () =>
        {
            if (active != index)
                setActive(index);
        });

        list.appendChild(item);
    });

    list.classList.toggle("hidden", results.length == 0);

    updateExpanded();
}

function setActive(index)
{
    active = index;

    const   items = document.querySelectorAll("#search-results li");

    items.forEach((item, position) =>
    {
        item.classList.toggle("active", position == active);
        item.setAttribute("aria-selected", position == active ? "true" : "false");
    });

    if (active >= 0)
        items[active].scrollIntoView({ block: "nearest" });

    updateExpanded();
}

function updateResults()
{
    results = findTags(document.getElementById("search-input").value);
    active = results.length > 0 ? 0 : -1;

    renderResults();
}

function pickResult(index)
{
    const   result = results[index];
    const   input = document.getElementById("search-input");

    if (result == null)
        return;

    input.value = result.name;
    input.blur();

    closeResults();

    revealTag(result.url);
}

export function initSearch()
{
    const   input = document.getElementById("search-input");

    input.addEventListener("input", updateResults);
    input.addEventListener("focus", updateResults);
    input.addEventListener("blur", closeResults);

    input.addEventListener("keydown", (event) =>
    {
        if (event.key == "ArrowDown" && results.length > 0)
        {
            event.preventDefault();
            setActive((active + 1) % results.length);
        }
        else if (event.key == "ArrowUp" && results.length > 0)
        {
            event.preventDefault();
            setActive((active - 1 + results.length) % results.length);
        }
        else if (event.key == "Enter")
        {
            event.preventDefault();
            pickResult(active);
        }
        else if (event.key == "Escape")
            input.blur();
    });
}

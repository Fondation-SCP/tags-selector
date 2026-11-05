import { app } from "../main.js";
import { getTagName } from "../database/tools.js";

const   MAX_RESULTS = 10;

let     results = [];
let     active = -1;

function normalize(text)
{
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/°/g, "");
}

function getDistance(first, second)
{
    let     previous = Array.from({ length: second.length + 1 }, (value, index) => index);

    for (let row = 1; row <= first.length; row++)
    {
        const   current = [row];

        for (let column = 1; column <= second.length; column++)
        {
            const   cost = first[row - 1] == second[column - 1] ? 0 : 1;

            current.push(Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost));
        }

        previous = current;
    }

    return previous[second.length];
}

function getScore(name, query)
{
    if (name == query)
        return 0;

    if (name.startsWith(query))
        return 1;

    if (name.split(/[-_ ]/).some(part => part.startsWith(query)))
        return 2;

    if (name.includes(query))
        return 3;

    const   tolerance = query.length >= 6 ? 2 : (query.length >= 3 ? 1 : 0);
    const   distance = Math.min(getDistance(query, name), getDistance(query, name.slice(0, query.length)));

    if (distance > tolerance)
        return null;

    return 4 + distance;
}

function findTags(text)
{
    const   query = normalize(text.trim());

    if (query.length == 0 || app.hierarchy == null || app.hierarchy.tags == null)
        return [];

    const   found = [];

    for (const url of app.hierarchy.tags)
    {
        const   name = getTagName(url);
        const   score = getScore(normalize(name), query);

        if (score != null)
            found.push({ url: url, name: name, score: score });
    }

    found.sort((first, second) => first.score - second.score
        || first.name.length - second.name.length
        || first.name.localeCompare(second.name));

    return found.slice(0, MAX_RESULTS);
}

function closeResults()
{
    results = [];
    active = -1;

    document.getElementById("search-results").classList.add("hidden");
}

function renderResults()
{
    const   list = document.getElementById("search-results");

    list.replaceChildren();

    results.forEach((result, index) =>
    {
        const   item = document.createElement("li");
        const   conflict = app.explainConflict != null ? app.explainConflict(result.url) : null;

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
}

function setActive(index)
{
    active = index;

    const   items = document.querySelectorAll("#search-results li");

    items.forEach((item, position) => item.classList.toggle("active", position == active));

    if (active >= 0)
        items[active].scrollIntoView({ block: "nearest" });
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

    if (app.reveal != null)
        app.reveal(result.url);
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

export function showSearch()
{
    document.getElementById("search").classList.remove("hidden");
}

export function hideSearch()
{
    const   input = document.getElementById("search-input");

    input.value = "";
    input.blur();

    closeResults();

    document.getElementById("search").classList.add("hidden");
}

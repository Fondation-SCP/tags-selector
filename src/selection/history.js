import { changeSelection } from "../graph/branches/events.js";
import { isPopupOpen } from "../popup.js";

const   HISTORY_LIMIT = 100;

let     entries = [[]];
let     position = 0;

function getKey(urls)
{
    return [...urls].sort().join(" ");
}

function updateButtons()
{
    document.getElementById("history-undo").disabled = position == 0;
    document.getElementById("history-redo").disabled = position == entries.length - 1;
}

export function recordSelection(urls)
{
    if (getKey(urls) == getKey(entries[position]))
        return;

    entries = entries.slice(0, position + 1);
    entries.push([...urls]);

    if (entries.length > HISTORY_LIMIT)
        entries.shift();

    position = entries.length - 1;

    updateButtons();
}

export function resetHistory()
{
    entries = [[]];
    position = 0;

    updateButtons();
}

function moveHistory(step)
{
    const   next = position + step;

    if (next < 0 || next >= entries.length)
        return;

    position = next;

    updateButtons();

    changeSelection(entries[position]);
}

function isBusy(target)
{
    if (target instanceof HTMLInputElement)
        return true;

    return isPopupOpen();
}

export function initHistory()
{
    document.getElementById("history-undo").addEventListener("click", () => moveHistory(-1));
    document.getElementById("history-redo").addEventListener("click", () => moveHistory(1));

    document.addEventListener("keydown", (event) =>
    {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || isBusy(event.target))
            return;

        const   key = event.key.toLowerCase();

        if (key == "z" && !event.shiftKey)
            moveHistory(-1);
        else if (key == "y" || (key == "z" && event.shiftKey))
            moveHistory(1);
        else
            return;

        event.preventDefault();
    });

    updateButtons();
}

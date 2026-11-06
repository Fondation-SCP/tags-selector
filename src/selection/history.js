import { isPopupOpen } from "../popup.js";
import { isLoading } from "../loading.js";

const   HISTORY_LIMIT = 100;

const   EMPTY_ENTRY = { urls: [], key: "" };

let     entries = [EMPTY_ENTRY];
let     position = 0;

let     applySelection = null;

export function getSelectionKey(urls)
{
    return [...urls].sort().join(" ");
}

function updateButtons()
{
    document.getElementById("history-undo").disabled = position == 0;
    document.getElementById("history-redo").disabled = position == entries.length - 1;
}

export function recordSelection(urls, key = getSelectionKey(urls))
{
    if (key == entries[position].key)
        return;

    entries = entries.slice(0, position + 1);
    entries.push({ urls: [...urls], key: key });

    if (entries.length > HISTORY_LIMIT)
        entries.shift();

    position = entries.length - 1;

    updateButtons();
}

export function resetHistory()
{
    entries = [EMPTY_ENTRY];
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

    applySelection(entries[position].urls);
}

function isBusy(target)
{
    if (target instanceof HTMLInputElement)
        return true;

    return isPopupOpen() || isLoading();
}

export function initHistory(apply)
{
    applySelection = apply;

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

function buildPart(part)
{
    if (typeof part == "string")
        return part;

    const   element = document.createElement("em");

    element.textContent = part.italic;

    return element;
}

const   queue = [];

let     current = null;

function displayPopup(entry)
{
    const   ok = document.getElementById("popup-ok");
    const   cancel = document.getElementById("popup-cancel");

    current = entry;

    document.getElementById("popup-title").textContent = entry.title;
    document.getElementById("popup-text").replaceChildren(...entry.message.map(buildPart));

    ok.textContent = entry.confirm == null ? "OK" : entry.confirm.label;
    cancel.classList.toggle("hidden", entry.confirm == null);

    document.getElementById("popup-overlay").classList.remove("hidden");

    (entry.confirm == null ? ok : cancel).focus();
}

function closePopup(confirmed)
{
    const   entry = current;

    current = null;

    document.getElementById("popup-overlay").classList.add("hidden");

    if (confirmed && entry != null && entry.confirm != null)
        entry.confirm.action();

    const   next = queue.shift();

    if (next != null)
        displayPopup(next);
}

function queuePopup(entry)
{
    if (current != null)
        queue.push(entry);
    else
        displayPopup(entry);
}

export function isPopupOpen()
{
    return current != null;
}

export function showPopup(title, message)
{
    queuePopup({ title: title, message: message, confirm: null });
}

export function showConfirm(title, message, label, action)
{
    queuePopup({ title: title, message: message, confirm: { label: label, action: action } });
}

export function clearPopups()
{
    queue.length = 0;
    current = null;

    document.getElementById("popup-overlay").classList.add("hidden");
}

export function initPopup()
{
    document.getElementById("popup-ok").addEventListener("click", () => closePopup(true));
    document.getElementById("popup-cancel").addEventListener("click", () => closePopup(false));

    document.addEventListener("keydown", (event) =>
    {
        if (event.key == "Escape" && current != null)
            closePopup(false);
    });
}

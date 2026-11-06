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
let     returnFocus = null;

export function updateInert()
{
    const   popup = !document.getElementById("popup-overlay").classList.contains("hidden");
    const   loading = !document.getElementById("loading-overlay").classList.contains("hidden");

    document.getElementById("page").inert = popup || loading;
    document.getElementById("loading-overlay").inert = popup;
}

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

    updateInert();

    (entry.confirm == null ? ok : cancel).focus();
}

function closePopup(confirmed)
{
    const   entry = current;

    current = null;

    document.getElementById("popup-overlay").classList.add("hidden");

    const   next = queue.shift();

    if (next != null)
        displayPopup(next);
    else
    {
        updateInert();

        returnFocus?.focus();
        returnFocus = null;
    }

    if (confirmed && entry != null && entry.confirm != null)
        entry.confirm.action();
}

function queuePopup(entry)
{
    if (current != null)
    {
        queue.push(entry);
        return;
    }

    returnFocus = document.activeElement;

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
    returnFocus = null;

    document.getElementById("popup-overlay").classList.add("hidden");

    updateInert();
}

export function initPopup()
{
    const   overlay = document.getElementById("popup-overlay");

    document.getElementById("popup-ok").addEventListener("click", () => closePopup(true));
    document.getElementById("popup-cancel").addEventListener("click", () => closePopup(false));

    overlay.addEventListener("mousedown", (event) =>
    {
        if (event.target == overlay)
            event.preventDefault();
    });

    document.addEventListener("keydown", (event) =>
    {
        if (event.key == "Escape" && current != null)
            closePopup(false);
    });
}

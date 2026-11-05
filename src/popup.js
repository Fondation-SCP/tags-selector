function buildPart(part)
{
    if (typeof part == "string")
        return part;

    const   element = document.createElement("em");

    element.textContent = part.italic;

    return element;
}

export function showPopup(title, message)
{
    document.getElementById("popup-title").textContent = title;
    document.getElementById("popup-text").replaceChildren(...message.map(buildPart));
    document.getElementById("popup-overlay").classList.remove("hidden");
    document.getElementById("popup-ok").focus();
}

export function hidePopup()
{
    document.getElementById("popup-overlay").classList.add("hidden");
}

export function initPopup()
{
    document.getElementById("popup-ok").addEventListener("click", hidePopup);

    document.addEventListener("keydown", (event) =>
    {
        if (event.key == "Escape")
            hidePopup();
    });
}

import { app } from "../state.js";
import { findTag } from "../graph/init.js";
import { clearSelection, deselectTag, revealTag } from "../graph/events.js";
import { getParentsText } from "../graph/info.js";
import { showPopup } from "../popup.js";

const   COPY_FEEDBACK = 1500;

let     copyTimer = null;

function buildChip(name)
{
    const   chip = document.createElement("span");
    const   label = document.createElement("button");
    const   url = findTag(name);
    const   tooltip = getParentsText(url);

    chip.className = "selected-tag";

    const   remove = document.createElement("button");

    label.textContent = name;
    label.classList.add("clickable");
    label.addEventListener("click", () => revealTag(url));

    if (tooltip != null)
        label.title = tooltip;

    remove.className = "selected-tag-remove";
    remove.textContent = "×";
    remove.title = "Retirer de la sélection";
    remove.setAttribute("aria-label", `Retirer ${name} de la sélection`);
    remove.addEventListener("click", () => deselectTag(url));

    chip.appendChild(label);
    chip.appendChild(remove);

    return chip;
}

// Met à jour les tags sélectionnés sur la page
export function updateTagsBox()
{
    // L'encart n'est affiché que si au moins un tag est sélectionné
    document.getElementById("selected-tags").classList.toggle("hidden", app.selectedTags.size == 0);
    document.getElementById("selected-tags-list").replaceChildren(...[...app.selectedTags].map(buildChip));
}

async function copyTags()
{
    const   button = document.getElementById("selected-tags-copy");
    const   text = [...app.selectedTags].join(" ");

    try
    {
        await navigator.clipboard.writeText(text);
    }
    catch
    {
        showPopup("Copie impossible", ["Le presse-papiers n'est pas accessible depuis cette page. Copiez les tags à la main :\n\n", { italic: text }]);
        return;
    }

    clearTimeout(copyTimer);

    button.textContent = "Copié !";

    copyTimer = setTimeout(() => button.textContent = "Copier", COPY_FEEDBACK);
}

export function initTagsBox()
{
    document.getElementById("selected-tags-reset").addEventListener("click", clearSelection);
    document.getElementById("selected-tags-copy").addEventListener("click", copyTags);
}

import { app } from "../main.js";
import { findTag } from "../graph/branches/init.js";
import { clearSelection, deselectTag, revealTag } from "../graph/branches/events.js";
import { showPopup } from "../popup.js";

const   COPY_FEEDBACK = 1500;

let     copyTimer = null;

function buildChip(name)
{
    const   chip = document.createElement("span");
    const   label = document.createElement("span");
    const   url = findTag(name);

    chip.className = "selected-tag";

    const   remove = document.createElement("button");

    label.textContent = name;
    label.classList.add("clickable");
    label.addEventListener("click", () => revealTag(url));

    remove.className = "selected-tag-remove";
    remove.textContent = "×";
    remove.title = "Retirer de la sélection";
    remove.addEventListener("click", () => deselectTag(url));

    chip.appendChild(label);
    chip.appendChild(remove);

    return chip;
}

// Met à jour les tags sélectionnés sur la page
export function updateTagsBox()
{
    const   box = document.getElementById("selected-tags");
    const   title = document.getElementById("selected-tags-title");
    const   list = document.getElementById("selected-tags-list");

    // L'encart n'est affiché que si au moins un tag est sélectionné
    box.classList.toggle("hidden", app.selectedTags.size == 0);

    if (app.selectedTags.size == 0)
    {
        title.textContent = "Aucun tag sélectionné";
        list.replaceChildren();
    }
    else
    {
        title.textContent = "Tag(s) sélectionné(s):";
        list.replaceChildren(...[...app.selectedTags].map(buildChip));
    }
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

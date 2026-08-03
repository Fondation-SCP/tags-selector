import { app } from "../main.js";

// Met à jour les tags sélectionnés sur la page
export function updateTagsBox()
{
    const   title = document.getElementById("selected-tags-title");
    const   list = document.getElementById("selected-tags-list");

    if (app.selectedTags.size == 0)
    {
        title.textContent = "Aucun tag sélectionné";
        list.textContent = "";
    }
    else
    {
        title.textContent = "Tag(s) sélectionné(s):";
        list.textContent = [...app.selectedTags].join(", ");
    }
}

// Ajoute un tag à la variable globale et à la page
export function addTag(tagName)
{
    app.selectedTags.add(tagName);

    updateTagsBox();
}

// Retire un tag à la variable globale et à la page
export function removeTag(tagName)
{
    app.selectedTags.delete(tagName);

    updateTagsBox();
}

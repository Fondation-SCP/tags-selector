import { app } from "../main.js";
import { initGraph } from "../graph/init.js";
import { registerGraphEvents } from "../events.js";
import { initBranchesGraph } from "../graph/branches/init.js";
import { registerBranchesEvents } from "../graph/branches/events.js";
import { updateTagsBox } from "../selection/tools.js";
import { showLoading, hideLoading } from "../loading.js";

// Affiche un message à la place d'un affichage non implémenté
function showPlaceholder(number)
{
    const   placeholder = document.getElementById("placeholder");

    placeholder.textContent = `Affichage ${number} : à venir`;
    placeholder.classList.remove("hidden");
}

// Cache le message des affichages non implémentés
function hidePlaceholder()
{
    document.getElementById("placeholder").classList.add("hidden");
}

// Liste des affichages disponibles
// Chaque affichage est une fonction qui construit la page à partir de l'ontologie
export const views =
[
    async () =>
    {
        // Initialisation du graphe
        await initGraph();
        // Enregistrement des événements relatifs au graphe
        registerGraphEvents();
    },

    async () =>
    {
        await initBranchesGraph();

        registerBranchesEvents();
    },

    async () => showPlaceholder(3)
];

// Met en évidence le bouton de l'affichage courant
function updateViewsButtons()
{
    const   buttons = document.querySelectorAll("#views .view-button");

    buttons.forEach((button, index) => button.classList.toggle("active", index == app.view));
}

// Crée un bouton numéroté par affichage disponible
export function initViewsButtons()
{
    const   container = document.getElementById("views");

    for (let index = 0; index < views.length; index++)
    {
        const   button = document.createElement("button");

        button.className = "view-button";
        button.textContent = index + 1;

        // Changement d'affichage au clic
        button.addEventListener("click", () => loadView(index).catch(console.error));

        container.appendChild(button);
    }
}

// Remplace l'affichage courant par un autre
export async function loadView(index)
{
    // L'affichage demandé est déjà celui en cours
    if (app.view == index)
        return;

    showLoading();

    // Destruction du graphe de l'affichage précédent
    if (app.cy != null)
        app.cy.destroy();

    hidePlaceholder();

    app.cy = null;
    app.view = index;

    app.hierarchy = null;

    // Remise à zéro des tags sélectionnés
    app.selectedTags = new Set();
    updateTagsBox();

    updateViewsButtons();

    // Construction du nouvel affichage
    await views[index]();

    hideLoading();
}

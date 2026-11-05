import { app } from "../main.js";
import { initGraph } from "../graph/init.js";
import { registerGraphEvents } from "../events.js";
import { initBranchesGraph } from "../graph/branches/init.js";
import { registerBranchesEvents } from "../graph/branches/events.js";
import { updateTagsBox } from "../selection/tools.js";
import { resetHistory } from "../selection/history.js";
import { showSearch, hideSearch } from "../search/tools.js";
import { showLoading, hideLoading, failLoading, checkLibrary } from "../loading.js";
import { clearPopups, isPopupOpen } from "../popup.js";
import { hideTagInfo } from "../graph/branches/info.js";

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
        await initBranchesGraph();

        registerBranchesEvents();
    },

    async () => showPlaceholder(2),

    async () =>
    {
        checkLibrary("cytoscape-dagre", cytoscape("layout", "dagre") != null);

        // Initialisation du graphe
        await initGraph();
        // Enregistrement des événements relatifs au graphe
        registerGraphEvents();
    }
];

let     loading = false;

export function initViewsKeys()
{
    document.addEventListener("keydown", (event) =>
    {
        if (event.key != "Tab" || isPopupOpen())
            return;

        event.preventDefault();

        if (loading)
            return;

        const   step = event.shiftKey ? views.length - 1 : 1;

        loadView((app.view + step) % views.length).catch(failLoading);
    });
}

export function initGraphButtons()
{
    document.getElementById("graph-expand").addEventListener("click", () =>
    {
        if (app.expand != null)
            app.expand();
    });

    document.getElementById("graph-collapse").addEventListener("click", () =>
    {
        if (app.collapse != null)
            app.collapse();
    });
}

function updateGraphControls()
{
    document.getElementById("graph-controls").classList.toggle("hidden", app.expand == null);

    if (app.reveal == null)
        hideSearch();
    else
        showSearch();
}

// Remplace l'affichage courant par un autre
export async function loadView(index, force)
{
    // L'affichage demandé est déjà celui en cours
    if (app.view == index && !force)
        return;

    loading = true;

    showLoading();
    clearPopups();
    hideTagInfo();

    // Destruction du graphe de l'affichage précédent
    if (app.cy != null)
        app.cy.destroy();

    hidePlaceholder();

    app.cy = null;
    app.view = index;

    app.hierarchy = null;
    app.collapse = null;
    app.expand = null;
    app.reveal = null;
    app.select = null;
    app.deselect = null;
    app.clear = null;
    app.explainConflict = null;

    // Remise à zéro des tags sélectionnés
    app.selectedTags = new Set();
    updateTagsBox();

    resetHistory();

    updateGraphControls();

    try
    {
        // Construction du nouvel affichage
        await views[index]();
    }
    finally
    {
        loading = false;
    }

    updateGraphControls();

    hideLoading();
}

export async function reloadView()
{
    await loadView(app.view, true);
}

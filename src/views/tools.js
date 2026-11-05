import { app } from "../main.js";
import { initBranchesGraph } from "../graph/branches/init.js";
import { registerBranchesEvents, collapseAll, expandAll } from "../graph/branches/events.js";
import { updateTagsBox } from "../selection/tools.js";
import { resetHistory } from "../selection/history.js";
import { showLoading, hideLoading } from "../loading.js";
import { clearPopups } from "../popup.js";
import { hideTagInfo } from "../graph/branches/info.js";

export function initGraphButtons()
{
    document.getElementById("graph-expand").addEventListener("click", expandAll);
    document.getElementById("graph-collapse").addEventListener("click", collapseAll);
}

// Construit l'affichage à partir de l'ontologie, en remplaçant le précédent s'il existe
export async function loadView()
{
    showLoading();
    clearPopups();
    hideTagInfo();

    // Destruction du graphe de l'affichage précédent
    if (app.cy != null)
        app.cy.destroy();

    app.cy = null;
    app.hierarchy = null;

    // Remise à zéro des tags sélectionnés
    app.selectedTags = new Set();
    updateTagsBox();

    resetHistory();

    // Construction du nouvel affichage
    await initBranchesGraph();

    registerBranchesEvents();

    hideLoading();
}

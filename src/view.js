import { app } from "./state.js";
import { buildHierarchy, getUnreachableTags, initGraph } from "./graph/init.js";
import { registerGraphEvents, collapseAll, expandAll } from "./graph/events.js";
import { updateTagsBox } from "./selection/tools.js";
import { resetHistory } from "./selection/history.js";
import { getTagName } from "./database/tools.js";
import { clearPopups, showPopup } from "./popup.js";
import { hideTagInfo } from "./graph/info.js";

const   UNREACHABLE_SHOWN = 10;

export function initGraphButtons()
{
    document.getElementById("graph-expand").addEventListener("click", expandAll);
    document.getElementById("graph-collapse").addEventListener("click", collapseAll);
}

function warnUnreachable()
{
    const   tags = getUnreachableTags();

    if (tags.length == 0)
        return;

    const   message = ["Ces tags ne descendent d'aucune racine et n'apparaissent pas dans le graphe :\n"];

    for (const url of tags.slice(0, UNREACHABLE_SHOWN))
        message.push("\n", { italic: getTagName(url) });

    if (tags.length > UNREACHABLE_SHOWN)
        message.push(`\n… et ${tags.length - UNREACHABLE_SHOWN} autres`);

    message.push("\n\nLeur ascendance passe par une classe non déclarée comme ", { italic: "owl:Class" }, ", ou forme un cycle de ", { italic: "rdfs:subClassOf" }, ".");

    showPopup("Tags non rattachés", message);
}

// Construit l'affichage à partir de l'ontologie, en remplaçant le précédent s'il existe
export async function loadView(rdf)
{
    const   hierarchy = await buildHierarchy(rdf);

    clearPopups();
    hideTagInfo();

    // Destruction du graphe de l'affichage précédent
    if (app.cy != null)
        app.cy.destroy();

    app.cy = null;
    app.hierarchy = hierarchy;

    // Remise à zéro des tags sélectionnés
    app.selectedTags = new Set();
    updateTagsBox();

    resetHistory();

    // Construction du nouvel affichage
    try
    {
        initGraph();

        registerGraphEvents();
    }
    catch (error)
    {
        app.cy?.destroy();
        app.cy = null;

        throw error;
    }

    warnUnreachable();
}

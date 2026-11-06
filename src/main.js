import { app } from "./state.js";
import { loadRdf } from "./database/tools.js";
import { initGraphButtons, loadView } from "./view.js";
import { initTagsBox } from "./selection/tools.js";
import { initHistory } from "./selection/history.js";
import { initSearch } from "./search/tools.js";
import { initLocalRdf, showOntologySource } from "./database/local.js";
import { initPopup } from "./popup.js";
import { initRefresh } from "./refresh.js";
import { initTheme } from "./theme.js";
import { checkLibrary, failLoading, hideLoading } from "./loading.js";

const   RDF_URL = "https://Fondation-SCP.github.io/tags-selector/resources/ontology/structure-tags.rdf";

window.removeEventListener("error", onScriptError);

// Point de départ du programme
async function main()
{
    initPopup();

    initTheme();

    checkLibrary("Comunica", typeof Comunica != "undefined");
    checkLibrary("Cytoscape.js", typeof cytoscape != "undefined");

    // Instanciation de Comunica pour faire des requêtes SPARQL au fichier .rdf
    app.engine = new Comunica.QueryEngine();

    initLocalRdf();

    initTagsBox();

    initGraphButtons();

    initSearch();

    initHistory();

    initRefresh();

    // URL du fichier .rdf de l'ontologie
    const   url = new URLSearchParams(location.search).get("rdf") || RDF_URL;

    if (url != RDF_URL)
        showOntologySource(`Ontologie : ${url}`);

    // Téléchargement du .rdf, puis chargement de l'affichage
    await loadView(await loadRdf(url));

    hideLoading();
}

// Affichage d'un message d'erreur si le chargement échoue
main().catch(failLoading);

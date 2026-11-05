import { loadRdf } from "./database/tools.js";
import { initViewsKeys, initGraphButtons, loadView } from "./views/tools.js";
import { initTagsBox } from "./selection/tools.js";
import { initSearch } from "./search/tools.js";
import { initPopup } from "./popup.js";
import { failLoading } from "./loading.js";

// Données globales de l'application
export const app =
{
    // Url du .rdf
    rdfUrl: null,
    // Texte du .rdf
    rdf: null,

    // Comunica
    engine: null,

    // Graphe
    cy: null,

    hierarchy: null,

    collapse: null,
    expand: null,
    reveal: null,
    explainConflict: null,

    // Affichage courant
    view: null,

    // Tags sélectionnés
    selectedTags: []
}

// Point de départ du programme
async function main()
{
    // URL du fichier .rdf de l'ontologie
    app.rdfUrl = "https://Fondation-SCP.github.io/tags-selector/resources/ontology/structure-tags.rdf";
    // Téléchargement du .rdf
    await loadRdf();

    // Instanciation de Comunica pour faire des requêtes SPARQL au fichier .rdf
    app.engine = new Comunica.QueryEngine();

    initViewsKeys();

    initTagsBox();

    initGraphButtons();

    initSearch();

    initPopup();

    // Chargement de l'affichage par défaut
    await loadView(0);
}

// Affichage d'un message d'erreur si le chargement échoue
main().catch((error) =>
{
    console.error(error);
    failLoading();
});

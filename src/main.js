import { loadRdf } from "./database/tools.js";
import { initViewsButtons, loadView } from "./views/tools.js";
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

    // Création des boutons de changement d'affichage
    initViewsButtons();

    // Chargement de l'affichage par défaut
    await loadView(0);
}

// Affichage d'un message d'erreur si le chargement échoue
main().catch((error) =>
{
    console.error(error);
    failLoading();
});

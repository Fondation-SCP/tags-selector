import { printList, loadRdf } from "./database/tools.js";
import { initGraph } from "./graph/init.js";
import { registerGraphEvents } from "./events.js";
import { getSub } from "./database/get.js";

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

    // Initialisation du graphe
    await initGraph();
    // Enregistrement des événements relatifs au graphe
    registerGraphEvents();

    app.selectedTags = new Set();
}

main();

/*

Code de test :

    // Récupère puis affiche tous les sous tags du tag "informatique"
    // printList(await getSub("http://www.semanticweb.org/ontologies/2025/6/tags#~informatique"));

    // Récupère puis affiche les noeuds racine
    // printList(await getRoots());

    // Récupère les noeuds isolés (hérite de personne et personne n'en hérite)
    // printList(await getUniques());

*/

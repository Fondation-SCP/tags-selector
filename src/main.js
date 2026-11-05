import { loadRdf, getTagName } from "./database/tools.js";
import { getAll } from "./database/get.js";
import { getUnreachableTags } from "./graph/branches/init.js";
import { initGraphButtons, loadView } from "./views/tools.js";
import { initTagsBox } from "./selection/tools.js";
import { initHistory } from "./selection/history.js";
import { initSearch } from "./search/tools.js";
import { initLocalRdf, showOntologySource } from "./database/local.js";
import { initPopup, showPopup } from "./popup.js";
import { initRefresh } from "./refresh.js";
import { LoadError, checkLibrary, failLoading } from "./loading.js";

const   UNREACHABLE_SHOWN = 10;
const   RDF_URL = "https://Fondation-SCP.github.io/tags-selector/resources/ontology/structure-tags.rdf";

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

    // Tags sélectionnés
    selectedTags: []
}

export async function checkOntology()
{
    let     tags;

    try
    {
        tags = await getAll();
    }
    catch (error)
    {
        throw new LoadError("RDF invalide", ["Le fichier de l'ontologie est un XML valide, mais pas un RDF/XML correct :\n\n", { italic: error.message }], error);
    }

    if (tags.length == 0)
        throw new LoadError("Ontologie vide", ["Aucun tag n'a été trouvé : l'ontologie ne déclare aucune classe ", { italic: "owl:Class" }, "."]);
}

export function warnUnreachable()
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

// Point de départ du programme
async function main()
{
    initPopup();

    checkLibrary("Comunica", typeof Comunica != "undefined");
    checkLibrary("Cytoscape.js", typeof cytoscape != "undefined");

    // URL du fichier .rdf de l'ontologie
    app.rdfUrl = new URLSearchParams(location.search).get("rdf") ?? RDF_URL;

    if (app.rdfUrl != RDF_URL)
        showOntologySource(`Ontologie : ${app.rdfUrl}`);

    // Téléchargement du .rdf
    await loadRdf();

    // Instanciation de Comunica pour faire des requêtes SPARQL au fichier .rdf
    app.engine = new Comunica.QueryEngine();

    await checkOntology();

    initTagsBox();

    initGraphButtons();

    initSearch();

    initHistory();

    initRefresh();

    initLocalRdf();

    // Chargement de l'affichage
    await loadView();

    warnUnreachable();
}

// Affichage d'un message d'erreur si le chargement échoue
main().catch(failLoading);

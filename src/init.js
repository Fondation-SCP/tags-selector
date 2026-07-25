// Données globales de l'application
export const app =
{
    // Url du .rdf
    rdfUrl: null,

    // Texte du .rdf
    rdf: null,

    // Comunica
    engine: null

    // ...
}

// Téléchargement du .rdf
// Dissociée de init() pour permettre des appels pendant l'exécution
export async function loadRdf()
{
    app.rdf = await fetch(app.rdfUrl).then(r => r.text());
}

// Initialisation de la structure globale "app"
export async function init()
{
    // URL du fichier .rdf de l'ontologie
    app.rdfUrl = "https://Fondation-SCP.github.io/tags-selector/resources/ontology/structure-tags.rdf";

    // Téléchargement du .rdf
    await loadRdf();

    // Instanciation de Comunica pour faire des requêtes SPARQL au fichier .rdf
    app.engine = new Comunica.QueryEngine();
}

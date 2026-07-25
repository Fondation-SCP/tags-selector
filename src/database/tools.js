import { app } from "../main.js";

// Affiche une liste de tags passée en paramètre
export function printList(tags)
{
    for (const element of tags)
    {
        const   uri = element.get("element").value;
        const   name = uri.split("#").pop();

        console.log("> '" + name + "'");
    }

    console.log("Total: " + tags.length);
}

// Téléchargement du .rdf
// Dissociée de main() pour permettre des appels pendant l'exécution
export async function loadRdf()
{
    app.rdf = await fetch(app.rdfUrl).then(r => r.text());
}

// Lance une requête SPARQL au .rdf stocké en mémoire
export async function get(query)
{
    return await app.engine.queryBindings(
        query,
        {
            sources:
            [{
                type: "serialized",
                value: app.rdf,
                mediaType: "application/rdf+xml"
            }]
        }
    );
}

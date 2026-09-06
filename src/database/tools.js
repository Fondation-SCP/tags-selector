import { app } from "../main.js";

export function getTagName(url)
{
    return url.split("#").pop();
}

// Affiche une liste de tags passée en paramètre
export function printList(tags)
{
    for (const element of tags)
    {
        const   url = element.get("element").value;
        const   name = getTagName(url);

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

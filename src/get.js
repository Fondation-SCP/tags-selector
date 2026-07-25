import { get } from "./tools.js";

// Renvoie tous les tags
export async function getAll()
{
    const   query = `
        PREFIX owl: <http://www.w3.org/2002/07/owl#>

        SELECT ?element
        WHERE {
            ?element a owl:Class .
        }
        `;

    const   stream = await get(query);

    return await stream.toArray();
}

// Renvoie tous les tags racine
export async function getRoots()
{
    const   query = `
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?element
        WHERE {
            ?element a owl:Class .

            FILTER NOT EXISTS {
                ?element rdfs:subClassOf ?root .
            }
            
            ?sub rdfs:subClassOf ?element .
        }
        `;

    const   stream = await get(query);

    return await stream.toArray();
}

export async function getIsolated()
{
    const   query = `
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?element
        WHERE {
            ?element a owl:Class .

            FILTER NOT EXISTS {
                ?element rdfs:subClassOf ?root .
            }
            
            FILTER NOT EXISTS {
                ?sub rdfs:subClassOf ?element .
            }
        }
        `;

    const   stream = await get(query);

    return await stream.toArray();
}

// Renvoie les sous tags de premier ordre à partir d'un tag
export async function getSub(tagUrl)
{
    const   query = `
        PREFIX owl: <http://www.w3.org/2002/07/owl#>

        SELECT ?element
        WHERE {
            ?element rdfs:subClassOf <${tagUrl}> .
        }
        `;

    const   stream = await get(query);

    return await stream.toArray();
}

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

// Renvoie les tags uniques
export async function getUniques()
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

// Renvoie tous les liens entre un tag et ses sous tags
export async function getLinks()
{
    const   query = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT DISTINCT ?parent ?child
        WHERE {
            ?child rdfs:subClassOf ?parent .
        }
        `;

    const   stream = await get(query);

    return await stream.toArray();
}

export async function getDisjoints()
{
    const   query = `
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT DISTINCT ?first ?second
        WHERE {
            {
                ?first owl:disjointWith ?second .
            }
            UNION
            {
                {
                    ?group a owl:AllDisjointClasses ;
                        owl:members ?members .
                }
                UNION
                {
                    ?union owl:disjointUnionOf ?members .
                }

                ?members rdf:rest*/rdf:first ?first .
                ?members rdf:rest*/rdf:first ?second .

                FILTER (?first != ?second)
            }
        }
        `;

    const   stream = await get(query);

    return await stream.toArray();
}

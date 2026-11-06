import { select } from "./tools.js";

// Renvoie tous les tags
export function getAll(rdf)
{
    return select(`
        SELECT ?element
        WHERE {
            ?element a owl:Class .
        }
        `, rdf);
}

// Renvoie tous les tags racine
export function getRoots(rdf)
{
    return select(`
        SELECT DISTINCT ?element
        WHERE {
            ?element a owl:Class .

            FILTER NOT EXISTS {
                ?element rdfs:subClassOf ?root .
            }

            ?sub rdfs:subClassOf ?element .
        }
        `, rdf);
}

// Renvoie les tags uniques
export function getUniques(rdf)
{
    return select(`
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
        `, rdf);
}

// Renvoie tous les liens entre un tag et ses sous tags
export function getLinks(rdf)
{
    return select(`
        SELECT DISTINCT ?parent ?child
        WHERE {
            ?child rdfs:subClassOf ?parent .
        }
        `, rdf);
}

export function getComments(rdf)
{
    return select(`
        SELECT ?element ?comment
        WHERE {
            ?element a owl:Class ;
                rdfs:comment ?comment .
        }
        `, rdf);
}

export function getDisjoints(rdf)
{
    return select(`
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
        `, rdf);
}

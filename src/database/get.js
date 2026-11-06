import { select } from "./tools.js";

export function getOntology(rdf)
{
    return select(`
        SELECT DISTINCT ?element ?comment ?parent ?child ?first ?second
        WHERE {
            {
                ?element a owl:Class .

                OPTIONAL {
                    ?element rdfs:comment ?comment .
                }
            }
            UNION
            {
                ?child rdfs:subClassOf ?parent .
            }
            UNION
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

                FILTER (STR(?first) < STR(?second))
            }
        }
        `, rdf);
}

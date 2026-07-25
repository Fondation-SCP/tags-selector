import { init } from "./init.js"
import { getSub, getRoots, getIsolated } from "./get.js";
import { printList } from "./tools.js";

async function main()
{
    await init();

    // Récupère puis affiche tous les sous tags du tag "informatique"
    printList(await getSub("http://www.semanticweb.org/ontologies/2025/6/tags#~informatique"));

    // Récupère puis affiche les noeuds racine
    printList(await getRoots());

    // Récupère les noeuds isolés (hérite de personne et personne n'en hérite)
    printList(await getIsolated());

    // ...
}

main();

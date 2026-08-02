import { app } from "../main.js";
import { getSub, getRoots, getUniques, getAll } from "../database/get.js";

// Fonction récursive
// Ajoute tous les sous noeuds d'un noeud
export async function addSubNodes(node)
{
    const   list = await getSub(node.data("url"));

    for (const element of list)
    {
        const   id = parseInt(app.cy.nodes().length) + 1;
        const   url = element.get("element").value;
        const   name = url.split("#").pop();

        const   exists = app.cy.getElementById(url).length > 0;

        const   newNode = app.cy.add ({
            data:
            {
                id: id,
                url: url,
                label: name
            },
        });

        // A rendre variable selon la configuration
        newNode.hide();

        if (exists == true)
            continue;

        app.cy.add ({
            data:
            {
                id: `${node.data("id")}-${id}`,
                source: node.data("id"),
                target: id
            },
        });

        await addSubNodes(newNode);
    }
}

// Cacher TOUS les sous noeuds d'un noeud
export function getAllSubNodes(node)
{
    let     nodes = app.cy.collection();

    node.outgoers("node").forEach(
        element =>
        {
            nodes = nodes.union(element);
            nodes = nodes.union(getAllSubNodes(element));
        }
    );

    return nodes;
}

// Afficher les sous noeuds de premier niveau d'un noeud
export function showDirectSubNodes(node)
{
    node.outgoers("node").show();
}

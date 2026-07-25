import { app } from "../main.js";
import { getSub, getRoots, getUniques } from "../database/get.js";

function initGraphBase()
{
    // Création d'un graphe vide
    // Définition des propriétés et du style de base du graph

    app.cy = cytoscape({
        container: document.getElementById("cy"),

        // Désactive le déplacement des noeuds à la souris
        autoungrabify: true,
        // Désative le déplacement de la caméra à la souris
        userPanningEnabled: false,

        elements: [],

        style:
        [
            {
                selector: "node",
                style:
                {
                    label: "data(label)",

                    "overlay-opacity": 0,

                    "text-wrap": "wrap",
                    "text-max-width": "65px",

                    "text-valign": "center",
                    "text-halign": "center",

                    "font-size": 16,

                    "background-color": "white",
                    color: "black",

                    "border-width": 2,
                    "border-color": "#555",

                    width: 75,
                    height: 75,

                    "text-valign": "center",
                    "text-halign": "center",
                }
            },
            {
                selector: ".selected",
                style:
                {
                    "background-color": "green",
                    color: "white"
                }
            },
            {
                selector: "edge",
                style:
                {
                    width: 2,
                    "line-color": "#000"
                }
            },
            {
                selector: "core",
                style: { "active-bg-opacity": 0 }
            }
        ],

        layout: { name: "grid" }
    });
}

async function initGraphNodes()
{
    // Récupération des tags de racine
    let     roots = await getRoots();

    // Récupération des tags uniques/isolés
    let     isolated = await getUniques();

    // Fusion des tags précédents
    let     allStart = [...roots, ...isolated];

    // Parcourt les tags et les instancie dans le graphe
    for (const element of allStart)
    {
        const url = element.get("element").value;
        const name = url.split("#").pop();

        app.cy.add ({
            data: { id: name, label: name },
        });
    }

    // Calcule la position des noeuds de façon cohérente et selon un layout
    app.cy.layout
    ({
        name: "grid",
        rows: 1,
        padding: 0
    }).run();

    // Place chaque noeud en haut du canvas
    app.cy.nodes().forEach(node => {
        node.position({
            x: node.position("x"),
            y: 75
        });
    });
}

export async function initGraph()
{
    // Création d'un graphe vide
    initGraphBase();

    // Ajout des noeuds racine de départ
    await initGraphNodes();
}

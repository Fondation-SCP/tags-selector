import { app } from "../main.js";
import { getAll, getLinks } from "../database/get.js";
import { updateLayout } from "./tools.js";

function initGraphBase()
{
    // Création d'un graphe vide
    // Définition des propriétés et du style de base du graph

    app.cy = cytoscape({
        container: document.getElementById("cy"),

        // Désactive le déplacement des noeuds à la souris
        autoungrabify: true,

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
                    "text-max-width": "40px",

                    "text-valign": "center",
                    "text-halign": "center",

                    "font-size": 10,

                    "background-color": "white",
                    color: "black",

                    "border-width": 2,
                    "border-color": "#555",

                    width: 40,
                    height: 40,
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
        ]
    });
}

async function initGraphNodes()
{
    // Récupération de la totalité des tags
    const   tags = await getAll();

    // Récupération de la totalité des liens entre un tag et ses sous tags
    const   links = await getLinks();

    // Tags et liens sont ajoutés en un seul bloc pour n'avoir qu'un recalcul du graphe
    app.cy.batch(() =>
    {
        // Instancie chaque tag dans le graphe
        // L'url du tag sert d'identifiant pour qu'un tag n'existe qu'en un seul exemplaire
        for (const element of tags)
        {
            const   url = element.get("element").value;
            const   name = url.split("#").pop();

            app.cy.add ({
                data:
                {
                    id: url,
                    url: url,
                    label: name,
                },
            });
        }

        // Relie chaque tag à ses sous tags
        for (const element of links)
        {
            const   parent = element.get("parent").value;
            const   child = element.get("child").value;

            // Un lien vers un tag non déclaré dans l'ontologie est ignoré
            if (app.cy.getElementById(parent).length == 0 || app.cy.getElementById(child).length == 0)
                continue;

            app.cy.add ({
                data:
                {
                    id: `${parent}-${child}`,
                    source: parent,
                    target: child
                },
            });
        }

        // Seuls les tags sans parent sont affichés au départ
        // A rendre variable selon la configuration
        app.cy.elements().hide();
        app.cy.nodes().filter(node => node.incomers("edge").length == 0).show();
    });

    // Calcule la position des noeuds de façon cohérente et selon un layout
    updateLayout();

    // Centre la vision sur l'ensemble du graphe
    app.cy.center(app.cy.nodes(":visible"));
}

export async function initGraph()
{
    // Création d'un graphe vide
    initGraphBase();

    // Ajout des noeuds racine de départ
    await initGraphNodes();
}

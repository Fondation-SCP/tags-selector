import { app } from "./main.js";
import { addTag, removeTag } from "./selection/tools.js";
import { showDirectSubNodes, getAllSubNodes, updateLayout } from "./graph/tools.js";

// Enregistrement des événements relatifs au graphe
export function registerGraphEvents()
{
    // Changement de curseur en cas de survol d'un noeud
    app.cy.on("mouseover", "node", () => {
        app.cy.container().style.cursor = "pointer";
    });

    // Changement de curseur en cas de survol d'un noeud
    app.cy.on("mouseout", "node", () => {
        app.cy.container().style.cursor = "default";
    });

    // Changement de couleur (-> vert) en cas de clic sur un noeud
    app.cy.on("tap", "node", (event) =>
    {
        const   node = event.target;
        const   tagName = node.data().label;

        // Mise à jour de l'affichage du noeud
        node.toggleClass("selected");

        if (node.hasClass("selected"))
        {
            // Ajout du tag à la liste
            addTag(tagName);

            // Affichage des sous noeuds de premier niveau
            showDirectSubNodes(node);

            // Calcule la position des noeuds de façon cohérente et selon un layout
            updateLayout();
        }
        else
        {
            // Récupération des sous noeuds du tag cliqué
            const   nodes = getAllSubNodes(node);

            // Retrait du tag cliqué de la liste
            removeTag(tagName);

            // Retrait de la liste et dé-affichage de tous les sous noeuds du tag cliqué
            for (const element of nodes)
            {
                removeTag(element.data().label);

                element.connectedEdges().hide();
                element.hide();

                if (element.hasClass("selected"))
                    element.toggleClass("selected");
            }
        }
    });
}

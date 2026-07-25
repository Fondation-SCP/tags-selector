import { app } from "../main.js";

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
    app.cy.on("tap", "node", (event) => {
        event.target.toggleClass("selected");
    });
}

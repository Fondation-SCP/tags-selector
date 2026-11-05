import { app } from "../main.js";

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
    node.outgoers("node").connectedEdges().show();
    node.outgoers("node").show();
}

// Met à jour l'affichage global selon le graphe mis à jour
export function updateLayout()
{
    const   savedZoom = app.cy.zoom();
    const   savedPan = app.cy.pan();

    app.cy.layout({
        name: "dagre",
        rankDir: "TB",
        ranker: "tight-tree",
        nodeSep: 50,
        rankSep: 100,
        padding: 50,
        animate: false,
        fit: false,
        eles: app.cy.elements(":visible")
    }).run();

    app.cy.zoom(savedZoom);
    app.cy.pan(savedPan);
}

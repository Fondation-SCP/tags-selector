import { app } from "../../main.js";
import { getAll, getRoots, getUniques, getLinks } from "../../database/get.js";
import { getTagName } from "../../database/tools.js";
import { baseStyle } from "../style.js";
import { initBranchesRadius, updateBranchesLayout } from "./layout.js";

const   TRUNK_COLORS =
[
    "#7a6a5f",
    "#6b7f6e",
    "#5f7080",
    "#8a6f7d",
    "#8a7a55",
    "#5c7a75",
    "#7d6480",
    "#96705f",
    "#69708a",
    "#7f8560"
];

function hashId(id)
{
    let     hash = 0;

    for (let index = 0; index < id.length; index++)
        hash = (hash * 31 + id.charCodeAt(index)) % 100000007;

    return hash;
}

export function getTrunkColor(ownerId, parentColor)
{
    const   start = hashId(ownerId) % TRUNK_COLORS.length;

    for (let step = 0; step < TRUNK_COLORS.length; step++)
    {
        const   color = TRUNK_COLORS[(start + step) % TRUNK_COLORS.length];

        if (color != parentColor)
            return color;
    }

    return TRUNK_COLORS[start];
}

const   branchesStyle =
[
    {
        selector: "node.tag",
        style:
        {
            shape: "round-rectangle",

            width: "label",
            height: "label",
            padding: 6,

            "text-max-width": "80px",
            "text-overflow-wrap": "anywhere"
        }
    },
    {
        selector: "node.expandable",
        style:
        {
            "border-width": 4,
            "border-color": "#333"
        }
    },
    {
        selector: "node.joint, node.fork",
        style:
        {
            label: "",

            width: 1,
            height: 1,

            "background-opacity": 0,
            "border-width": 0,

            events: "no"
        }
    },
    {
        selector: "edge.trunk",
        style:
        {
            width: "data(width)",
            "line-color": "data(color)"
        }
    },
    {
        selector: "edge.branch",
        style:
        {
            width: "data(width)",
            "line-color": "#6f6f6f"
        }
    }
];

function initBranchesBase()
{
    app.cy = cytoscape({
        container: document.getElementById("cy"),

        autoungrabify: true,

        elements: [],

        style: [...baseStyle, ...branchesStyle]
    });
}

async function initBranchesData()
{
    const   tags = await getAll();
    const   roots = await getRoots();
    const   uniques = await getUniques();
    const   links = await getLinks();

    const   known = new Set(tags.map(element => element.get("element").value));
    const   children = new Map();

    for (const element of links)
    {
        const   parent = element.get("parent").value;
        const   child = element.get("child").value;

        if (!known.has(parent) || !known.has(child))
            continue;

        if (!children.has(parent))
            children.set(parent, []);

        children.get(parent).push(child);
    }

    for (const list of children.values())
        list.sort((first, second) => getTagName(first).localeCompare(getTagName(second)));

    const   sortByName = (first, second) => getTagName(first).localeCompare(getTagName(second));

    app.hierarchy =
    {
        children: children,
        roots: roots.map(element => element.get("element").value).sort(sortByName),
        isolated: uniques.map(element => element.get("element").value).sort(sortByName)
    };
}

export function isExpandable(url)
{
    return app.hierarchy.children.has(url);
}

export function addTagNode(id, url, owner, order, depth, position)
{
    return app.cy.add({
        data:
        {
            id: id,
            url: url,
            label: getTagName(url),
            owner: owner,
            order: order,
            depth: depth
        },

        position: position,

        classes: isExpandable(url) ? "tag expandable" : "tag"
    });
}

function initBranchesNodes()
{
    app.cy.batch(() =>
    {
        for (const url of app.hierarchy.isolated)
            addTagNode(url, url, null, 0, 0, { x: 0, y: 0 });

        for (const url of app.hierarchy.roots)
            addTagNode(url, url, null, 0, 0, { x: 0, y: 0 });
    });

    initBranchesRadius();
    updateBranchesLayout();

    app.cy.fit(app.cy.nodes(), 80);

    if (app.cy.zoom() > 1)
    {
        app.cy.zoom(1);
        app.cy.center(app.cy.nodes());
    }
}

export async function initBranchesGraph()
{
    initBranchesBase();

    await initBranchesData();

    initBranchesNodes();
}

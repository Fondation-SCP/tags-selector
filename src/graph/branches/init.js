import { app } from "../../main.js";
import { getAll, getRoots, getUniques, getLinks, getDisjoints, getComments } from "../../database/get.js";
import { getTagName } from "../../database/tools.js";
import { initBranchesRadius, updateBranchesLayout } from "./layout.js";
import { initZonesLayer } from "./zones.js";
import { LoadError } from "../../loading.js";

export const   MISC_TAG = "divers";

const   LABEL_FONT_SIZE = 10;
const   LABEL_FONT_FAMILY = "Helvetica Neue, Helvetica, sans-serif";
const   LABEL_MAX_WIDTH = 80;

let     measureContext = null;

function measureLabel(text)
{
    if (measureContext == null)
    {
        measureContext = document.createElement("canvas").getContext("2d");
        measureContext.font = `${LABEL_FONT_SIZE}px ${LABEL_FONT_FAMILY}`;
    }

    return Math.ceil(measureContext.measureText(text).width);
}

function packLabel(pieces)
{
    const   lines = [];

    let     current = "";

    for (const piece of pieces)
    {
        if (current != "" && measureLabel(current + piece) > LABEL_MAX_WIDTH)
        {
            lines.push(current);
            current = piece;
        }
        else
            current += piece;
    }

    if (current != "")
        lines.push(current);

    return lines;
}

function buildLabel(name)
{
    const   parts = name.match(/[^-]*-|[^-]+/g) ?? [name];
    const   pieces = parts.flatMap(part => measureLabel(part) > LABEL_MAX_WIDTH ? packLabel([...part]) : [part]);
    const   lines = packLabel(pieces);

    return {
        text: lines.join("\n"),
        width: Math.max(0, ...lines.map(line => measureLabel(line))),
        height: lines.length * LABEL_FONT_SIZE
    };
}

const   TRUNK_TONES =
[
    { saturation: 45, lightness: 46 },
    { saturation: 30, lightness: 58 },
    { saturation: 55, lightness: 37 },
    { saturation: 36, lightness: 52 }
];

const   TRUNK_COUNT = 24;
const   TRUNK_HUE_STEP = 137.508;
const   TRUNK_HUE_GAP = 45;

function toHexColor(hue, saturation, lightness)
{
    const   level = lightness / 100;
    const   chroma = (1 - Math.abs(2 * level - 1)) * (saturation / 100);
    const   second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const   base = level - chroma / 2;

    const   sectors =
    [
        [chroma, second, 0],
        [second, chroma, 0],
        [0, chroma, second],
        [0, second, chroma],
        [second, 0, chroma],
        [chroma, 0, second]
    ];

    const   channels = sectors[Math.floor(hue / 60) % 6];

    return `#${channels.map(value => Math.round((value + base) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function buildTrunkPalette()
{
    const   colors = [];
    const   hues = new Map();

    for (let index = 0; index < TRUNK_COUNT; index++)
    {
        const   tone = TRUNK_TONES[index % TRUNK_TONES.length];
        const   hue = (index * TRUNK_HUE_STEP) % 360;
        const   color = toHexColor(hue, tone.saturation, tone.lightness);

        colors.push(color);
        hues.set(color, hue);
    }

    return { colors: colors, hues: hues };
}

const   TRUNK_PALETTE = buildTrunkPalette();

function hashId(id)
{
    let     hash = 0;

    for (let index = 0; index < id.length; index++)
        hash = (hash * 31 + id.charCodeAt(index)) % 100000007;

    return hash;
}

export function getTrunkColor(ownerId, avoided)
{
    const   colors = TRUNK_PALETTE.colors;
    const   start = hashId(ownerId) % colors.length;

    const   hues = avoided.filter(color => TRUNK_PALETTE.hues.has(color)).map(color => TRUNK_PALETTE.hues.get(color));

    if (hues.length == 0)
        return colors[start];

    let     best = colors[start];
    let     bestGap = -1;

    for (let step = 0; step < colors.length; step++)
    {
        const   color = colors[(start + step) % colors.length];
        const   hue = TRUNK_PALETTE.hues.get(color);

        let     gap = 360;

        for (const other of hues)
        {
            const   delta = Math.abs(hue - other);

            gap = Math.min(gap, Math.min(delta, 360 - delta));
        }

        if (gap >= TRUNK_HUE_GAP)
            return color;

        if (gap > bestGap)
        {
            bestGap = gap;
            best = color;
        }
    }

    return best;
}

const   branchesStyle =
[
    {
        selector: "node.tag",
        style:
        {
            shape: "round-rectangle",

            label: "data(wrapped)",
            "font-family": LABEL_FONT_FAMILY,
            "font-size": LABEL_FONT_SIZE,

            "overlay-opacity": 0,

            "text-wrap": "wrap",
            "text-valign": "center",
            "text-halign": "center",

            "background-color": "white",
            color: "black",

            "border-width": 2,
            "border-color": "#555",

            width: "data(width)",
            height: "data(height)",
            padding: 6,

            "text-max-width": `${LABEL_MAX_WIDTH}px`
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
        selector: "node.selected",
        style:
        {
            "background-color": "green",
            color: "white"
        }
    },
    {
        selector: "node.implied",
        style:
        {
            "background-color": "#9fd49f"
        }
    },
    {
        selector: "node.excluded",
        style:
        {
            opacity: 0.75,
            "background-color": "#e53935",
            "border-color": "black",
            color: "white"
        }
    },
    {
        selector: "node.highlighted",
        style:
        {
            "underlay-color": "#ffc400",
            "underlay-opacity": 0.8,
            "underlay-padding": 8,
            "underlay-shape": "round-rectangle"
        }
    },
    {
        selector: "node.conflict",
        style:
        {
            "underlay-color": "#e53935",
            "underlay-opacity": 0.8,
            "underlay-padding": 8,
            "underlay-shape": "round-rectangle"
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
            "line-color": "data(color)"
        }
    },
    {
        selector: "core",
        style: { "active-bg-opacity": 0 }
    }
];

function initBranchesBase()
{
    app.cy = cytoscape({
        container: document.getElementById("cy"),

        autoungrabify: true,
        boxSelectionEnabled: false,
        userZoomingEnabled: false,

        elements: [],

        style: branchesStyle
    });

    initZonesLayer();
}

async function initBranchesData()
{
    const   tags = await getAll();
    const   roots = await getRoots();
    const   uniques = await getUniques();
    const   links = await getLinks();
    const   disjoints = await getDisjoints();
    const   comments = await getComments();

    const   known = new Set(tags.map(element => element.get("element").value));
    const   children = new Map();
    const   parents = new Map();
    const   pairs = new Map();
    const   notes = new Map();
    const   urls = new Map([...known].map(url => [getTagName(url), url]));

    for (const element of comments)
    {
        const   url = element.get("element").value;

        if (!notes.has(url))
            notes.set(url, []);

        notes.get(url).push(element.get("comment").value);
    }

    for (const element of links)
    {
        const   parent = element.get("parent").value;
        const   child = element.get("child").value;

        if (!known.has(parent) || !known.has(child))
            continue;

        if (!children.has(parent))
            children.set(parent, []);

        children.get(parent).push(child);

        if (!parents.has(child))
            parents.set(child, []);

        parents.get(child).push(parent);
    }

    for (const element of disjoints)
    {
        const   first = element.get("first").value;
        const   second = element.get("second").value;

        if (!known.has(first) || !known.has(second))
            continue;

        pairs.set([first, second].sort().join(" "), [first, second]);
    }

    for (const list of children.values())
        list.sort((first, second) => getTagName(first).localeCompare(getTagName(second)));

    const   sortByName = (first, second) => getTagName(first).localeCompare(getTagName(second));
    const   isolated = uniques.map(element => element.get("element").value).sort(sortByName);
    const   list = roots.map(element => element.get("element").value);

    // Les tags sans parent ni sous tag sont regroupés sous un tag racine fictif
    if (isolated.length > 0)
    {
        children.set(MISC_TAG, isolated);
        list.push(MISC_TAG);
    }

    if (list.length == 0)
        throw new LoadError("Hiérarchie invalide", ["Aucun tag racine n'a été trouvé : chaque tag est déclaré sous-tag d'un autre (cycle de ", { italic: "rdfs:subClassOf" }, " ou parent non déclaré comme ", { italic: "owl:Class" }, ")."]);

    app.hierarchy =
    {
        children: children,
        parents: parents,
        roots: list.sort(sortByName),
        tags: [...known],
        urls: urls,
        comments: notes,
        disjoints: [...pairs.values()]
    };
}

export function findTag(name)
{
    return app.hierarchy.urls.get(name);
}

export function getTagPath(url)
{
    const   parents = new Map();
    const   queue = [...app.hierarchy.roots];

    for (const root of queue)
        parents.set(root, null);

    for (let index = 0; index < queue.length && queue[index] != url; index++)
    {
        for (const child of app.hierarchy.children.get(queue[index]) ?? [])
        {
            if (parents.has(child))
                continue;

            parents.set(child, queue[index]);
            queue.push(child);
        }
    }

    if (!parents.has(url))
        return null;

    const   path = [];

    for (let current = url; current != null; current = parents.get(current))
        path.unshift(current);

    return path;
}

export function getUnreachableTags()
{
    const   reached = new Set(app.hierarchy.roots);
    const   queue = [...app.hierarchy.roots];

    for (let index = 0; index < queue.length; index++)
    {
        for (const child of app.hierarchy.children.get(queue[index]) ?? [])
        {
            if (reached.has(child))
                continue;

            reached.add(child);
            queue.push(child);
        }
    }

    return app.hierarchy.tags.filter(url => !reached.has(url)).sort((first, second) => getTagName(first).localeCompare(getTagName(second)));
}

export function isExpandable(url)
{
    return app.hierarchy.children.has(url);
}

export function buildTagNode(id, url, owner, order, depth, position)
{
    const   name = getTagName(url);
    const   label = buildLabel(name);

    return {
        data:
        {
            id: id,
            url: url,
            wrapped: label.text,
            width: label.width,
            height: label.height,
            owner: owner,
            order: order,
            depth: depth
        },

        position: position,

        classes: isExpandable(url) ? "tag expandable" : "tag"
    };
}

function initBranchesNodes()
{
    const   elements = [];

    for (const url of app.hierarchy.roots)
        elements.push(buildTagNode(url, url, null, 0, 0, { x: 0, y: 0 }));

    app.cy.add(elements);

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

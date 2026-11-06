import { app } from "../state.js";
import { getTagName } from "../database/tools.js";
import { fitGraph, initRadius } from "./layout.js";
import { initZonesLayer, invalidateZones } from "./zones.js";
import { getThemeColor } from "./palette.js";
import { isExpandable } from "./hierarchy.js";
import { isDarkTheme } from "../theme.js";

const   LABEL_FONT_SIZE = 10;
const   LABEL_FONT_FAMILY = "Helvetica Neue, Helvetica, sans-serif";
const   LABEL_MAX_WIDTH = 80;

let     measureContext = null;

const   labels = new Map();

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

function getLabel(name)
{
    let     label = labels.get(name);

    if (label == null)
    {
        label = buildLabel(name);
        labels.set(name, label);
    }

    return label;
}

function getLabelHeight()
{
    return app.hierarchy.tags.reduce((height, url) => Math.max(height, getLabel(getTagName(url)).height), 0);
}

const   TAG_COLORS =
{
    light:
    {
        background: "white",
        text: "black",
        border: "#555",
        expandableBorder: "#333",
        implied: "#9fd49f",
        selected: "green",
        selectedText: "white",
        excluded: "#e53935",
        excludedText: "white",
        highlight: "#ffc400",
        conflict: "#e53935",
        excludedBorder: "black"
    },
    dark:
    {
        background: "#262626",
        text: "#ececec",
        border: "#8a8a8a",
        expandableBorder: "#c8c8c8",
        implied: "#2f5d34",
        selected: "green",
        selectedText: "white",
        excluded: "#e53935",
        excludedText: "white",
        highlight: "#ffc400",
        conflict: "#e53935",
        excludedBorder: "#ddd"
    }
};

function getGraphStyle()
{
    const   dark = isDarkTheme();
    const   colors = dark ? TAG_COLORS.dark : TAG_COLORS.light;

    return [
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

                "background-color": colors.background,
                color: colors.text,

                "border-width": 2,
                "border-color": colors.border,

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
                "border-color": colors.expandableBorder
            }
        },
        {
            selector: "node.selected",
            style:
            {
                "background-color": colors.selected,
                color: colors.selectedText
            }
        },
        {
            selector: "node.implied",
            style:
            {
                "background-color": colors.implied
            }
        },
        {
            selector: "node.excluded",
            style:
            {
                opacity: 0.75,
                "background-color": colors.excluded,
                "border-color": colors.excludedBorder,
                color: colors.excludedText
            }
        },
        {
            selector: "node.highlighted, node.conflict",
            style:
            {
                "underlay-opacity": 0.8,
                "underlay-padding": 8,
                "underlay-shape": "round-rectangle"
            }
        },
        {
            selector: "node.highlighted",
            style:
            {
                "underlay-color": colors.highlight
            }
        },
        {
            selector: "node.conflict",
            style:
            {
                "underlay-color": colors.conflict
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
            selector: "edge.trunk, edge.branch",
            style:
            {
                width: "data(width)",
                "line-color": (edge) => getThemeColor(edge.data("color"), dark)
            }
        },
        {
            selector: "core",
            style: { "active-bg-opacity": 0 }
        }
    ];
}

function createGraph()
{
    app.cy = cytoscape({
        container: document.getElementById("cy"),

        autoungrabify: true,
        boxSelectionEnabled: false,
        userZoomingEnabled: false,

        elements: [],

        style: getGraphStyle()
    });

    initZonesLayer();
}

export function updateGraphStyle()
{
    if (app.cy == null)
        return;

    invalidateZones();

    app.cy.style(getGraphStyle());
}

export function buildTagNode(id, url, depth, position)
{
    const   label = getLabel(getTagName(url));

    return {
        data:
        {
            id: id,
            url: url,
            wrapped: label.text,
            width: label.width,
            height: label.height,
            depth: depth
        },

        position: position,

        classes: isExpandable(url) ? "tag expandable" : "tag"
    };
}

function initNodes()
{
    const   elements = [];

    for (const url of app.hierarchy.roots)
        elements.push(buildTagNode(url, url, 0, { x: 0, y: 0 }));

    app.cy.add(elements);

    initRadius(getLabelHeight());
    fitGraph();
}

export function initGraph()
{
    createGraph();

    initNodes();
}

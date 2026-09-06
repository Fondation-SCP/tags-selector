export const baseStyle =
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
];

import { app } from "../state.js";
import { getOntology } from "../database/get.js";
import { compareTags, getTagName } from "../database/tools.js";
import { LoadError } from "../errors.js";

export const   MISC_TAG = "divers";

function addEntry(map, key, value)
{
    if (!map.has(key))
        map.set(key, []);

    map.get(key).push(value);
}

function getValue(row, name)
{
    return row.get(name)?.value;
}

function readOntology(rows)
{
    const   ontology = { known: new Set(), comments: new Map(), links: [], disjoints: [] };

    for (const row of rows)
    {
        const   element = getValue(row, "element");

        if (element != null)
        {
            const   comment = getValue(row, "comment");

            ontology.known.add(element);

            if (comment != null)
                addEntry(ontology.comments, element, comment);
        }
        else if (getValue(row, "child") != null)
            ontology.links.push([getValue(row, "parent"), getValue(row, "child")]);
        else
            ontology.disjoints.push([getValue(row, "first"), getValue(row, "second")]);
    }

    return ontology;
}

function buildTree(roots, children)
{
    const   tree = new Map(roots.map(root => [root, null]));
    const   queue = [...roots];

    for (let index = 0; index < queue.length; index++)
    {
        for (const child of children.get(queue[index]) ?? [])
        {
            if (tree.has(child))
                continue;

            tree.set(child, queue[index]);
            queue.push(child);
        }
    }

    return tree;
}

export async function buildHierarchy(rdf)
{
    let     ontology;

    try
    {
        ontology = readOntology(await getOntology(rdf));
    }
    catch (error)
    {
        throw new LoadError("RDF invalide", ["Le fichier de l'ontologie est un XML valide, mais pas un RDF/XML correct :\n\n", { italic: error.message }], error);
    }

    const   known = ontology.known;

    if (known.size == 0)
        throw new LoadError("Ontologie vide", ["Aucun tag n'a été trouvé : l'ontologie ne déclare aucune classe ", { italic: "owl:Class" }, "."]);

    const   children = new Map();
    const   parents = new Map();
    const   pairs = new Map();
    const   withParent = new Set();
    const   withChild = new Set();
    const   urls = new Map([...known].map(url => [getTagName(url), url]));

    for (const [parent, child] of ontology.links)
    {
        withParent.add(child);
        withChild.add(parent);

        if (!known.has(parent) || !known.has(child))
            continue;

        addEntry(children, parent, child);
        addEntry(parents, child, parent);
    }

    for (const [first, second] of ontology.disjoints)
    {
        if (!known.has(first) || !known.has(second))
            continue;

        pairs.set([first, second].sort().join(" "), [first, second]);
    }

    for (const list of children.values())
        list.sort(compareTags);

    const   isolated = [...known].filter(url => !withParent.has(url) && !withChild.has(url)).sort(compareTags);
    const   list = [...known].filter(url => !withParent.has(url) && withChild.has(url));

    // Les tags sans parent ni sous tag sont regroupés sous un tag racine fictif
    if (isolated.length > 0)
    {
        children.set(MISC_TAG, isolated);
        list.push(MISC_TAG);
    }

    if (list.length == 0)
        throw new LoadError("Hiérarchie invalide", ["Aucun tag racine n'a été trouvé : chaque tag est déclaré sous-tag d'un autre (cycle de ", { italic: "rdfs:subClassOf" }, " ou parent non déclaré comme ", { italic: "owl:Class" }, ")."]);

    const   roots = list.sort(compareTags);

    return {
        children: children,
        parents: parents,
        roots: roots,
        tree: buildTree(roots, children),
        tags: [...known],
        urls: urls,
        comments: ontology.comments,
        disjoints: [...pairs.values()],
        ancestors: new Map(),
        parentsTexts: new Map()
    };
}

export function findTag(name)
{
    return app.hierarchy.urls.get(name);
}

export function isExpandable(url)
{
    return app.hierarchy.children.has(url);
}

export function getTagPath(url)
{
    const   tree = app.hierarchy.tree;

    if (!tree.has(url))
        return null;

    const   path = [];

    for (let current = url; current != null; current = tree.get(current))
        path.unshift(current);

    return path;
}

export function getUnreachableTags()
{
    return app.hierarchy.tags.filter(url => !app.hierarchy.tree.has(url)).sort(compareTags);
}

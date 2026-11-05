import { app } from "../main.js";
import { LoadError } from "../loading.js";

const   RDF_TIMEOUT = 30000;
const   RDF_NAMESPACE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

export function getTagName(url)
{
    return url.split("#").pop();
}

// Affiche une liste de tags passée en paramètre
export function printList(tags)
{
    for (const element of tags)
    {
        const   url = element.get("element").value;
        const   name = getTagName(url);

        console.log("> '" + name + "'");
    }

    console.log("Total: " + tags.length);
}

async function downloadRdf()
{
    try
    {
        const   response = await fetch(app.rdfUrl, { signal: AbortSignal.timeout(RDF_TIMEOUT) });

        return { response: response, text: await response.text() };
    }
    catch (error)
    {
        if (error.name == "TimeoutError")
            throw new LoadError("Délai dépassé", ["Le serveur de l'ontologie n'a pas répondu en ", { italic: `${RDF_TIMEOUT / 1000} secondes` }, ".\n\nIl est peut-être surchargé ou hors service : rechargez la page plus tard."], error);

        throw new LoadError("Serveur injoignable", ["Le fichier de l'ontologie n'a pas pu être téléchargé : le serveur est injoignable ou la connexion a été coupée.\n\nVérifiez votre connexion internet puis rechargez la page."], error);
    }
}

function checkResponse(response, text)
{
    if (response.status == 404)
        throw new LoadError("Ontologie introuvable", ["Le fichier de l'ontologie n'existe pas à l'adresse indiquée (erreur ", { italic: "404" }, ")."]);

    if (!response.ok)
        throw new LoadError("Erreur du serveur", ["Le serveur a répondu par une erreur ", { italic: `${response.status}` }, " au lieu de fournir l'ontologie.\n\nRechargez la page pour réessayer."]);

    if (response.headers.get("Content-Type")?.includes("text/html"))
        throw new LoadError("Format inattendu", ["Le serveur a renvoyé une page web au lieu du fichier de l'ontologie."]);

    if (text.trim() == "")
        throw new LoadError("Ontologie vide", ["Le fichier de l'ontologie téléchargé est vide."]);

    if (text.includes("\uFFFD"))
        throw new LoadError("Encodage invalide", ["Le fichier de l'ontologie n'est pas encodé en ", { italic: "UTF-8" }, " : le nom de certains tags serait illisible."]);
}

function checkXml(text)
{
    const   xml = new DOMParser().parseFromString(text, "application/xml");
    const   error = xml.getElementsByTagNameNS("*", "parsererror")[0];

    if (error != null)
    {
        const   line = error.textContent.match(/(?:line|ligne)\D{0,10}(\d+)/i);
        const   message = ["Le fichier de l'ontologie est mal formé ou incomplet"];

        if (line != null)
            message.push(" (erreur à la ligne ", { italic: line[1] }, ")");

        message.push(" : il ne peut pas être lu comme un document XML.");

        throw new LoadError("XML mal formé", message);
    }

    const   root = xml.documentElement;

    if (root.namespaceURI != RDF_NAMESPACE || root.localName != "RDF")
        throw new LoadError("Format inattendu", ["Le fichier téléchargé n'est pas une ontologie ", { italic: "RDF/XML" }, " : sa racine est ", { italic: `<${root.tagName}>` }, " au lieu de ", { italic: "<rdf:RDF>" }, "."]);
}

// Téléchargement du .rdf
// Dissociée de main() pour permettre des appels pendant l'exécution
export async function loadRdf()
{
    const   { response, text } = await downloadRdf();

    checkResponse(response, text);
    checkXml(text);

    app.rdf = text;
}

// Lance une requête SPARQL au .rdf stocké en mémoire
export async function get(query)
{
    return await app.engine.queryBindings(
        query,
        {
            sources:
            [{
                type: "serialized",
                value: app.rdf,
                mediaType: "application/rdf+xml"
            }]
        }
    );
}

import { app, checkOntology, warnUnreachable } from "../main.js";
import { checkRdf } from "./tools.js";
import { reloadView } from "../views/tools.js";
import { failLoading, hideLoading, showLoadError, showLoading } from "../loading.js";

export function showOntologySource(text)
{
    const   label = document.getElementById("ontology-source");

    label.textContent = text;
    label.classList.remove("hidden");
}

async function loadLocalRdf(file)
{
    const   previous = app.rdf;

    showLoading();

    try
    {
        const   text = await file.text();

        checkRdf(text);

        app.rdf = text;

        await checkOntology();
    }
    catch (error)
    {
        app.rdf = previous;
        hideLoading();
        showLoadError(error);
        return;
    }

    try
    {
        await reloadView();
    }
    catch (error)
    {
        app.rdf = previous;

        await reloadView().catch(failLoading);

        showLoadError(error);
        return;
    }

    showOntologySource(`Ontologie locale : ${file.name}`);

    warnUnreachable();
}

export function initLocalRdf()
{
    const   input = document.getElementById("rdf-input");

    document.getElementById("rdf-open").addEventListener("click", () => input.click());

    input.addEventListener("change", () =>
    {
        const   file = input.files[0];

        input.value = "";

        if (file != null)
            loadLocalRdf(file);
    });
}

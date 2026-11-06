import { app } from "../state.js";
import { checkRdf } from "./tools.js";
import { loadView } from "../view.js";
import { failLoading, hideLoading, showLoadError, showLoading } from "../loading.js";

let     loading = false;

export function showOntologySource(text)
{
    const   label = document.getElementById("ontology-source");

    label.textContent = text;
    label.title = text;
    label.classList.remove("hidden");
}

async function loadLocalRdf(file)
{
    if (loading)
        return;

    loading = true;

    const   trigger = document.activeElement;

    showLoading();

    try
    {
        const   text = await file.text();

        checkRdf(text);

        await loadView(text);

        showOntologySource(`Ontologie locale : ${file.name}`);

        hideLoading();

        trigger?.focus();
    }
    catch (error)
    {
        if (app.cy == null)
            failLoading(error);
        else
        {
            hideLoading();

            trigger?.focus();

            showLoadError(error);
        }
    }
    finally
    {
        loading = false;
    }
}

export function initLocalRdf()
{
    const   input = document.getElementById("rdf-input");

    document.getElementById("rdf-open").addEventListener("click", () => input.click());
    document.getElementById("loading-local").addEventListener("click", () => input.click());

    input.addEventListener("change", () =>
    {
        const   file = input.files[0];

        input.value = "";

        if (file != null)
            loadLocalRdf(file);
    });
}

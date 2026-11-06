import { showConfirm } from "./popup.js";

function confirmRefresh()
{
    showConfirm("Rafraîchir la page", ["La page va être rechargée et ", { italic: "tout sera perdu" }, " : tags sélectionnés, historique d'annulation, branches déployées et ontologie éventuellement chargée depuis un fichier."], "Rafraîchir", () => location.reload());
}

export function initRefresh()
{
    document.getElementById("refresh").addEventListener("click", confirmRefresh);
}

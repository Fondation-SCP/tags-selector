const   THEME_KEY = "tags-selector-theme";
const   DARK_QUERY = "(prefers-color-scheme: dark)";

let     onThemeChange = null;

export function isDarkTheme()
{
    return document.documentElement.dataset.theme == "dark";
}

function loadTheme()
{
    try
    {
        return localStorage.getItem(THEME_KEY);
    }
    catch
    {
        return null;
    }
}

function saveTheme(theme)
{
    try
    {
        localStorage.setItem(THEME_KEY, theme);
    }
    catch
    {
    }
}

function updateThemeButton()
{
    const   button = document.getElementById("theme-toggle");
    const   dark = isDarkTheme();

    button.textContent = dark ? "☀\uFE0E" : "☾";
    button.title = dark ? "Passer en mode clair" : "Passer en mode sombre";
    button.setAttribute("aria-label", button.title);
}

function applyTheme(theme)
{
    document.documentElement.dataset.theme = theme;

    updateThemeButton();
    onThemeChange();
}

function toggleTheme()
{
    const   theme = isDarkTheme() ? "light" : "dark";

    saveTheme(theme);
    applyTheme(theme);
}

export function initTheme(onChange)
{
    onThemeChange = onChange;

    updateThemeButton();

    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

    matchMedia(DARK_QUERY).addEventListener("change", (event) =>
    {
        if (loadTheme() == null)
            applyTheme(event.matches ? "dark" : "light");
    });
}

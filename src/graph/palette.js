import { isDarkTheme } from "../theme.js";

const   TRUNK_TONES =
[
    { saturation: 45, lightness: 46, darkLightness: 64 },
    { saturation: 30, lightness: 58, darkLightness: 74 },
    { saturation: 55, lightness: 37, darkLightness: 58 },
    { saturation: 36, lightness: 52, darkLightness: 69 }
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
    const   darks = new Map();

    for (let index = 0; index < TRUNK_COUNT; index++)
    {
        const   tone = TRUNK_TONES[index % TRUNK_TONES.length];
        const   hue = (index * TRUNK_HUE_STEP) % 360;
        const   color = toHexColor(hue, tone.saturation, tone.lightness);

        colors.push(color);
        hues.set(color, hue);
        darks.set(color, toHexColor(hue, tone.saturation, tone.darkLightness));
    }

    return { colors: colors, hues: hues, darks: darks };
}

const   TRUNK_PALETTE = buildTrunkPalette();

export function getThemeColor(color, dark = isDarkTheme())
{
    if (!dark)
        return color;

    return TRUNK_PALETTE.darks.get(color) ?? color;
}

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

import { app } from "../state.js";
import { clampPan } from "./layout.js";

const   ZOOM_STEP = 1.15;
const   WHEEL_LINE = 40;
const   WHEEL_LIMIT = 120;

function getWheelSteps(event)
{
    let     delta = event.deltaY;

    if (event.deltaMode == 1)
        delta *= WHEEL_LINE;
    else if (event.deltaMode == 2)
        delta *= app.cy.height();

    return Math.max(-WHEEL_LIMIT, Math.min(WHEEL_LIMIT, delta)) / 100;
}

export function registerViewport()
{
    const   container = app.cy.container();

    const   onWheel = (event) =>
    {
        event.preventDefault();

        const   steps = getWheelSteps(event);

        if (steps == 0)
            return;

        const   box = container.getBoundingClientRect();

        app.cy.zoom({
            level: app.cy.zoom() * Math.pow(ZOOM_STEP, -steps),
            renderedPosition: { x: event.clientX - box.left, y: event.clientY - box.top }
        });
    };

    container.addEventListener("wheel", onWheel, { passive: false });

    app.cy.on("destroy", () => container.removeEventListener("wheel", onWheel));
    app.cy.on("viewport", clampPan);
}

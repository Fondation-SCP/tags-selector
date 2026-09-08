import { app } from "../../main.js";

const   NODE_SIZE = 40;

const   CHIP_HALF_WIDTH = 50;
const   CHIP_HALF_HEIGHT = 26;
const   CHIP_GAP = 12;

const   TRUNK_START = 60;
const   TRUNK_CLEARANCE = 30;

const   BRANCH_SLOPE = 0.75;
const   BRANCH_CLEARANCE = 35;
const   BRANCH_LANES = 2;

const   EDGE_WIDTH = 5.5;
const   EDGE_TAPER = 1.2;
const   EDGE_MIN_WIDTH = 1.6;

const   CENTER_STEP = 115;
const   CIRCLE_GAP = 90;
const   ROOT_GAP = 100;
const   PROFILE_BUCKET = 100;

const   POSITION_EPSILON = 0.5;

const   PAN_MARGIN = 120;
const   ZOOM_MAX = 3;
const   ZOOM_OUT_LIMIT = 0.5;

const   FORK_MIN = 20;
const   FORK_SIZE = 30;
const   FORK_TRUNK_START = 15;

export function getEdgeWidth(depth)
{
    return Math.max(EDGE_MIN_WIDTH, EDGE_WIDTH - depth * EDGE_TAPER);
}

export function getChildNodes(node)
{
    const   ids = node.data("childIds");

    if (ids == null)
        return [];

    return ids.map(id => app.cy.getElementById(id));
}

export function getJointId(ownerId, index)
{
    return `${ownerId}|joint|${index}`;
}

function packRun(items)
{
    if (items.length <= FORK_MIN)
        return items;

    const   count = Math.max(2, Math.round(items.length / FORK_SIZE));
    const   size = Math.ceil(items.length / count);
    const   groups = [];

    for (let index = 0; index < items.length; index += size)
        groups.push({ group: items.slice(index, index + size) });

    return groups.length > FORK_MIN ? packRun(groups) : groups;
}

export function buildBranches(urls)
{
    const   items = [];

    let     run = [];

    const   flush = () =>
    {
        if (run.length > 0)
            items.push(...packRun(run));

        run = [];
    };

    for (const url of urls)
    {
        if (app.hierarchy.children.has(url))
        {
            flush();
            items.push({ url: url });
        }
        else
            run.push({ url: url });
    }

    flush();

    return items;
}

const   graphAccess =
{
    children: node => getChildNodes(node),
    fork: node => node.hasClass("fork")
};

const   plainAccess =
{
    children: node => node.children,
    fork: node => node.fork
};

function buildVirtual(url, path)
{
    const   urls = app.hierarchy.children.get(url);

    if (urls == null || path.has(url))
        return { fork: false, children: [] };

    path.add(url);

    const   node = { fork: false, children: buildBranches(urls).map(item => toVirtual(item, path)) };

    path.delete(url);

    return node;
}

function toVirtual(item, path)
{
    if (item.group != null)
        return { fork: true, children: item.group.map(inner => toVirtual(inner, path)) };

    return buildVirtual(item.url, path);
}

export function getDirection(index, count)
{
    const   angle = (2 * Math.PI * index) / count - Math.PI / 2;

    return { x: Math.cos(angle), y: Math.sin(angle) };
}

function getMetrics(direction)
{
    const   along = CHIP_HALF_WIDTH * Math.abs(direction.x) + CHIP_HALF_HEIGHT * Math.abs(direction.y);
    const   across = CHIP_HALF_WIDTH * Math.abs(direction.y) + CHIP_HALF_HEIGHT * Math.abs(direction.x);
    const   step = 2 * along + CHIP_GAP;

    return {
        along: along,
        across: across,
        step: step,
        lane: 2 * across + CHIP_GAP,
        length: across + TRUNK_CLEARANCE,
        stagger: step / (2 * BRANCH_LANES)
    };
}

function buildLanes(trunkStart, metrics)
{
    const   lanes = [];

    for (let index = 0; index < BRANCH_LANES; index++)
        for (const side of [-1, 1])
            lanes.push({ side: side, offset: metrics.length + index * metrics.lane, axis: trunkStart });

    return lanes;
}

function getSideAxis(lanes, side)
{
    return Math.max(...lanes.filter(lane => lane.side == side).map(lane => lane.axis));
}

function measure(node, access, metrics)
{
    const   children = access.children(node);
    const   fork = access.fork(node);
    const   halfWidth = fork ? 0 : metrics.across;
    const   trunkStart = fork ? FORK_TRUNK_START : TRUNK_START;
    const   geometry = { height: 0, halfWidth: halfWidth, left: halfWidth, right: halfWidth, branches: [] };

    if (children.length == 0)
        return geometry;

    const   lanes = buildLanes(trunkStart, metrics);
    const   blocked = [trunkStart, trunkStart];

    let     axis = trunkStart;

    children.forEach((child) =>
    {
        const   sub = measure(child, access, metrics);
        const   leaf = sub.branches.length == 0;

        let     side = 0;
        let     offset = 0;
        let     start = 0;

        if (leaf)
        {
            const   lane = lanes.reduce((best, entry) => entry.axis < best.axis ? entry : best);

            side = lane.side;
            offset = lane.offset;
            start = Math.max(lane.axis, axis);

            lane.axis = start + metrics.step;
        }
        else
        {
            const   left = getSideAxis(lanes, -1);
            const   right = getSideAxis(lanes, 1);

            side = left <= right ? -1 : 1;
            offset = Math.max(metrics.length, (side < 0 ? sub.right : sub.left) + BRANCH_CLEARANCE);
            start = Math.max(axis, side < 0 ? left : right, blocked[side < 0 ? 0 : 1] + metrics.step - offset * BRANCH_SLOPE);
        }

        const   slot = side < 0 ? 0 : 1;
        const   rise = offset * BRANCH_SLOPE;
        const   outer = side < 0 ? sub.left : sub.right;

        if (leaf)
            blocked[slot] = Math.max(blocked[slot], start + rise + metrics.along);
        else
        {
            const   inner = side < 0 ? sub.right : sub.left;
            const   clearance = BRANCH_SLOPE * Math.max(offset - metrics.length, inner) + sub.height + metrics.along + metrics.step;
            const   next = start + Math.max(metrics.step, clearance);

            lanes.forEach(lane => { if (lane.side == side) lane.axis = next; });

            blocked[slot] = start + rise + sub.height + metrics.along;
        }

        geometry.branches.push({ node: child, geometry: sub, joint: start, x: side * offset, y: start + rise });

        if (side < 0)
            geometry.left = Math.max(geometry.left, offset + outer);
        else
            geometry.right = Math.max(geometry.right, offset + outer);

        geometry.height = Math.max(geometry.height, start + rise + sub.height);

        axis = start + metrics.stagger;
    });

    return geometry;
}

function apply(node, geometry, origin, direction, targets)
{
    const   normal = { x: -direction.y, y: direction.x };

    const   locate = (x, y) => ({
        x: origin.x + y * direction.x + x * normal.x,
        y: origin.y + y * direction.y + x * normal.y
    });

    geometry.branches.forEach((branch, index) =>
    {
        const   position = locate(branch.x, branch.y);

        targets.set(getJointId(node.id(), index), locate(0, branch.joint));
        targets.set(branch.node.id(), position);

        apply(branch.node, branch.geometry, position, direction, targets);
    });
}

function addProfile(profile, y, side, width)
{
    const   bucket = Math.floor(y / PROFILE_BUCKET);
    const   entry = profile.has(bucket) ? profile.get(bucket) : { left: 0, right: 0 };

    if (side < 0)
        entry.left = Math.max(entry.left, width);
    else
        entry.right = Math.max(entry.right, width);

    profile.set(bucket, entry);
}

function collectProfile(geometry, baseY, baseOffset, profile)
{
    for (const branch of geometry.branches)
    {
        const   offset = baseOffset + branch.x;

        addProfile(profile, baseY + branch.y, offset, Math.abs(offset) + branch.geometry.halfWidth);

        collectProfile(branch.geometry, baseY + branch.y, offset, profile);
    }
}

function getProfile(geometry)
{
    const   profile = new Map();

    addProfile(profile, 0, -1, geometry.halfWidth);
    addProfile(profile, 0, 1, geometry.halfWidth);

    collectProfile(geometry, 0, 0, profile);

    return profile;
}

function getRadius(geometries, centerRadius)
{
    const   count = geometries.length;

    let     radius = centerRadius + CIRCLE_GAP;

    if (count < 2)
        return radius;

    const   profiles = geometries.map(geometry => getProfile(geometry));
    const   spread = 2 * Math.sin(Math.PI / count);

    profiles.forEach((profile, index) =>
    {
        const   next = profiles[(index + 1) % count];
        const   buckets = new Set([...profile.keys(), ...next.keys()]);

        for (const bucket of buckets)
        {
            const   right = profile.has(bucket) ? profile.get(bucket).right : 0;
            const   left = next.has(bucket) ? next.get(bucket).left : 0;
            const   needed = (right + left + CIRCLE_GAP) / spread - bucket * PROFILE_BUCKET;

            radius = Math.max(radius, needed);
        }
    });

    return radius;
}

function getCircleRadius(count, step)
{
    if (count <= 1)
        return 0;

    return Math.max(NODE_SIZE, (count * step) / (2 * Math.PI));
}

function commit(targets, animation)
{
    if (animation == null)
    {
        app.cy.batch(() => targets.forEach((position, id) => app.cy.getElementById(id).position(position)));

        return;
    }

    targets.forEach((position, id) =>
    {
        const   element = app.cy.getElementById(id);

        if (element.length == 0)
            return;

        const   current = element.position();

        if (!element.animated()
            && Math.abs(current.x - position.x) < POSITION_EPSILON
            && Math.abs(current.y - position.y) < POSITION_EPSILON)
            return;

        const   delay = animation.delays.has(id) ? animation.delays.get(id) : 0;

        element.stop(true);
        element.delay(delay).animate({ position: position }, { duration: animation.duration, easing: "ease-out" });
    });
}

export function initBranchesRadius()
{
    const   count = app.hierarchy.roots.length;
    const   geometries = app.hierarchy.roots.map((url, index) =>
        measure(buildVirtual(url, new Set()), plainAccess, getMetrics(getDirection(index, count))));

    app.hierarchy.centerRadius = getCircleRadius(app.hierarchy.isolated.length, CENTER_STEP);
    app.hierarchy.radius = getRadius(geometries, app.hierarchy.centerRadius);
}

function updateBounds(targets)
{
    let     x1 = Infinity;
    let     y1 = Infinity;
    let     x2 = -Infinity;
    let     y2 = -Infinity;

    targets.forEach((position) =>
    {
        x1 = Math.min(x1, position.x);
        y1 = Math.min(y1, position.y);
        x2 = Math.max(x2, position.x);
        y2 = Math.max(y2, position.y);
    });

    app.hierarchy.bounds =
    {
        x1: x1 - CHIP_HALF_WIDTH,
        y1: y1 - CHIP_HALF_HEIGHT,
        x2: x2 + CHIP_HALF_WIDTH,
        y2: y2 + CHIP_HALF_HEIGHT
    };

    const   bounds = app.hierarchy.bounds;
    const   fit = Math.min(app.cy.width() / (bounds.x2 - bounds.x1), app.cy.height() / (bounds.y2 - bounds.y1));

    app.cy.maxZoom(ZOOM_MAX);
    app.cy.minZoom(Math.min(fit / 2, ZOOM_OUT_LIMIT));
}

export function limitPan(pan)
{
    const   bounds = app.hierarchy == null ? null : app.hierarchy.bounds;

    if (bounds == null)
        return pan;

    const   zoom = app.cy.zoom();

    return {
        x: Math.min(Math.max(pan.x, PAN_MARGIN - bounds.x2 * zoom), app.cy.width() - PAN_MARGIN - bounds.x1 * zoom),
        y: Math.min(Math.max(pan.y, PAN_MARGIN - bounds.y2 * zoom), app.cy.height() - PAN_MARGIN - bounds.y1 * zoom)
    };
}

export function clampPan()
{
    const   pan = app.cy.pan();
    const   limited = limitPan(pan);

    if (limited.x != pan.x || limited.y != pan.y)
        app.cy.pan(limited);
}

export function updateBranchesLayout(animation)
{
    const   roots = app.hierarchy.roots.map(id => app.cy.getElementById(id));
    const   isolated = app.hierarchy.isolated.map(id => app.cy.getElementById(id));

    const   directions = roots.map((node, index) => getDirection(index, roots.length));
    const   geometries = roots.map((node, index) => measure(node, graphAccess, getMetrics(directions[index])));

    const   centerRadius = app.hierarchy.centerRadius;
    const   radius = app.hierarchy.radius;
    const   rootRadius = Math.min(radius, centerRadius + ROOT_GAP);

    const   targets = new Map();

    isolated.forEach((node, index) =>
    {
        const   angle = (2 * Math.PI * index) / isolated.length - Math.PI / 2;

        targets.set(node.id(), { x: centerRadius * Math.cos(angle), y: centerRadius * Math.sin(angle) });
    });

    roots.forEach((node, index) =>
    {
        const   direction = directions[index];
        const   origin = { x: radius * direction.x, y: radius * direction.y };

        targets.set(node.id(), { x: rootRadius * direction.x, y: rootRadius * direction.y });

        apply(node, geometries[index], origin, direction, targets);
    });

    updateBounds(targets);
    commit(targets, animation);

    return targets;
}

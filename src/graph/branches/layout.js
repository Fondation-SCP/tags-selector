import { app } from "../../main.js";

const   NODE_SIZE = 40;
const   LEAF_HALF_WIDTH = 45;

const   TRUNK_START = 60;

const   BRANCH_LENGTH = 80;
const   BRANCH_SLOPE = 0.75;
const   BRANCH_STEP = 62;
const   BRANCH_STAGGER = 31;
const   BRANCH_CLEARANCE = 35;

const   EDGE_WIDTH = 7;
const   EDGE_TAPER = 1.5;
const   EDGE_MIN_WIDTH = 2;

const   SUBTREE_GAP = 35;

const   CENTER_STEP = 95;
const   CIRCLE_GAP = 90;
const   ROOT_GAP = 100;
const   PROFILE_BUCKET = 100;

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

function measure(node, access)
{
    const   children = access.children(node);
    const   fork = access.fork(node);
    const   halfWidth = fork ? 0 : LEAF_HALF_WIDTH;
    const   trunkStart = fork ? FORK_TRUNK_START : TRUNK_START;
    const   geometry = { height: 0, halfWidth: halfWidth, left: halfWidth, right: halfWidth, branches: [] };

    if (children.length == 0)
        return geometry;

    let     leftAxis = trunkStart;
    let     rightAxis = trunkStart;
    let     axis = trunkStart;

    children.forEach((child) =>
    {
        const   side = leftAxis <= rightAxis ? -1 : 1;
        const   start = Math.max(side < 0 ? leftAxis : rightAxis, axis);

        const   sub = measure(child, access);

        const   inner = side < 0 ? sub.right : sub.left;
        const   outer = side < 0 ? sub.left : sub.right;
        const   offset = Math.max(BRANCH_LENGTH, inner + BRANCH_CLEARANCE);
        const   rise = offset * BRANCH_SLOPE;

        const   clearance = BRANCH_SLOPE * Math.max(offset - BRANCH_LENGTH, inner) + sub.height + SUBTREE_GAP;
        const   next = start + Math.max(BRANCH_STEP, clearance);

        geometry.branches.push({ node: child, geometry: sub, joint: start, x: side * offset, y: start + rise });

        if (side < 0)
        {
            leftAxis = next;
            geometry.left = Math.max(geometry.left, offset + outer);
        }
        else
        {
            rightAxis = next;
            geometry.right = Math.max(geometry.right, offset + outer);
        }

        geometry.height = Math.max(geometry.height, start + rise + sub.height);

        axis = start + BRANCH_STAGGER;
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
        const   delay = animation.delays.has(id) ? animation.delays.get(id) : 0;

        element.stop(true);
        element.delay(delay).animate({ position: position }, { duration: animation.duration, easing: "ease-out" });
    });
}

export function initBranchesRadius()
{
    const   geometries = app.hierarchy.roots.map(url => measure(buildVirtual(url, new Set()), plainAccess));

    app.hierarchy.centerRadius = getCircleRadius(app.hierarchy.isolated.length, CENTER_STEP);
    app.hierarchy.radius = getRadius(geometries, app.hierarchy.centerRadius);
}

export function updateBranchesLayout(animation)
{
    const   roots = app.hierarchy.roots.map(id => app.cy.getElementById(id));
    const   isolated = app.hierarchy.isolated.map(id => app.cy.getElementById(id));

    const   geometries = roots.map(node => measure(node, graphAccess));

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
        const   angle = (2 * Math.PI * index) / roots.length - Math.PI / 2;
        const   direction = { x: Math.cos(angle), y: Math.sin(angle) };
        const   origin = { x: radius * direction.x, y: radius * direction.y };

        targets.set(node.id(), { x: rootRadius * direction.x, y: rootRadius * direction.y });

        apply(node, geometries[index], origin, direction, targets);
    });

    commit(targets, animation);

    return targets;
}

import { world, system, ItemStack } from "@minecraft/server";

// Configuration constants
const SCAN_INTERVAL = 20; // ticks (1 second)
const PLANT_SCAN_RADIUS = 8; // Reduced from 10
const HOPPER_SCAN_RADIUS = 3; // Reduced from 5
const PISTON_SCAN_RADIUS = 5; // New: Scan for pistons
const PLAYERS_PER_TICK = 2; // Process 2 players per tick to spread load

/**
 * 1) GHOST-STACK DETECTION (unchanged, runs rarely)
 */
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    // CHECK CONFIG TOGGLE
    const antiDupeEnabled = world.getDynamicProperty("anti_dupe");
    if (antiDupeEnabled === false) return;

    if (!initialSpawn || !player) return;

    try {
        const cursor = player.getComponent("cursor_inventory");
        const held = cursor.item;
        const inv = player.getComponent("inventory").container;
        const empty = inv.emptySlotsCount;

        if (held && held.amount === held.maxAmount && empty === 0) {
            // announce
            world
                .getDimension("overworld")
                .runCommand(
                    `tellraw @a {"rawtext":[{"text":"§c<Anti-Dupe> §f§l${player.nameTag} §ctried to dupe with §f${held.typeId}§c!"}]}`
                );
            // spawn one so client doesn't vanish it
            player.dimension.spawnItem(
                new ItemStack(held.typeId, 1),
                player.location
            );
            // clear the ghost
            cursor.clear();
        }
    } catch (e) {
        console.warn("Ghost-stack detection error:", e);
    }
});

/**
 * 2) PLANT-DUPE CUTTER
 */
const TWO_HIGH = new Set([
    "minecraft:tall_grass",
    "minecraft:tall_dry_grass",
    "minecraft:large_fern",
    "minecraft:sunflower",
    "minecraft:rose_bush",
    "minecraft:peony",
    "minecraft:lilac",
    "minecraft:cornflower",
    "minecraft:tall_seagrass",
    "minecraft:torchflower_crop",
    "minecraft:torchflower",
]);

const OFFSETS = [
    { x: 1, z: 0 }, { x: -1, z: 0 },
    { x: 0, z: 1 }, { x: 0, z: -1 }
];

function purgePistons(player, dim, plantBlock) {
    try {
        const px = Math.floor(plantBlock.location.x);
        const py = Math.floor(plantBlock.location.y);
        const pz = Math.floor(plantBlock.location.z);

        for (const o of OFFSETS) {
            for (const d of [1, 2]) {
                const bx = px + o.x * d;
                const by = py;
                const bz = pz + o.z * d;
                const nb = dim.getBlock({ x: bx, y: by, z: bz });
                if (!nb) continue;
                const t = nb.typeId;
                if (t === "minecraft:piston" || t === "minecraft:sticky_piston") {
                    nb.setType("minecraft:air");
                    world
                        .getDimension("overworld")
                        .runCommand(
                            `tellraw @a {"rawtext":[{"text":"§c<Anti-Dupe> §f§l${player.nameTag} §r§ctried to dupe with §f${plantBlock.typeId}§c! Piston removed."}]}`
                        );
                    return; // Only need to find one piston to break the dupe
                }
            }
        }
    } catch (e) {
        console.warn("Piston purge error:", e);
    }
}

const BUNDLE_TYPES = new Set([
    "minecraft:bundle",
]);

function detectPistonHopperDupe(player, dim, baseX, baseY, baseZ) {
    try {
        const pistons = [];
        const hoppers = [];

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -PISTON_SCAN_RADIUS; dx <= PISTON_SCAN_RADIUS; dx++) {
                for (let dz = -PISTON_SCAN_RADIUS; dz <= PISTON_SCAN_RADIUS; dz++) {
                    const pos = { x: baseX + dx, y: baseY + dy, z: baseZ + dz };
                    const block = dim.getBlock(pos);
                    if (!block) continue;

                    const blockType = block.typeId;
                    if (blockType === "minecraft:piston" || blockType === "minecraft:sticky_piston") {
                        pistons.push({ block, pos });
                    } else if (blockType === "minecraft:hopper") {
                        hoppers.push({ block, pos });
                    }
                }
            }
        }

        if (pistons.length >= 2 && hoppers.length >= 2) {
            for (let i = 0; i < pistons.length; i++) {
                for (let j = i + 1; j < pistons.length; j++) {
                    const piston1 = pistons[i];
                    const piston2 = pistons[j];

                    const distance = Math.abs(piston1.pos.x - piston2.pos.x) +
                        Math.abs(piston1.pos.z - piston2.pos.z);

                    if (distance >= 2 && distance <= 4) {
                        const hoppersNearPiston1 = hoppers.filter(h =>
                            Math.abs(h.pos.x - piston1.pos.x) <= 2 &&
                            Math.abs(h.pos.z - piston1.pos.z) <= 2
                        );

                        const hoppersNearPiston2 = hoppers.filter(h =>
                            Math.abs(h.pos.x - piston2.pos.x) <= 2 &&
                            Math.abs(h.pos.z - piston2.pos.z) <= 2
                        );

                        if (hoppersNearPiston1.length > 0 && hoppersNearPiston2.length > 0) {
                            piston1.block.setType("minecraft:air");
                            piston2.block.setType("minecraft:air");

                            world
                                .getDimension("overworld")
                                .runCommand(
                                    `tellraw @a {"rawtext":[{"text":"§c<Anti-Dupe> §f§l${player.nameTag} §r§ctried to dupe with piston-hopper setup! Pistons removed."}]}`
                                );

                            console.warn(`Piston-hopper dupe detected and prevented for player ${player.name}`);
                            return true;
                        }
                    }
                }
            }
        }

        for (const piston of pistons) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        const clockPos = {
                            x: piston.pos.x + dx,
                            y: piston.pos.y + dy,
                            z: piston.pos.z + dz
                        };
                        const clockBlock = dim.getBlock(clockPos);
                        if (clockBlock && (
                            clockBlock.typeId.includes("redstone") ||
                            clockBlock.typeId.includes("repeater") ||
                            clockBlock.typeId.includes("comparator") ||
                            clockBlock.typeId === "minecraft:observer"
                        )) {
                            piston.block.setType("minecraft:air");
                            clockBlock.setType("minecraft:air");

                            world
                                .getDimension("overworld")
                                .runCommand(
                                    `tellraw @a {"rawtext":[{"text":"§c<Anti-Dupe> §f§l${player.nameTag} §r§ctried to dupe with redstone clock! Components removed."}]}`
                                );

                            return true;
                        }
                    }
                }
            }
        }

        return false;
    } catch (e) {
        console.warn("Piston-hopper detection error:", e);
        return false;
    }
}

let currentPlayerIndex = 0;
let processingPhase = 0;

system.runInterval(() => {
    try {
        const antiDupeEnabled = world.getDynamicProperty("anti_dupe");
        if (antiDupeEnabled === false) return;

        const players = world.getAllPlayers();
        if (players.length === 0) return;

        for (let i = 0; i < PLAYERS_PER_TICK; i++) {
            const player = players[currentPlayerIndex];
            if (!player) continue;

            const dim = player.dimension;
            const { x: cx, y: cy, z: cz } = player.location;
            const baseX = Math.floor(cx);
            const baseY = Math.floor(cy);
            const baseZ = Math.floor(cz);

            if (processingPhase === 0) {
                if (system.currentTick % 2 === 0) {
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -PLANT_SCAN_RADIUS; dx <= PLANT_SCAN_RADIUS; dx++) {
                            for (let dz = -PLANT_SCAN_RADIUS; dz <= PLANT_SCAN_RADIUS; dz++) {
                                const b = dim.getBlock({
                                    x: baseX + dx,
                                    y: baseY + dy,
                                    z: baseZ + dz,
                                });
                                if (b && TWO_HIGH.has(b.typeId)) {
                                    purgePistons(player, dim, b);
                                }
                            }
                        }
                    }
                }
            } else if (processingPhase === 1) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -HOPPER_SCAN_RADIUS; dx <= HOPPER_SCAN_RADIUS; dx++) {
                        for (let dz = -HOPPER_SCAN_RADIUS; dz <= HOPPER_SCAN_RADIUS; dz++) {
                            const pos = { x: baseX + dx, y: baseY + dy, z: baseZ + dz };
                            const block = dim.getBlock(pos);
                            if (!block || block.typeId !== "minecraft:hopper") continue;

                            const invComp = block.getComponent("minecraft:inventory");
                            if (!invComp) continue;

                            const cont = invComp.container;
                            for (let slot = 0; slot < cont.size; slot++) {
                                const stack = cont.getItem(slot);
                                if (stack && BUNDLE_TYPES.has(stack.typeId)) {
                                    cont.setItem(slot, undefined);
                                    dim.runCommand(
                                        `tellraw @a {"rawtext":[{"text":"§c<Anti-Dupe> §fRemoved §7${stack.typeId}§f from a nearby hopper feeding off §b${player.nameTag}§f!"}]}`
                                    );
                                    break;
                                }
                            }
                        }
                    }
                }
            } else {
                detectPistonHopperDupe(player, dim, baseX, baseY, baseZ);
            }

            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            if (currentPlayerIndex === 0) {
                processingPhase = (processingPhase + 1) % 3;
            }
        }
    } catch (e) {
        console.warn("Main loop error:", e);
    }
}, SCAN_INTERVAL);
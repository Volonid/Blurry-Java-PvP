import { system, world, ItemStack } from "@minecraft/server";

const activeSystems = new Map();
const directions = [
    { x: 1, z: 0 },
    { x: 0, z: 1 }
];

function checkForStringSystem(dim, playerX, playerY, playerZ) {
    const centerX = Math.floor(playerX);
    const centerY = Math.floor(playerY);
    const centerZ = Math.floor(playerZ);

    for (let dy = -1; dy <= 1; dy++) {
        const y = centerY + dy;
        for (let dx = -3; dx <= 3; dx++) {
            const x = centerX + dx;
            for (let dz = -3; dz <= 3; dz++) {
                const z = centerZ + dz;

                const block = dim.getBlock({ x, y, z });
                if (block?.typeId !== "minecraft:trip_wire") continue;

                const key = `${x},${y},${z}`;
                if (activeSystems.has(key)) continue;

                for (const dir of directions) {
                    const neighborX = x + dir.x;
                    const neighborZ = z + dir.z;
                    const neighbor = dim.getBlock({ x: neighborX, y, z: neighborZ });

                    if (neighbor?.typeId === "minecraft:trip_wire") {
                        if (hasValidHooks(dim, x, y, z, neighborX, y, neighborZ)) {
                            startStringSystem(dim, x, y, z, neighborX, y, neighborZ);
                            return;
                        }
                    }
                }
            }
        }
    }
}

function hasValidHooks(dim, x1, y1, z1, x2, y2, z2) {
    const isHorizontal = z1 === z2;

    if (isHorizontal) {
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        return dim.getBlock({ x: startX - 1, y: y1, z: z1 })?.typeId === "minecraft:tripwire_hook" &&
            dim.getBlock({ x: endX + 1, y: y1, z: z1 })?.typeId === "minecraft:tripwire_hook";
    } else {
        const startZ = Math.min(z1, z2);
        const endZ = Math.max(z1, z2);
        return dim.getBlock({ x: x1, y: y1, z: startZ - 1 })?.typeId === "minecraft:tripwire_hook" &&
            dim.getBlock({ x: x1, y: y1, z: endZ + 1 })?.typeId === "minecraft:tripwire_hook";
    }
}

function startStringSystem(dim, x1, y1, z1, x2, y2, z2) {
    const key1 = `${x1},${y1},${z1}`;
    const key2 = `${x2},${y2},${z2}`;

    const intervalId = system.runInterval(() => {
        const block1 = dim.getBlock({ x: x1, y: y1, z: z1 });
        const block2 = dim.getBlock({ x: x2, y: y2, z: z2 });

        if (block1?.typeId !== "minecraft:trip_wire" || block2?.typeId !== "minecraft:trip_wire") {
            cleanupSystem(key1, intervalId);
            cleanupSystem(key2, intervalId);
            return;
        }

        dim.spawnItem(new ItemStack("minecraft:string", 1), {
            x: x1 + 0.5,
            y: y1 + 0.6,
            z: z1 + 0.5
        });

        dim.spawnItem(new ItemStack("minecraft:string", 1), {
            x: x2 + 0.5,
            y: y2 + 0.6,
            z: z2 + 0.5
        });
    }, 10);

    activeSystems.set(key1, intervalId);
    activeSystems.set(key2, intervalId);
}

function cleanupSystem(key, intervalId) {
    if (activeSystems.has(key)) {
        system.clearRun(intervalId);
        activeSystems.delete(key);
    }
}

let checkCounter = 0;
system.runInterval(() => {
    if (world.getDynamicProperty("new_string_duper") !== 2) return;

    if (checkCounter++ % 3 !== 0) return;

    const players = world.getAllPlayers();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const { x, y, z } = player.location;
        checkForStringSystem(player.dimension, x, y, z);
    }
}, 1);
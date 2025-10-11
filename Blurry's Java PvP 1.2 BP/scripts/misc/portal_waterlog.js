import { world } from "@minecraft/server";

// Use correct event signature: player, not source
world.afterEvents.playerInteractWithBlock.subscribe(({ block, player, itemStack }) => {
  if (world.getDynamicProperty("op") === false) return;
  if (!player || player.typeId !== "minecraft:player") return;
  if (!itemStack || itemStack.typeId !== "minecraft:water_bucket") return;
  if (!block || !block.location) return;
  checkNearbyWaterAndPortals(player, block.location);
});

function checkNearbyWaterAndPortals(player, origin) {
  const dim = player.dimension;
  if (!dim) return;
  const { x: px, y: py, z: pz } = origin;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        const pos = {
          x: Math.floor(px + dx),
          y: Math.floor(py + dy),
          z: Math.floor(pz + dz),
        };
        let block;
        try {
          block = dim.getBlock(pos);
        } catch {
          continue;
        }
        if (block?.typeId === "minecraft:water") {
          checkAdjacentForPortals(pos, dim, player);
        }
      }
    }
  }
}

function checkAdjacentForPortals(origin, dim, player) {
  const directions = [
    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
  ];
  for (const offset of directions) {
    const target = {
      x: origin.x + offset.x,
      y: origin.y + offset.y,
      z: origin.z + offset.z
    };
    let adjacentBlock;
    try {
      adjacentBlock = dim.getBlock(target);
    } catch {
      continue;
    }
    if (adjacentBlock?.typeId === "minecraft:portal") {
      breakPortal(target, player);
      break;
    }
  }
}

function breakPortal(pos, player) {
  const { x, y, z } = pos;
  try {
    player.runCommand(`fill ${x} ${y} ${z} ${x} ${y} ${z} air`);
    player.runCommand(`fill ${x - 5} ${y - 5} ${z - 5} ${x + 5} ${y + 5} ${z + 5} air replace portal`);
  } catch (error) {
    console.warn("Failed to break portal: " + error);
  }
}

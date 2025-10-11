import { world, ItemStack } from "@minecraft/server";

world.afterEvents.playerInteractWithBlock.subscribe(({ blockFace, block, player, beforeItemStack }) => {
  const web = world.getDynamicProperty("web");
  const doorEnabled = world.getDynamicProperty("door") === true;
  if (!block || !player) return;
  const dimension = player.dimension;
  const { x, y, z } = player.location;
  // Only get blocks if the position is in the world bounds (y: 0-319 for most dimensions)
  function getBlockSafe(dimension, pos) {
    if (pos.y < -64 || pos.y > 319) return null;
    return dimension.getBlock(pos);
  }
  
  // Get direction offset based on blockFace
  function getDirectionOffset(direction) {
    switch (direction) {
      case 'Down': return { x: 0, y: -1, z: 0 };
      case 'Up': return { x: 0, y: 1, z: 0 };
      case 'North': return { x: 0, y: 0, z: -1 };
      case 'South': return { x: 0, y: 0, z: 1 };
      case 'West': return { x: -1, y: 0, z: 0 };
      case 'East': return { x: 1, y: 0, z: 0 };
      default: return { x: 0, y: 0, z: 0 };
    }
  }
  
  const offset = getDirectionOffset(blockFace);
  const faceLocation = {
    x: block.x + offset.x,
    y: block.y + offset.y,
    z: block.z + offset.z
  };
  const faceBlock = getBlockSafe(dimension, faceLocation);
  const blockUp = getBlockSafe(block.dimension, { x: block.x, y: block.y + 1, z: block.z });
  const blockDown = getBlockSafe(block.dimension, { x: block.x, y: block.y - 1, z: block.z });
  if (
    beforeItemStack?.typeId === "minecraft:water_bucket" &&
    block.typeId === "minecraft:web" &&
    web === 1 &&
    player?.dimension?.id !== "minecraft:nether"
  ) { block.setType("minecraft:flowing_water"); }
  if (
    beforeItemStack?.typeId === "minecraft:water_bucket" &&
    block.typeId === "minecraft:web" &&
    web === 0 &&
    player?.dimension?.id !== "minecraft:nether"
  ) {
    if (blockUp && blockUp.typeId === "minecraft:air" && blockDown && blockDown.typeId != "minecraft:web") {
      blockUp.setType("minecraft:flowing_water");
      block.setType("minecraft:air");
      block.setType("minecraft:air");
    } else if (blockUp && blockUp.typeId === "minecraft:web" && blockDown && blockDown.typeId === "minecraft:web") {
      blockUp.setType("minecraft:air");
      block.setType("minecraft:flowing_water");
      blockDown.setType("minecraft:air");
    } else {
      block.setType("minecraft:flowing_water");
    }
  }
  
  const faceBlockUp = getBlockSafe(dimension, { x: faceLocation.x, y: faceLocation.y + 1, z: faceLocation.z });
  if (
    beforeItemStack?.typeId.includes("_door") &&
    !block.typeId.includes("_door") &&
    doorEnabled &&
    faceBlock &&
    (faceBlock.isWaterlogged || (faceBlockUp && faceBlockUp.isWaterlogged))
  ) {
    faceBlock.setWaterlogged(false);
    if (faceBlockUp) faceBlockUp.setWaterlogged(false);
  }
});
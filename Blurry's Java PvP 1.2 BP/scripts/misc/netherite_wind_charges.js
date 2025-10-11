import { world } from '@minecraft/server';

function isWearingNetheriteArmor(player) {
  try {
    if (!player || player.isDead) return false;

    const equippableComponent = player.getComponent("equippable");
    if (!equippableComponent) return false;

    const armorSlots = {
      Head: "minecraft:netherite_helmet",
      Chest: "minecraft:netherite_chestplate",
      Legs: "minecraft:netherite_leggings",
      Feet: "minecraft:netherite_boots"
    };

    let count = 0;
    for (const [slot, expectedItem] of Object.entries(armorSlots)) {
      const equippedItem = equippableComponent.getEquipment(slot)?.typeId;
      if (equippedItem === expectedItem) count++;
    }
    return count >= 3;
  } catch (e) {
    return false;
  }
}

world.afterEvents.projectileHitBlock.subscribe(event => {
  if (world.getDynamicProperty("op") === false) return;
  const { projectile, source, location } = event;
  if (!projectile) return;
  // Only wind charge projectiles
  if (projectile.typeId !== "minecraft:wind_charge_projectile") return;
  if (!location) return;
  const attackerLoc = location;
  for (const player of world.getPlayers()) {
    if (!isWearingNetheriteArmor(player)) continue;
    const dx = player.location.x - attackerLoc.x;
    const dy = player.location.y - attackerLoc.y;
    const dz = player.location.z - attackerLoc.z;
    const distSq = dx*dx + dy*dy + dz*dz;
    if (distSq <= 6) { // 3 block radius
      player.applyKnockback({ x: 0, z: 0 }, 1.7);
    }
  }
});
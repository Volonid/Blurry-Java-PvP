import { world, system, EquipmentSlot } from "@minecraft/server";

world.afterEvents.itemUse.subscribe(event => {
  const player = event.source;
  const item = event.itemStack;

  if (player.isSneaking || item?.typeId !== "minecraft:experience_bottle") return;

  const summonXPBottles = (count = 0) => {
    if (count < 4) {
      const head = player.getHeadLocation();
      const view = player.getViewDirection();
      // Add a slight delay between each throw for smoothness
      system.runTimeout(() => {
        if (!player.isValid) return;
        const bullet = player.dimension.spawnEntity("minecraft:xp_bottle", head);
        const proj = bullet.getComponent("projectile");
        if (proj) {
          proj.owner = player;
          // Add a small random spread to each throw for natural feel
          const spread = 0.08;
          const vx = view.x * 0.7 + (Math.random() - 0.5) * spread;
          const vy = view.y * 0.2 + 0.25 + (Math.random() - 0.5) * spread * 0.5;
          const vz = view.z * 0.7 + (Math.random() - 0.5) * spread;
          proj.shoot({ x: vx, y: vy, z: vz });
        }
        player.runCommand(`playsound random.bow @s ~ ~ ~ 0.5 0.5`);
        summonXPBottles(count + 1);
      }, count === 0 ? 0 : 1); // 3 ticks between throws for smoothness
    }
  };
  // Subtract 2 from the XP bottle stack in hand
  const inv = player.getComponent("inventory")?.container;
  if (inv && typeof player.selectedSlotIndex === "number") {
    const slot = player.selectedSlotIndex;
    const stack = inv.getItem(slot);
    if (stack && stack.typeId === "minecraft:experience_bottle" && stack.amount >= 3) {
      stack.amount -= 3;
      if (stack.amount > 3) {
        inv.setItem(slot, stack);
      } else {
        inv.setItem(slot, undefined);
      }
    }
  }
  summonXPBottles();
});


system.runInterval(() => {
  if (world.getDynamicProperty("op") === false) return;
  for (const player of world.getPlayers()) {
    const orbs = player.dimension.getEntities({
      type: "minecraft:xp_orb",
      location: player.location,
      maxDistance: 4
    });
    for (const orb of orbs) {
      orb.teleport(player.location, player.dimension);
    }
  }
}, 4);
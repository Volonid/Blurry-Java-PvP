import { world, system, } from '@minecraft/server';

const CRAMMING_LIMIT = 27; // Java default is 24
const CRAMMING_RADIUS = 0.7; // About 1 block

system.runInterval(() => {
  if (world.getDynamicProperty("op") === false) return;
  for (const player of world.getPlayers()) {
    const pos = player.location;
    const nearby = player.dimension.getEntities({
      location: pos,
      maxDistance: CRAMMING_RADIUS
    }).filter(e =>
      !e.isDead &&
      e.typeId !== "minecraft:item" &&
      e.typeId !== "minecraft:xp_orb"
    );
    if (nearby.length > CRAMMING_LIMIT) {
      // Damage all entities except the player itself
      for (const entity of nearby) {
          entity.applyDamage(1, {
            cause: "override"
          });
      }
    }
  }
}, 10);
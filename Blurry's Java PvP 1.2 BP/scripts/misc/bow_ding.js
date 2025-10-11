import { world } from '@minecraft/server';

world.afterEvents.projectileHitEntity.subscribe(evd => {
  if (world.getDynamicProperty("op") === false) return;
  const { source: attacker, projectile } = evd;
  const victim = evd.getEntityHit().entity;
  if (!attacker) {return}
  if (projectile?.typeId === "minecraft:arrow") {
    attacker.runCommand("playsound random.orb @s");
  }
});
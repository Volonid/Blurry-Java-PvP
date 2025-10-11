import { world, system, } from '@minecraft/server';

system.runInterval(() => {
    if (world.getDynamicProperty("op") === false) return;
    if (world.getDynamicProperty("player") === false) return;
  for (const player of world.getPlayers()) {
    if (!player) return;
      const playerPos = player.location;
      const dimension = player.dimension;
      const entities = dimension.getEntities();
      const nearbyDolphins = entities.filter(entity => 
          entity.typeId === "minecraft:dolphin" &&
          entity.location &&
          Math.hypot(
              entity.location.x - playerPos.x,
              entity.location.y - playerPos.y,
              entity.location.z - playerPos.z
          ) <= 10
      );
      if (nearbyDolphins.length > 0) {
          player.triggerEvent("bf:swim_add");
      } else {
          system.runTimeout(() => {
              if (player.isValid) {
                  player.triggerEvent("bf:swim_remove");
              }
          }, 20);
      }
  }
}, 60);
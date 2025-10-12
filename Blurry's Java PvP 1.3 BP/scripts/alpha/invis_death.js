import { world, system, Player } from "@minecraft/server";

const recentHits = new Map();

const invisiblePlayers = new Set();

system.runInterval(() => {
    try {
        const players = world.getPlayers();
        for (const player of players) {
            const invisEffect = player.getEffect("invisibility");
            if (invisEffect) {
                invisiblePlayers.add(player.id);
            } else {
                invisiblePlayers.delete(player.id);
            }
        }
    } catch (error) {
        console.warn("Invisibility check error:", error);
    }
}, 20);

world.afterEvents.entityHurt.subscribe((event) => {
    try {
        const { hurtEntity, damageSource } = event;

        if (hurtEntity instanceof Player && damageSource.damagingEntity instanceof Player) {
            recentHits.set(hurtEntity.id, {
                entity: damageSource.damagingEntity,
                timestamp: system.currentTick
            });
        }
    } catch (error) {
        console.warn("Hit tracking error:", error);
    }
});

system.runInterval(() => {
    try {
        const currentTime = system.currentTick;
        for (const [entityId, hitData] of recentHits.entries()) {
            if (currentTime - hitData.timestamp > 600) {
                recentHits.delete(entityId);
            }
        }
    } catch (error) {
        console.warn("Hit cleanup error:", error);
    }
}, 200);

world.afterEvents.entityDie.subscribe((event) => {
    try {
        const { deadEntity } = event;

        if (world.getDynamicProperty("death") !== true) return;

        if (deadEntity.typeId === "minecraft:player") {
            const killerData = recentHits.get(deadEntity.id);

            if (killerData && killerData.entity.typeId === "minecraft:player") {
                const killer = killerData.entity;

                const invisDeathEnabled = world.getDynamicProperty("invis_death");

                let deathMessage;
                if (invisDeathEnabled && invisiblePlayers.has(killer.id)) {

                    deathMessage = `§7${deadEntity.name} was slain by §krandom`;
                } else {

                    deathMessage = `§7${deadEntity.name} was slain by ${killer.name}`;
                }

                world.sendMessage(deathMessage);
            } else {

                world.sendMessage(`§7${deadEntity.name} died`);
            }


            recentHits.delete(deadEntity.id);
        }
    } catch (error) {
        console.warn("Death message error:", error);
    }
});
import { world, system, EquipmentSlot } from "@minecraft/server";

let cachedProps = {};

// Update cached properties
system.runInterval(() => {
    cachedProps.op = world.getDynamicProperty("op");
}, 120);

// Armor repair system
world.afterEvents.entityHurt.subscribe((event) => {
    if (cachedProps.op === false) return;
    const entity = event.hurtEntity;
    if (entity?.typeId !== "minecraft:player") return;

    entity.runCommand(`playsound hit @a ~~~`);

    // Add 1 durability to all equipped armor pieces
    try {
        if (event.damage <= 5) return;
        const equippable = entity.getComponent("minecraft:equippable");
        if (equippable) {
            const slots = [
                EquipmentSlot.Head,
                EquipmentSlot.Chest,
                EquipmentSlot.Legs,
                EquipmentSlot.Feet
            ];
            for (const slot of slots) {
                const armor = equippable.getEquipment(slot);
                if (armor && armor.getComponent && armor.getComponent("durability")) {
                    const durabilityComp = armor.getComponent("durability");
                    if (durabilityComp.damage > 0) {
                        durabilityComp.damage = Math.max(0, durabilityComp.damage - 1);
                        equippable.setEquipment(slot, armor);
                    }
                }
            }
        }
    } catch (e) { }

    const poison = entity.getEffect("minecraft:poison");
    const wither = entity.getEffect("minecraft:wither");
    if (poison || wither) {
        try {
            entity.applyKnockback({ x: 0, z: 0 }, 0);
        } catch (e) { }
    }
});
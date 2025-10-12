import { world, system } from '@minecraft/server';

system.runInterval(() => {
    const autoRefillEnabled = world.getDynamicProperty("auto_refill");
    if (autoRefillEnabled !== true) return;

    const players = world.getPlayers();
    for (const player of players) {
        checkHotbarRefill(player);
    }
}, 20);

world.afterEvents.entityHitEntity.subscribe(event => {
    const autoRefillEnabled = world.getDynamicProperty("auto_refill");
    if (autoRefillEnabled !== true) return;

    const attacker = event.damagingEntity;
    if (attacker && attacker.typeId === "minecraft:player") {
        checkToolDurability(attacker);
    }
});

world.afterEvents.itemCompleteUse.subscribe(event => {
    const autoRefillEnabled = world.getDynamicProperty("auto_refill");
    if (autoRefillEnabled !== true) return;

    const player = event.source;
    if (player && player.typeId === "minecraft:player") {
        checkHotbarRefill(player);
    }
});

world.afterEvents.playerBreakBlock.subscribe(event => {
    const autoRefillEnabled = world.getDynamicProperty("auto_refill");
    if (autoRefillEnabled !== true) return;

    const player = event.player;
    checkToolDurability(player);
});

function checkHotbarRefill(player) {
    try {
        const inventory = player.getComponent('inventory')?.container;
        if (!inventory) return;

        const selectedSlot = player.selectedSlotIndex;
        const currentItem = inventory.getItem(selectedSlot);

        if (!currentItem) return;

        if (currentItem.amount <= 1) {
            const itemType = currentItem.typeId;

            for (let slot = 9; slot < inventory.size; slot++) {
                const stack = inventory.getItem(slot);
                if (stack && stack.typeId === itemType) {
                    swapSlots(inventory, slot, selectedSlot);
                    return;
                }
            }
        }
    } catch (error) {
        console.warn("Hotbar refill error:", error);
    }
}

function checkToolDurability(player) {
    try {
        const inventory = player.getComponent('inventory')?.container;
        if (!inventory) return;

        const selectedSlot = player.selectedSlotIndex;
        const currentTool = inventory.getItem(selectedSlot);

        if (!currentTool) return;

        const durability = currentTool.getComponent("durability");
        if (durability && durability.damage >= durability.maxDurability - 10) {
            const toolType = currentTool.typeId;

            for (let slot = 9; slot < inventory.size; slot++) {
                const replacement = inventory.getItem(slot);
                if (replacement && replacement.typeId === toolType) {
                    swapSlots(inventory, slot, selectedSlot);
                    world.playSound("random.break", player.location, { volume: 0.5 });
                    return;
                }
            }
        }
    } catch (error) {
        console.warn("Tool durability check error:", error);
    }
}

function swapSlots(container, slot1, slot2) {
    try {
        const item1 = container.getItem(slot1);
        const item2 = container.getItem(slot2);

        container.setItem(slot1, item2);
        container.setItem(slot2, item1);
    } catch (error) {
        console.warn("Slot swap error:", error);
    }
}
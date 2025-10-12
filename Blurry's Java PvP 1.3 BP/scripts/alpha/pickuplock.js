import { world, system } from "@minecraft/server";

// Pickup Lock System
const BLOCKED_ITEMS = [
    "minecraft:dirt",
    "minecraft:grass_block",
    "minecraft:cobblestone",
    "minecraft:gravel",
    "minecraft:sand",
    "minecraft:seeds",
    "minecraft:wheat_seeds",
    "minecraft:rotten_flesh",
    "minecraft:bone",
    "minecraft:string",
    "minecraft:spider_eye",
    "minecraft:poisonous_potato",
    "minecraft:feather",
    "minecraft:leather",
    "minecraft:andesite",
    "minecraft:diorite",
    "minecraft:granite",
    "minecraft:netherrack",
    "minecraft:basalt",
    "minecraft:blackstone",
    "minecraft:flint",
    "minecraft:stick",
    "minecraft:pumpkin_seeds",
    "minecraft:beetroot_seeds",
    "minecraft:melon_seeds",
    "minecraft:lily_pad",
    "minecraft:egg",
    "minecraft:ink_sac",
    "minecraft:snowball",
    "minecraft:paper",
    "minecraft:clay_ball",
    "minecraft:kelp",
    "minecraft:bamboo",
    "minecraft:cactus",
    "minecraft:dripstone_block",
    "minecraft:pointed_dripstone",
    "minecraft:glow_berries",
    "minecraft:twisting_vines",
    "minecraft:weeping_vines",
    "minecraft:seagrass",
    "minecraft:dead_bush",
    "minecraft:tropical_fish",
    "minecraft:pufferfish",
    "minecraft:nautilus_shell",
    "minecraft:oak_sapling",
    "minecraft:spruce_sapling",
    "minecraft:birch_sapling",
    "minecraft:jungle_sapling",
    "minecraft:acacia_sapling",
    "minecraft:dark_oak_sapling",
    "minecraft:mangrove_propagule",
    "minecraft:flower_pot",
    "minecraft:vine",
    "minecraft:mushroom_stew",
    "minecraft:mushroom",
    "minecraft:snow",
];

function shouldBlockItem(itemTypeId) {
    return BLOCKED_ITEMS.includes(itemTypeId);
}

// Pickup lock event handlers
world.afterEvents.entityHitEntity.subscribe((event) => {
    const pickupLockEnabled = world.getDynamicProperty("pickup_lock");
    if (!pickupLockEnabled) return;

    const { hitEntity, damagingEntity } = event;

    if (hitEntity.typeId === "minecraft:item" && damagingEntity && damagingEntity.typeId === "minecraft:player") {
        const itemEntity = hitEntity;

        try {
            const itemComponent = itemEntity.getComponent("item");
            if (itemComponent && shouldBlockItem(itemComponent.itemStack.typeId)) {
                itemEntity.kill();
            }
        } catch (error) {
            // Silent fail
        }
    }
});

world.afterEvents.itemUse.subscribe((event) => {
    const pickupLockEnabled = world.getDynamicProperty("pickup_lock");
    if (!pickupLockEnabled) return;

    const { source: player, item } = event;

    if (player && item && shouldBlockItem(item.typeId)) {
        event.cancel = true;
    }
});

world.afterEvents.itemCompleteUse.subscribe((event) => {
    const pickupLockEnabled = world.getDynamicProperty("pickup_lock");
    if (!pickupLockEnabled) return;

    const { source: player, item } = event;

    if (player && item && shouldBlockItem(item.typeId)) {
        system.run(() => {
            const inventory = player.getComponent("inventory").container;
            for (let i = 0; i < inventory.size; i++) {
                const invItem = inventory.getItem(i);
                if (invItem && shouldBlockItem(invItem.typeId)) {
                    inventory.setItem(i, null);
                }
            }
        });
    }
});

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const pickupLockEnabled = world.getDynamicProperty("pickup_lock");
    if (!pickupLockEnabled) return;

    const { player } = event;

    system.run(() => {
        const inventory = player.getComponent("inventory").container;
        let cleaned = false;

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item && shouldBlockItem(item.typeId)) {
                inventory.setItem(i, null);
                cleaned = true;
            }
        }

        if (cleaned) {
            player.sendMessage("§cCleaned items from inventory");
        }
    });
});

system.runInterval(() => {
    const pickupLockEnabled = world.getDynamicProperty("pickup_lock");
    if (!pickupLockEnabled) return;

    const players = world.getPlayers();
    for (const player of players) {
        const inventory = player.getComponent("inventory").container;
        let cleaned = false;

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item && shouldBlockItem(item.typeId)) {
                inventory.setItem(i, null);
                cleaned = true;
            }
        }

        if (cleaned) {
            player.sendMessage("§cCleaned items from inventory");
        }
    }
}, 100);
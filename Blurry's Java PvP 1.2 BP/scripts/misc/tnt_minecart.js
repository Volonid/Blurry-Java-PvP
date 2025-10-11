import {
    world,
    system,
    EquipmentSlot,
    ItemStack
} from '@minecraft/server';

const RAIL_BLOCKS = [
    "minecraft:rail",
    "minecraft:powered_rail",
    "minecraft:detector_rail",
    "minecraft:activator_rail"
];

world.beforeEvents.itemUse.subscribe(event => {
    try {
        const player = event.source;
        if (player.typeId !== "minecraft:player") return;

        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);

        let slotUsed = null;
        if (offhandItem?.typeId === "rad:tnt_minecart") {
            slotUsed = EquipmentSlot.Offhand;
        }

        if (!slotUsed) return;

        const blockRay = player.getBlockFromViewDirection();
        if (!blockRay) return;

        const block = blockRay.block;
        if (!block || !RAIL_BLOCKS.includes(block.typeId)) return;

        const spawnLoc = {
            x: block.location.x + 0.5,
            y: block.location.y + 1,
            z: block.location.z + 0.5
        };

        system.run(() => {
            block.dimension.spawnEntity("minecraft:tnt_minecart", spawnLoc);
            equippable.setEquipment(slotUsed, undefined);
        });

    } catch (error) {
        console.warn("Error placing TNT minecart on rails:", error);
    }
});

// Interacting with TNT minecart entity
world.beforeEvents.playerInteractWithEntity.subscribe(event => {
    try {
        const player = event.player;
        const target = event.target;

        if (target.typeId !== "minecraft:tnt_minecart") return;

        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);

        let slotUsed = null;
        if (mainhandItem?.typeId === "rad:tnt_minecart") {
            slotUsed = EquipmentSlot.Mainhand;
        }

        if (!slotUsed) return;

        const spawnLoc = {
            x: target.location.x,
            y: target.location.y + 1,
            z: target.location.z
        };

        system.run(() => {
            target.dimension.spawnEntity("minecraft:tnt_minecart", spawnLoc);
            equippable.setEquipment(slotUsed, undefined);
        });

    } catch (error) {
        console.warn("Error stacking TNT minecarts:", error);
    }
});
const foodSwapMap = new Map([
    ["minecraft:tnt_minecart", { newItem: "rad:tnt_minecart" }],
]);

function swapFood(player) {
    const inventoryComp = player.getComponent("inventory");
    if (!inventoryComp) return;
    const inventory = inventoryComp.container;
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (!item) continue;
        const swapData = foodSwapMap.get(item.typeId);
        if (swapData) {
            const { newItem } = swapData;
            const newItemStack = new ItemStack(newItem, item.amount);
            // Optionally copy custom data here if needed
            inventory.setItem(i, newItemStack);
        }
    }
}

// Run the swap function for all players periodically
system.runInterval(() => {
    world.getPlayers().forEach(player => {
        swapFood(player);
    });
}, 80); // Runs every second

const CART_RADIUS = 2;
const TRIGGER_TAG = "chain_boomed";

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const dimension = player.dimension;
        const arrows = dimension.getEntities({ type: "minecraft:arrow" });

        for (const arrow of arrows) {
            const arrowFire = arrow.getComponent("minecraft:onfire");
            // Only continue if arrow is burning
            if (!arrowFire) continue;

            const arrowLoc = arrow.location;

            // Get nearby TNT minecarts
            const nearbyMinecarts = dimension.getEntities({
                type: "minecraft:tnt_minecart",
                location: arrowLoc,
                maxDistance: CART_RADIUS,
            });

            for (const minecart of nearbyMinecarts) {
                if (minecart.hasTag(TRIGGER_TAG)) continue;

                minecart.runCommand("event entity @s minecraft:on_instant_prime");
                minecart.addTag(TRIGGER_TAG);

                // Now also chain-react nearby carts
                const chainNearby = dimension.getEntities({
                    type: "minecraft:tnt_minecart",
                    location: minecart.location,
                    maxDistance: CART_RADIUS,
                });

                for (const chained of chainNearby) {
                    if (chained.id === minecart.id) continue;

                    system.run(() => {
                        chained.runCommand("event entity @s minecraft:on_instant_prime");
                        chained.addTag(TRIGGER_TAG);
                    });
                }
            }
        }
    }
}, 1);
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player || !player.isValid) continue;

        const dim = player.dimension;

        // Check for wind charges in the player's dimension
        const charges = dim.getEntities({ type: "wind_charge_projectile" });

        for (const charge of charges) {
            if (!charge || !charge.isValid) continue;

            if (charge.hasTag("on_fire")) {
                const { x, y, z } = charge.location;

                // Use the player to run the command (source matters)
                try {
                    player.runCommandAsync(`execute at @e[type=wind_charge_projectile,x=${x},y=${y},z=${z},r=1] run summon tnt_minecart ~ ~ ~ {TNTFuse:0}`);
                } catch (e) {
                    console.warn("Failed to trigger TNT minecart:", e);
                }
            }
        }
    }

}, 3)
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player || !player.isValid) continue;
        if (player.isOnFire && !player.hasTag("fire")) {
            player.addTag("fire");

            system.runTimeout(() => {
                if (player && player.isValid) {
                    player.removeTag("fire");
                    player.extinguishFire(true); // Extinguish fire completely
                }
            }, 80); // 4 seconds later
        }
    }
}, 5)

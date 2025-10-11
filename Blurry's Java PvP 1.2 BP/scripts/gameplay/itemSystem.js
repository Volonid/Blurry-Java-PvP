import { world, system, ItemStack, EnchantmentType, EquipmentSlot, } from '@minecraft/server';

// Define the items to detect and the items to swap with, including visual stats
let itemSwapRules = [
    { fromItem: "minecraft:wooden_axe", toItem: "bf:wooden_axe", extraDamage: 7, attackSpeed: 1.25 },
    { fromItem: "minecraft:wooden_sword", toItem: "bf:wooden_sword", extraDamage: 4, attackSpeed: 0.6 },
    { fromItem: "minecraft:stone_axe", toItem: "bf:stone_axe", extraDamage: 9, attackSpeed: 1.1 },
    { fromItem: "minecraft:stone_sword", toItem: "bf:stone_sword", extraDamage: 5, attackSpeed: 0.6 },
    { fromItem: "minecraft:iron_axe", toItem: "bf:iron_axe", extraDamage: 9, attackSpeed: 1.1 },
    { fromItem: "minecraft:iron_sword", toItem: "bf:iron_sword", extraDamage: 6, attackSpeed: 0.6 },
    { fromItem: "minecraft:golden_axe", toItem: "bf:golden_axe", extraDamage: 7, attackSpeed: 1 },
    { fromItem: "minecraft:golden_sword", toItem: "bf:golden_sword", extraDamage: 4, attackSpeed: 0.6 },
    { fromItem: "minecraft:diamond_axe", toItem: "bf:diamond_axe", extraDamage: 9, attackSpeed: 1.1 },
    { fromItem: "minecraft:diamond_sword", toItem: "bf:diamond_sword", extraDamage: 7, attackSpeed: 0.6 },
    { fromItem: "minecraft:copper_axe", toItem: "bf:copper_axe", extraDamage: 7, attackSpeed: 1.1 },
    { fromItem: "minecraft:copper_sword", toItem: "bf:copper_sword", extraDamage: 5, attackSpeed: 0.6 },
    { fromItem: "minecraft:netherite_axe", toItem: "bf:netherite_axe", extraDamage: 10, attackSpeed: 1 },
    { fromItem: "minecraft:netherite_sword", toItem: "bf:netherite_sword", extraDamage: 8, attackSpeed: 0.6 }
];


function setLore(item, damage, attackSpeed) {
    let text = '';
    if (item.hasTag("is_sword")) {
        text = '§r§9Sweeping Edge III';
    }
    const lore = [
        text,
        `§r§7When in Main Hand:`,
        `§r§2 ${damage} Attack Damage`,
        `§r§2 ${attackSpeed} Attack Speed`
    ];
    item.setLore(lore);
}

function copyEnchantments(fromItem, toItem) {
    const enchants = fromItem.getComponent("enchantable").getEnchantments();
    const newEnchant = toItem.getComponent("enchantable");
    enchants.forEach(enchant => {
            newEnchant.addEnchantment({
                level: enchant.level,
                type: enchant.type,
            });
    });
}

function copyDurability(fromItem, toItem) {
    const fromDurability = fromItem.getComponent("durability");
    const toDurability = toItem.getComponent("durability");

    if (fromDurability && toDurability) {
        toDurability.damage = fromDurability.damage;
    }
}

function swapItems(player) {
    const inventory = player.getComponent("inventory").container;
    const equippable = player.getComponent("minecraft:equippable");

    // Swap main inventory
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item) {
            itemSwapRules.forEach(rule => {
                if (rule.fromItem === item.typeId) {
                    inventory.setItem(i, null);
                    const newItem = new ItemStack(rule.toItem, item.amount);
                    copyEnchantments(item, newItem);
                    copyDurability(item, newItem);

                    // Only set lore if the item is NOT a shield
                    if (rule.fromItem !== "minecraft:shield" && rule.fromItem !== "bf:shield") {
                        setLore(newItem, rule.extraDamage, rule.attackSpeed);
                    }

                    inventory.setItem(i, newItem);
                }
            });
        }
    }

    // Swap offhand
    if (equippable) {
        const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand); // 1 = EquipmentSlot.Offhand
        if (offhandItem) {
            itemSwapRules.forEach(rule => {
                if (rule.fromItem === offhandItem.typeId) {
                    equippable.setEquipment(EquipmentSlot.Offhand, null);
                    const newOffhandItem = new ItemStack(rule.toItem, offhandItem.amount);
                    copyEnchantments(offhandItem, newOffhandItem);
                    copyDurability(offhandItem, newOffhandItem);

                    // Only set lore if the item is NOT a shield
                    if (rule.fromItem !== "minecraft:shield" && rule.fromItem !== "bf:shield") {
                        setLore(newOffhandItem, rule.extraDamage, rule.attackSpeed);
                    }

                    equippable.setEquipment(EquipmentSlot.Offhand, newOffhandItem);
                }
            });
        }
    }
}

system.runInterval(() => {
    const players = world.getPlayers();
    if (players.length === 0) {
        return;
    }
    for (const player of players) {
        if (!player) return;
            if (world.getDynamicProperty("player") === true && world.getDynamicProperty("shield") === true) {
                itemSwapRules = [
                    { fromItem: "minecraft:wooden_axe", toItem: "bf:wooden_axe", extraDamage: 7, attackSpeed: 1.25 },
                    { fromItem: "minecraft:wooden_sword", toItem: "bf:wooden_sword", extraDamage: 4, attackSpeed: 0.6 },
                    { fromItem: "minecraft:stone_axe", toItem: "bf:stone_axe", extraDamage: 9, attackSpeed: 1.1 },
                    { fromItem: "minecraft:stone_sword", toItem: "bf:stone_sword", extraDamage: 5, attackSpeed: 0.6 },
                    { fromItem: "minecraft:iron_axe", toItem: "bf:iron_axe", extraDamage: 9, attackSpeed: 1.1 },
                    { fromItem: "minecraft:iron_sword", toItem: "bf:iron_sword", extraDamage: 6, attackSpeed: 0.6 },
                    { fromItem: "minecraft:golden_axe", toItem: "bf:golden_axe", extraDamage: 7, attackSpeed: 1 },
                    { fromItem: "minecraft:golden_sword", toItem: "bf:golden_sword", extraDamage: 4, attackSpeed: 0.6 },
                    { fromItem: "minecraft:diamond_axe", toItem: "bf:diamond_axe", extraDamage: 9, attackSpeed: 1.1 },
                    { fromItem: "minecraft:diamond_sword", toItem: "bf:diamond_sword", extraDamage: 7, attackSpeed: 0.6 },
                    { fromItem: "minecraft:copper_axe", toItem: "bf:copper_axe", extraDamage: 7, attackSpeed: 1.1 },
                    { fromItem: "minecraft:copper_sword", toItem: "bf:copper_sword", extraDamage: 5, attackSpeed: 0.6 },
                    { fromItem: "minecraft:netherite_axe", toItem: "bf:netherite_axe", extraDamage: 10, attackSpeed: 1 },
                    { fromItem: "minecraft:netherite_sword", toItem: "bf:netherite_sword", extraDamage: 8, attackSpeed: 0.6 },
                    { fromItem: "minecraft:shield", toItem: "bf:shield", extraDamage: 8, attackSpeed: 0.6 }
                ];
            } else {
                itemSwapRules = [
                { fromItem: "minecraft:wooden_axe", toItem: "bf:wooden_axe", extraDamage: 7, attackSpeed: 1.25 },
                { fromItem: "minecraft:wooden_sword", toItem: "bf:wooden_sword", extraDamage: 4, attackSpeed: 0.6 },
                { fromItem: "minecraft:stone_axe", toItem: "bf:stone_axe", extraDamage: 9, attackSpeed: 1.1 },
                { fromItem: "minecraft:stone_sword", toItem: "bf:stone_sword", extraDamage: 5, attackSpeed: 0.6 },
                { fromItem: "minecraft:iron_axe", toItem: "bf:iron_axe", extraDamage: 9, attackSpeed: 1.1 },
                { fromItem: "minecraft:iron_sword", toItem: "bf:iron_sword", extraDamage: 6, attackSpeed: 0.6 },
                { fromItem: "minecraft:golden_axe", toItem: "bf:golden_axe", extraDamage: 7, attackSpeed: 1 },
                { fromItem: "minecraft:golden_sword", toItem: "bf:golden_sword", extraDamage: 4, attackSpeed: 0.6 },
                { fromItem: "minecraft:diamond_axe", toItem: "bf:diamond_axe", extraDamage: 9, attackSpeed: 1.1 },
                { fromItem: "minecraft:diamond_sword", toItem: "bf:diamond_sword", extraDamage: 7, attackSpeed: 0.6 },
                { fromItem: "minecraft:copper_axe", toItem: "bf:copper_axe", extraDamage: 7, attackSpeed: 1.1 },
                { fromItem: "minecraft:copper_sword", toItem: "bf:copper_sword", extraDamage: 5, attackSpeed: 0.6 },
                { fromItem: "minecraft:netherite_axe", toItem: "bf:netherite_axe", extraDamage: 10, attackSpeed: 1 },
                { fromItem: "minecraft:netherite_sword", toItem: "bf:netherite_sword", extraDamage: 8, attackSpeed: 0.6 },
                { fromItem: "bf:shield", toItem: "minecraft:shield", extraDamage: 8, attackSpeed: 0.6 }
            ];
            }
            swapItems(player);
    }
}, 80);
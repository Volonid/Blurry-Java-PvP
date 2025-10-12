import { world, system, Player } from "@minecraft/server";

// Define sorting categories and priorities
const SORT_CATEGORIES = {
    PRIMARY_WEAPON: 1,      // Slot 1 - Main weapon
    SECONDARY_WEAPON: 2,    // Slot 2 - Secondary/utility weapon  
    RANGED: 3,              // Slot 3 - Bow/Crossbow
    WATER_BUCKET: 4,        // Slot 4 - Water bucket
    GAPPLES_HOTBAR: 5,      // Slot 5 - Golden apples (hotbar)
    PEARLS_POTIONS: 6,      // Slot 6 - Pearls/Potions
    SHIELD_TOTEM: 7,        // Slot 7 - Shield/Totem/Utility
    EXTRA_HOTBAR: 8,        // Slot 8-9 - Extra utility
    ARMOR: 9,               // Armor pieces
    FOOD: 10,               // Food stack
    EXTRA_GAPPLES: 11,      // Extra golden apples
    BACKUP_WEAPON: 12,      // Backup weapon
    SPLASH_POTIONS: 13,     // Splash potions
    ARROWS: 14,             // Arrows
    MILK_BUCKET: 15,        // Milk bucket
    BLOCKS: 16,             // ALL BLOCKS GO HERE - NOT HOTBAR
    EXTRA_BUCKETS: 17,      // Extra water/lava buckets
    REPLACEMENT_ARMOR: 18,  // Replacement armor
    TOTEMS: 19,             // Totems of undying
    OFFENSIVE_ITEMS: 20,    // Flint & steel, lava, TNT
    SPECIALTY: 21,          // Shears, cobwebs, tools
    MISC: 22                // Everything else
};

// Comprehensive list of block IDs - if it's in this list, it's a BLOCK
const BLOCK_ITEMS = new Set([
    // Stone types
    'minecraft:stone', 'minecraft:cobblestone', 'minecraft:stone_bricks', 'minecraft:mossy_cobblestone',
    'minecraft:mossy_stone_bricks', 'minecraft:cracked_stone_bricks', 'minecraft:chiseled_stone_bricks',
    'minecraft:granite', 'minecraft:polished_granite', 'minecraft:diorite', 'minecraft:polished_diorite',
    'minecraft:andesite', 'minecraft:polished_andesite', 'minecraft:deepslate', 'minecraft:cobbled_deepslate',
    'minecraft:polished_deepslate', 'minecraft:deepslate_bricks', 'minecraft:cracked_deepslate_bricks',
    'minecraft:deepslate_tiles', 'minecraft:cracked_deepslate_tiles', 'minecraft:chiseled_deepslate',
    'minecraft:calcite', 'minecraft:tuff', 'minecraft:dripstone_block',

    // Copper Drop
    'minecraft:copper_chest', 'minecraft:shelf', 'minecraft:copper_golem_statue',
    'minecraft:copper_torch', 'minecraft:copper_bars', 'minecraft:copper_chain', 'minecraft:copper_lantern',
    'minecraft:exposed_copper_chest', 'minecraft:weathered_copper_chest', 'minecraft:oxidized_copper_chest',
    'minecraft:waxed_copper_chest', 'minecraft:waxed_exposed_copper_chest', 'minecraft:waxed_weathered_copper_chest', 'minecraft:waxed_oxidized_copper_chest',
    'minecraft:exposed_copper_golem_statue', 'minecraft:weathered_copper_golem_statue', 'minecraft:oxidized_copper_golem_statue',
    'minecraft:waxed_copper_golem_statue', 'minecraft:waxed_exposed_copper_golem_statue', 'minecraft:waxed_weathered_copper_golem_statue', 'minecraft:waxed_oxidized_copper_golem_statue',

    // Dirt & sand
    'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:rooted_dirt', 'minecraft:mud',
    'minecraft:grass_block', 'minecraft:mycelium', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
    'minecraft:clay', 'minecraft:sandstone', 'minecraft:chiseled_sandstone', 'minecraft:cut_sandstone',
    'minecraft:smooth_sandstone', 'minecraft:red_sandstone', 'minecraft:chiseled_red_sandstone',
    'minecraft:cut_red_sandstone', 'minecraft:smooth_red_sandstone',

    // Wood & logs
    'minecraft:oak_log', 'minecraft:spruce_log', 'minecraft:birch_log', 'minecraft:jungle_log',
    'minecraft:acacia_log', 'minecraft:dark_oak_log', 'minecraft:mangrove_log', 'minecraft:cherry_log',
    'minecraft:crimson_stem', 'minecraft:warped_stem', 'minecraft:stripped_oak_log', 'minecraft:stripped_spruce_log',
    'minecraft:stripped_birch_log', 'minecraft:stripped_jungle_log', 'minecraft:stripped_acacia_log',
    'minecraft:stripped_dark_oak_log', 'minecraft:stripped_mangrove_log', 'minecraft:stripped_cherry_log',
    'minecraft:stripped_crimson_stem', 'minecraft:stripped_warped_stem',

    // Planks
    'minecraft:oak_planks', 'minecraft:spruce_planks', 'minecraft:birch_planks', 'minecraft:jungle_planks',
    'minecraft:acacia_planks', 'minecraft:dark_oak_planks', 'minecraft:mangrove_planks', 'minecraft:cherry_planks',
    'minecraft:crimson_planks', 'minecraft:warped_planks',

    // Ores & minerals
    'minecraft:coal_ore', 'minecraft:deepslate_coal_ore', 'minecraft:iron_ore', 'minecraft:deepslate_iron_ore',
    'minecraft:copper_ore', 'minecraft:deepslate_copper_ore', 'minecraft:gold_ore', 'minecraft:deepslate_gold_ore',
    'minecraft:redstone_ore', 'minecraft:deepslate_redstone_ore', 'minecraft:emerald_ore', 'minecraft:deepslate_emerald_ore',
    'minecraft:lapis_ore', 'minecraft:deepslate_lapis_ore', 'minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore',
    'minecraft:nether_gold_ore', 'minecraft:nether_quartz_ore', 'minecraft:ancient_debris',
    'minecraft:coal_block', 'minecraft:iron_block', 'minecraft:copper_block', 'minecraft:gold_block',
    'minecraft:redstone_block', 'minecraft:emerald_block', 'minecraft:lapis_block', 'minecraft:diamond_block',
    'minecraft:netherite_block', 'minecraft:raw_iron_block', 'minecraft:raw_copper_block', 'minecraft:raw_gold_block',

    // Glass
    'minecraft:glass', 'minecraft:white_stained_glass', 'minecraft:orange_stained_glass', 'minecraft:magenta_stained_glass',
    'minecraft:light_blue_stained_glass', 'minecraft:yellow_stained_glass', 'minecraft:lime_stained_glass',
    'minecraft:pink_stained_glass', 'minecraft:gray_stained_glass', 'minecraft:light_gray_stained_glass',
    'minecraft:cyan_stained_glass', 'minecraft:purple_stained_glass', 'minecraft:blue_stained_glass',
    'minecraft:brown_stained_glass', 'minecraft:green_stained_glass', 'minecraft:red_stained_glass',
    'minecraft:black_stained_glass', 'minecraft:tinted_glass',

    // Wool & carpets
    'minecraft:white_wool', 'minecraft:orange_wool', 'minecraft:magenta_wool', 'minecraft:light_blue_wool',
    'minecraft:yellow_wool', 'minecraft:lime_wool', 'minecraft:pink_wool', 'minecraft:gray_wool',
    'minecraft:light_gray_wool', 'minecraft:cyan_wool', 'minecraft:purple_wool', 'minecraft:blue_wool',
    'minecraft:brown_wool', 'minecraft:green_wool', 'minecraft:red_wool', 'minecraft:black_wool',
    'minecraft:white_carpet', 'minecraft:orange_carpet', 'minecraft:magenta_carpet', 'minecraft:light_blue_carpet',
    'minecraft:yellow_carpet', 'minecraft:lime_carpet', 'minecraft:pink_carpet', 'minecraft:gray_carpet',
    'minecraft:light_gray_carpet', 'minecraft:cyan_carpet', 'minecraft:purple_carpet', 'minecraft:blue_carpet',
    'minecraft:brown_carpet', 'minecraft:green_carpet', 'minecraft:red_carpet', 'minecraft:black_carpet',

    // Terracotta & concrete
    'minecraft:terracotta', 'minecraft:white_terracotta', 'minecraft:orange_terracotta', 'minecraft:magenta_terracotta',
    'minecraft:light_blue_terracotta', 'minecraft:yellow_terracotta', 'minecraft:lime_terracotta',
    'minecraft:pink_terracotta', 'minecraft:gray_terracotta', 'minecraft:light_gray_terracotta',
    'minecraft:cyan_terracotta', 'minecraft:purple_terracotta', 'minecraft:blue_terracotta',
    'minecraft:brown_terracotta', 'minecraft:green_terracotta', 'minecraft:red_terracotta',
    'minecraft:black_terracotta', 'minecraft:white_concrete', 'minecraft:orange_concrete', 'minecraft:magenta_concrete',
    'minecraft:light_blue_concrete', 'minecraft:yellow_concrete', 'minecraft:lime_concrete', 'minecraft:pink_concrete',
    'minecraft:gray_concrete', 'minecraft:light_gray_concrete', 'minecraft:cyan_concrete', 'minecraft:purple_concrete',
    'minecraft:blue_concrete', 'minecraft:brown_concrete', 'minecraft:green_concrete', 'minecraft:red_concrete',
    'minecraft:black_concrete',

    // Nether blocks
    'minecraft:netherrack', 'minecraft:nether_bricks', 'minecraft:cracked_nether_bricks', 'minecraft:chiseled_nether_bricks',
    'minecraft:red_nether_bricks', 'minecraft:nether_wart_block', 'minecraft:warped_wart_block', 'minecraft:shroomlight',
    'minecraft:soul_sand', 'minecraft:soul_soil', 'minecraft:basalt', 'minecraft:polished_basalt', 'minecraft:smooth_basalt',
    'minecraft:blackstone', 'minecraft:polished_blackstone', 'minecraft:chiseled_polished_blackstone',
    'minecraft:polished_blackstone_bricks', 'minecraft:cracked_polished_blackstone_bricks', 'minecraft:gilded_blackstone',

    // End blocks
    'minecraft:end_stone', 'minecraft:end_stone_bricks', 'minecraft:purpur_block', 'minecraft:purpur_pillar',
    'minecraft:end_rod',

    // Building blocks
    'minecraft:bricks', 'minecraft:chiseled_red_sandstone', 'minecraft:chiseled_sandstone', 'minecraft:chiseled_quartz_block',
    'minecraft:quartz_block', 'minecraft:quartz_bricks', 'minecraft:quartz_pillar', 'minecraft:smooth_quartz',
    'minecraft:prismarine', 'minecraft:prismarine_bricks', 'minecraft:dark_prismarine', 'minecraft:sea_lantern',
    'minecraft:sponge', 'minecraft:wet_sponge', 'minecraft:hay_block', 'minecraft:honey_block', 'minecraft:honeycomb_block',
    'minecraft:slime_block', 'minecraft:bone_block', 'minecraft:packed_ice', 'minecraft:blue_ice', 'minecraft:frosted_ice',
    'minecraft:obsidian', 'minecraft:crying_obsidian', 'minecraft:glowstone', 'minecraft:shroomlight',
    'minecraft:magma_block', 'minecraft:lodestone',

    // Natural blocks
    'minecraft:bedrock', 'minecraft:barrier', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:command_block',
    'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:light_block'
]);

// Item classification with priorities
const ITEM_CATEGORIES = {
    // HOTBAR ITEMS (NO BLOCKS ALLOWED HERE)
    // Slot 1 - Main weapon
    "minecraft:netherite_sword": { category: SORT_CATEGORIES.PRIMARY_WEAPON, subPriority: 1 },
    "minecraft:diamond_sword": { category: SORT_CATEGORIES.PRIMARY_WEAPON, subPriority: 2 },

    // Slot 2 - Secondary weapon
    "minecraft:netherite_axe": { category: SORT_CATEGORIES.SECONDARY_WEAPON, subPriority: 1 },
    "minecraft:diamond_axe": { category: SORT_CATEGORIES.SECONDARY_WEAPON, subPriority: 2 },

    // Slot 3 - Ranged
    "minecraft:bow": { category: SORT_CATEGORIES.RANGED, subPriority: 1 },
    "minecraft:crossbow": { category: SORT_CATEGORIES.RANGED, subPriority: 2 },

    // Slot 4 - Water bucket
    "minecraft:water_bucket": { category: SORT_CATEGORIES.WATER_BUCKET, subPriority: 1 },

    // Slot 5 - Golden apples (hotbar)
    "minecraft:golden_apple": { category: SORT_CATEGORIES.GAPPLES_HOTBAR, subPriority: 1 },
    "minecraft:enchanted_golden_apple": { category: SORT_CATEGORIES.GAPPLES_HOTBAR, subPriority: 2 },

    // Slot 6 - Pearls/Potions
    "minecraft:ender_pearl": { category: SORT_CATEGORIES.PEARLS_POTIONS, subPriority: 1 },
    "minecraft:potion": { category: SORT_CATEGORIES.PEARLS_POTIONS, subPriority: 2 },
    "minecraft:splash_potion": { category: SORT_CATEGORIES.PEARLS_POTIONS, subPriority: 3 },

    // Slot 7 - Shield/Totem/Utility
    "minecraft:shield": { category: SORT_CATEGORIES.SHIELD_TOTEM, subPriority: 1 },
    "minecraft:totem_of_undying": { category: SORT_CATEGORIES.SHIELD_TOTEM, subPriority: 2 },
    "minecraft:fishing_rod": { category: SORT_CATEGORIES.SHIELD_TOTEM, subPriority: 3 },

    // Slot 8-9 - Extra utility
    "minecraft:snowball": { category: SORT_CATEGORIES.EXTRA_HOTBAR, subPriority: 1 },
    "minecraft:egg": { category: SORT_CATEGORIES.EXTRA_HOTBAR, subPriority: 2 },

    // INVENTORY ITEMS
    // Armor
    "minecraft:netherite_helmet": { category: SORT_CATEGORIES.ARMOR, subPriority: 1 },
    "minecraft:netherite_chestplate": { category: SORT_CATEGORIES.ARMOR, subPriority: 2 },
    "minecraft:netherite_leggings": { category: SORT_CATEGORIES.ARMOR, subPriority: 3 },
    "minecraft:netherite_boots": { category: SORT_CATEGORIES.ARMOR, subPriority: 4 },
    "minecraft:diamond_helmet": { category: SORT_CATEGORIES.ARMOR, subPriority: 5 },
    "minecraft:diamond_chestplate": { category: SORT_CATEGORIES.ARMOR, subPriority: 6 },
    "minecraft:diamond_leggings": { category: SORT_CATEGORIES.ARMOR, subPriority: 7 },
    "minecraft:diamond_boots": { category: SORT_CATEGORIES.ARMOR, subPriority: 8 },
    "minecraft:elytra": { category: SORT_CATEGORIES.ARMOR, subPriority: 9 },

    // Food
    "minecraft:cooked_beef": { category: SORT_CATEGORIES.FOOD, subPriority: 1 },
    "minecraft:bread": { category: SORT_CATEGORIES.FOOD, subPriority: 2 },

    // Extra gapples
    "minecraft:golden_apple": { category: SORT_CATEGORIES.EXTRA_GAPPLES, subPriority: 1 },

    // Backup weapons
    "minecraft:iron_sword": { category: SORT_CATEGORIES.BACKUP_WEAPON, subPriority: 1 },

    // Arrows
    "minecraft:arrow": { category: SORT_CATEGORIES.ARROWS, subPriority: 1 },

    // Milk
    "minecraft:milk_bucket": { category: SORT_CATEGORIES.MILK_BUCKET, subPriority: 1 },

    // Extra buckets
    "minecraft:lava_bucket": { category: SORT_CATEGORIES.EXTRA_BUCKETS, subPriority: 1 },

    // Replacement armor
    "minecraft:iron_helmet": { category: SORT_CATEGORIES.REPLACEMENT_ARMOR, subPriority: 1 },

    // Totems
    "minecraft:totem_of_undying": { category: SORT_CATEGORIES.TOTEMS, subPriority: 1 },

    // Offensive items
    "minecraft:flint_and_steel": { category: SORT_CATEGORIES.OFFENSIVE_ITEMS, subPriority: 1 },

    // Specialty items
    "minecraft:shears": { category: SORT_CATEGORIES.SPECIALTY, subPriority: 1 },
    "minecraft:cobweb": { category: SORT_CATEGORIES.SPECIALTY, subPriority: 2 },
    "minecraft:pickaxe": { category: SORT_CATEGORIES.SPECIALTY, subPriority: 3 }
};

// PvP-optimized slot mapping - NO BLOCKS IN HOTBAR
const SLOT_MAPPING = {
    // HOTBAR (0-8) - Active combat tools ONLY
    [SORT_CATEGORIES.PRIMARY_WEAPON]: [0],     // Slot 1 - Main weapon
    [SORT_CATEGORIES.SECONDARY_WEAPON]: [1],   // Slot 2 - Secondary weapon
    [SORT_CATEGORIES.RANGED]: [2],             // Slot 3 - Bow/Crossbow
    [SORT_CATEGORIES.WATER_BUCKET]: [3],       // Slot 4 - Water bucket
    [SORT_CATEGORIES.GAPPLES_HOTBAR]: [4],     // Slot 5 - Golden apples
    [SORT_CATEGORIES.PEARLS_POTIONS]: [5],     // Slot 6 - Pearls/Potions
    [SORT_CATEGORIES.SHIELD_TOTEM]: [6],       // Slot 7 - Shield/Totem/Utility
    [SORT_CATEGORIES.EXTRA_HOTBAR]: [7, 8],    // Slot 8-9 - Extra utility

    // INVENTORY - Blocks go here
    [SORT_CATEGORIES.BLOCKS]: [9, 10, 11, 12, 13, 14, 15, 16, 17], // Top row - ALL BLOCKS
    [SORT_CATEGORIES.FOOD]: [18, 19],          // Food
    [SORT_CATEGORIES.EXTRA_GAPPLES]: [20, 21], // Extra golden apples
    [SORT_CATEGORIES.BACKUP_WEAPON]: [22],     // Backup weapon
    [SORT_CATEGORIES.SPLASH_POTIONS]: [23],    // Splash potions
    [SORT_CATEGORIES.ARROWS]: [24],            // Arrows
    [SORT_CATEGORIES.MILK_BUCKET]: [25],       // Milk bucket
    [SORT_CATEGORIES.EXTRA_BUCKETS]: [26],     // Extra water/lava buckets
    [SORT_CATEGORIES.REPLACEMENT_ARMOR]: [27, 28], // Replacement armor
    [SORT_CATEGORIES.TOTEMS]: [29, 30],        // Totems of undying
    [SORT_CATEGORIES.OFFENSIVE_ITEMS]: [31, 32], // Flint & steel, lava, TNT
    [SORT_CATEGORIES.SPECIALTY]: [33, 34],     // Shears, cobwebs, tools
    [SORT_CATEGORIES.ARMOR]: [35]              // Main armor pieces
};

class AutoSortSystem {
    static isBlock(itemTypeId) {
        // Check if item is in our comprehensive block list
        return BLOCK_ITEMS.has(itemTypeId) ||
            itemTypeId.includes('_block') ||
            itemTypeId.includes('_bricks') ||
            itemTypeId.includes('_planks') ||
            itemTypeId.includes('_log') ||
            itemTypeId.includes('_ore') ||
            itemTypeId.includes('_stone') ||
            itemTypeId.includes('_terracotta') ||
            itemTypeId.includes('_concrete') ||
            itemTypeId.includes('_wool') ||
            itemTypeId.includes('_glass') ||
            itemTypeId.includes('_sand') ||
            itemTypeId.includes('_dirt') ||
            itemTypeId.includes('_gravel') ||
            itemTypeId.includes('_clay');
    }

    static getItemCategory(itemTypeId, itemStack) {
        // FORCE ALL BLOCKS TO INVENTORY
        if (this.isBlock(itemTypeId)) {
            return { category: SORT_CATEGORIES.BLOCKS, subPriority: 999 };
        }

        // Check for weapon tags first (for custom weapons)
        if (itemStack && itemStack.hasTag) {
            try {
                if (itemStack.hasTag('minecraft:is_sword')) {
                    return { category: SORT_CATEGORIES.PRIMARY_WEAPON, subPriority: 1 };
                }
                if (itemStack.hasTag('minecraft:is_axe')) {
                    return { category: SORT_CATEGORIES.SECONDARY_WEAPON, subPriority: 1 };
                }
                if (itemStack.hasTag('minecraft:is_bow')) {
                    return { category: SORT_CATEGORIES.RANGED, subPriority: 1 };
                }
                if (itemStack.hasTag('minecraft:is_pickaxe')) {
                    return { category: SORT_CATEGORIES.SPECIALTY, subPriority: 3 };
                }
            } catch (e) {
                // Fall back to typeId if tag check fails
            }
        }

        // Check for exact matches first
        if (ITEM_CATEGORIES[itemTypeId]) {
            return ITEM_CATEGORIES[itemTypeId];
        }

        // Check for partial matches
        for (const [pattern, category] of Object.entries(ITEM_CATEGORIES)) {
            if (itemTypeId.includes(pattern.replace('minecraft:', ''))) {
                return category;
            }
        }

        // Smart categorization by item type
        if (itemTypeId.includes('sword')) return { category: SORT_CATEGORIES.PRIMARY_WEAPON, subPriority: 10 };
        if (itemTypeId.includes('axe')) return { category: SORT_CATEGORIES.SECONDARY_WEAPON, subPriority: 10 };
        if (itemTypeId.includes('bow') || itemTypeId.includes('crossbow')) return { category: SORT_CATEGORIES.RANGED, subPriority: 10 };
        if (itemTypeId.includes('bucket') && !itemTypeId.includes('milk')) return { category: SORT_CATEGORIES.WATER_BUCKET, subPriority: 10 };
        if (itemTypeId.includes('golden_apple')) return { category: SORT_CATEGORIES.GAPPLES_HOTBAR, subPriority: 10 };
        if (itemTypeId.includes('ender_pearl')) return { category: SORT_CATEGORIES.PEARLS_POTIONS, subPriority: 10 };
        if (itemTypeId.includes('potion')) return { category: SORT_CATEGORIES.PEARLS_POTIONS, subPriority: 20 };
        if (itemTypeId.includes('shield') || itemTypeId.includes('totem')) return { category: SORT_CATEGORIES.SHIELD_TOTEM, subPriority: 10 };
        if (itemTypeId.includes('helmet') || itemTypeId.includes('chestplate') || itemTypeId.includes('leggings') || itemTypeId.includes('boots') || itemTypeId.includes('elytra')) {
            return { category: SORT_CATEGORIES.ARMOR, subPriority: 10 };
        }
        if (itemTypeId.includes('cooked') || itemTypeId.includes('bread') || itemTypeId.includes('steak')) return { category: SORT_CATEGORIES.FOOD, subPriority: 10 };
        if (itemTypeId.includes('arrow')) return { category: SORT_CATEGORIES.ARROWS, subPriority: 10 };
        if (itemTypeId.includes('milk_bucket')) return { category: SORT_CATEGORIES.MILK_BUCKET, subPriority: 10 };
        if (itemTypeId.includes('flint_and_steel') || itemTypeId.includes('tnt')) return { category: SORT_CATEGORIES.OFFENSIVE_ITEMS, subPriority: 10 };
        if (itemTypeId.includes('shears') || itemTypeId.includes('cobweb') || itemTypeId.includes('pickaxe') || itemTypeId.includes('shovel') || itemTypeId.includes('hoe')) {
            return { category: SORT_CATEGORIES.SPECIALTY, subPriority: 10 };
        }

        // Default to MISC
        return { category: SORT_CATEGORIES.MISC, subPriority: 999 };
    }

    static sortItems(items) {
        return items.sort((a, b) => {
            const catA = this.getItemCategory(a.typeId, a.data);
            const catB = this.getItemCategory(b.typeId, b.data);

            // Sort by main category first
            if (catA.category !== catB.category) {
                return catA.category - catB.category;
            }

            // Then by sub-priority
            if (catA.subPriority !== catB.subPriority) {
                return catA.subPriority - catB.subPriority;
            }

            // Then by item name for consistency
            return a.typeId.localeCompare(b.typeId);
        });
    }

    static autoSortInventory(player) {
        try {
            const inventory = player.getComponent('minecraft:inventory');
            if (!inventory || !inventory.container) {
                player.sendMessage('§cCould not access your inventory.');
                return false;
            }

            const container = inventory.container;
            const totalSlots = container.size;

            // Create backup of ALL items
            const allItems = [];
            for (let i = 0; i < totalSlots; i++) {
                const item = container.getItem(i);
                if (item) {
                    allItems.push({
                        originalSlot: i,
                        typeId: item.typeId,
                        amount: item.amount,
                        data: item
                    });
                }
            }

            if (allItems.length === 0) {
                player.sendMessage('§7Inventory is already empty.');
                return true;
            }

            // Sort items by category
            const sortedItems = this.sortItems(allItems);

            // Clear inventory for reorganization
            for (let i = 0; i < totalSlots; i++) {
                container.setItem(i, undefined);
            }

            // Track placed items and available slots
            const placedItems = [];
            let placedCount = 0;

            // Place items in their designated PvP slots
            for (const category of Object.keys(SLOT_MAPPING)) {
                const categoryItems = sortedItems.filter(item => {
                    const itemCategory = this.getItemCategory(item.typeId, item.data);
                    return itemCategory.category.toString() === category && !placedItems.includes(item);
                });

                const targetSlots = SLOT_MAPPING[category];

                for (let i = 0; i < Math.min(categoryItems.length, targetSlots.length); i++) {
                    container.setItem(targetSlots[i], categoryItems[i].data);
                    placedItems.push(categoryItems[i]);
                    placedCount++;
                }
            }

            // Place any remaining items in empty slots
            const remainingItems = sortedItems.filter(item => !placedItems.includes(item));
            const emptySlots = [];
            for (let i = 0; i < totalSlots; i++) {
                if (!container.getItem(i)) {
                    emptySlots.push(i);
                }
            }

            for (let i = 0; i < Math.min(remainingItems.length, emptySlots.length); i++) {
                container.setItem(emptySlots[i], remainingItems[i].data);
                placedCount++;
            }

            // Safety fallback - restore any unplaced items
            const unplacedItems = sortedItems.filter(item =>
                !placedItems.includes(item) && !remainingItems.slice(0, emptySlots.length).includes(item)
            );

            if (unplacedItems.length > 0) {
                for (const item of unplacedItems) {
                    container.setItem(item.originalSlot, item.data);
                    placedCount++;
                }
            }

            player.sendMessage(`§aInventory sorted for PvP! §7(${placedCount} items organized)`);
            return true;

        } catch (error) {
            console.error('Auto-sort error:', error);
            player.sendMessage('§cError occurred while sorting inventory.');
            return false;
        }
    }
}

// Register the command
system.beforeEvents.startup.subscribe((init) => {
    const autosortCmd = {
        name: "bf:autosort",
        description: "Automatically sorts your inventory for PvP",
        permissionLevel: 0,
        cheatsRequired: false
    };

    init.customCommandRegistry.registerCommand(autosortCmd, autosortHandler);
});

function autosortHandler(origin) {
    const player = origin.sourceEntity;
    if (!player) {
        return { status: 1, message: "This command can only be run by a player." };
    }

    const autoSortEnabled = world.getDynamicProperty("auto_sort");
    if (!autoSortEnabled) {
        return { status: 1, message: "Auto-sort command is disabled in the config." };
    }

    system.run(() => {
        AutoSortSystem.autoSortInventory(player);
    });

    return { status: 0, message: "Sorting inventory for PvP..." };
}

world.afterEvents.worldLoad.subscribe(() => {
    system.runTimeout(() => {
        const autoSortEnabled = world.getDynamicProperty("auto_sort");
        if (autoSortEnabled) {
            world.sendMessage('§7Use §f/bf:autosort §7to sort your inventory!');
        }
    }, 100);
});
/**
* How to add custom items:
*  {
typeId: "ITEM NAME",
extraDamage: 8, //DAMAGE
},
*	add this in the array below if your having trouble ask me i can help 
*  discord: lavazoid123
*/

const items = [
    // Axes
    { typeId: "bf:wooden_axe", extraDamage: 8 },
    { typeId: "bf:stone_axe", extraDamage: 10 },
    { typeId: "bf:iron_axe", extraDamage: 10 },
    { typeId: "bf:copper_axe", extraDamage: 8 },
    { typeId: "bf:golden_axe", extraDamage: 8 },
    { typeId: "bf:diamond_axe", extraDamage: 10 },
    { typeId: "bf:netherite_axe", extraDamage: 11 },

    // Swords
    { typeId: "bf:wooden_sword", extraDamage: 5 },
    { typeId: "bf:stone_sword", extraDamage: 6 },
    { typeId: "bf:iron_sword", extraDamage: 7 },
    { typeId: "bf:copper_sword", extraDamage: 6 },
    { typeId: "bf:golden_sword", extraDamage: 5 },
    { typeId: "bf:diamond_sword", extraDamage: 8 },
    { typeId: "bf:netherite_sword", extraDamage: 9 },

    // Mace
    { typeId: "minecraft:mace", extraDamage: 1 },

    // Pickaxes
    { typeId: "minecraft:wooden_pickaxe", extraDamage: 2 },
    { typeId: "minecraft:stone_pickaxe", extraDamage: 2 },
    { typeId: "minecraft:iron_pickaxe", extraDamage: 3 },
    { typeId: "minecraft:golden_pickaxe", extraDamage: 2 },
    { typeId: "minecraft:diamond_pickaxe", extraDamage: 5 },
    { typeId: "minecraft:netherite_pickaxe", extraDamage: 6 },

    // Shovels
    { typeId: "minecraft:wooden_shovel", extraDamage: 2 },
    { typeId: "minecraft:stone_shovel", extraDamage: 3 },
    { typeId: "minecraft:iron_shovel", extraDamage: 4 },
    { typeId: "minecraft:golden_shovel", extraDamage: 2 },
    { typeId: "minecraft:diamond_shovel", extraDamage: 5 },
    { typeId: "minecraft:netherite_shovel", extraDamage: 6 },

    // Hoes
    { typeId: "minecraft:wooden_hoe", extraDamage: 1 },
    { typeId: "minecraft:stone_hoe", extraDamage: 2 },
    { typeId: "minecraft:iron_hoe", extraDamage: 3 },
    { typeId: "minecraft:golden_hoe", extraDamage: 1 },
    { typeId: "minecraft:diamond_hoe", extraDamage: 4 },
    { typeId: "minecraft:netherite_hoe", extraDamage: 5 }
];

export {
    items
}
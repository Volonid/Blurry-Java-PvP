import { world, system, EquipmentSlot, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";

// Items that can be swapped to offhand (weapons/tools)
const SWAPPABLE_ITEM_IDS = [
  "bf:wooden_axe", "bf:wooden_sword", "bf:stone_axe", "bf:stone_sword",
  "bf:iron_axe", "bf:iron_sword", "bf:golden_axe", "bf:golden_sword",
  "bf:diamond_axe", "bf:diamond_sword", "bf:netherite_axe", "bf:netherite_sword",
  "bf:copper_sword", "bf:copper_axe",
];


// Foods that can be swapped to offhand (for eating)
const SWAPPABLE_FOOD_IDS = [
  "minecraft:apple",
  "minecraft:baked_potato",
  "minecraft:beetroot",
  "minecraft:beetroot_soup",
  "minecraft:bread",
  "minecraft:carrot",
  "minecraft:chorus_fruit",
  "minecraft:cooked_chicken",
  "minecraft:cooked_cod",
  "minecraft:cooked_mutton",
  "minecraft:cooked_porkchop",
  "minecraft:cooked_rabbit",
  "minecraft:cooked_salmon",
  "minecraft:cookie",
  "minecraft:dried_kelp",
  "minecraft:enchanted_golden_apple",
  "bf:golden_apple",
  "minecraft:glow_berries",
  "minecraft:golden_carrot",
  "minecraft:honey_bottle",
  "minecraft:melon_slice",
  "minecraft:mushroom_stew",
  "minecraft:poisonous_potato",
  "minecraft:potato",
  "minecraft:pumpkin_pie",
  "minecraft:rabbit_stew",
  "minecraft:beef",
  "minecraft:chicken",
  "minecraft:cod",
  "minecraft:mutton",
  "minecraft:porkchop",
  "minecraft:rabbit",
  "minecraft:salmon",
  "minecraft:rotten_flesh",
  "minecraft:spider_eye",
  "minecraft:cooked_beef",
  "minecraft:suspicious_stew",
  "minecraft:sweet_berries",
  "minecraft:tropical_fish",
  "minecraft:pufferfish",
];

const SWAPPABLE_FOOD_IDS2 = [
  "bf:apple_offhand",
  "bf:baked_potato_offhand",
  "bf:beetroot_offhand",
  "bf:beetroot_soup_offhand",
  "bf:bread_offhand",
  "bf:carrot_offhand",
  "bf:chorus_fruit_offhand",
  "bf:cooked_chicken_offhand",
  "bf:cooked_cod_offhand",
  "bf:cooked_mutton_offhand",
  "bf:cooked_porkchop_offhand",
  "bf:cooked_rabbit_offhand",
  "bf:cooked_salmon_offhand",
  "bf:cookie_offhand",
  "bf:dried_kelp_offhand",
  "bf:enchanted_golden_apple_offhand",
  "bf:golden_apple_offhand",
  "bf:glow_berries_offhand",
  "bf:golden_carrot_offhand",
  "bf:honey_bottle_offhand",
  "bf:melon_slice_offhand",
  "bf:mushroom_stew_offhand",
  "bf:poisonous_potato_offhand",
  "bf:potato_offhand",
  "bf:pumpkin_pie_offhand",
  "bf:rabbit_stew_offhand",
  "bf:beef_offhand",
  "bf:chicken_offhand",
  "bf:cod_offhand",
  "bf:mutton_offhand",
  "bf:porkchop_offhand",
  "bf:rabbit_offhand",
  "bf:salmon_offhand",
  "bf:rotten_flesh_offhand",
  "bf:spider_eye_offhand",
  "bf:cooked_beef_offhand",
  "bf:suspicious_stew_offhand",
  "bf:sweet_berries_offhand",
  "bf:tropical_fish_offhand",
  "bf:pufferfish_offhand",
];

// Items (non-food) that can be swapped to offhand using the food system
const SWAPPABLE_EXTRA_IDS = [
  "minecraft:totem_of_undying",
  "rad:tnt_minecart",
  "minecraft:shield",
  "minecraft:stick",
  "minecraft:string",
  "minecraft:feather",
  "minecraft:flint",
  "minecraft:coal",
  "minecraft:charcoal",
  "minecraft:diamond",
  "minecraft:emerald",
  "minecraft:netherite_scrap",
  "minecraft:netherite_ingot",
  "minecraft:iron_ingot",
  "minecraft:gold_ingot",
  "minecraft:copper_ingot",
  "minecraft:quartz",
  "minecraft:lapis_lazuli",
  "minecraft:redstone",
  "minecraft:clay_ball",
  "minecraft:brick",
  "minecraft:paper",
  "minecraft:book",
  "minecraft:glowstone_dust",
  "minecraft:blaze_powder",
  "minecraft:magma_cream",
  "minecraft:ghast_tear",
  "minecraft:phantom_membrane",
  "minecraft:prismarine_shard",
  "minecraft:prismarine_crystals",
  "minecraft:slime_ball",
  "minecraft:egg",
  "minecraft:snowball",
  "minecraft:bone",
  "minecraft:amethyst_shard",
  "minecraft:nether_star",
  "minecraft:chorus_fruit_popped",
  "minecraft:chorus_flower",
  "minecraft:glow_ink_sac",
  "minecraft:ink_sac",
  "minecraft:gunpowder",
  "minecraft:leather",
  "minecraft:rabbit_hide",
  "minecraft:shulker_shell",
  "minecraft:scute"
];

const food = {
  "apple": { hunger: 4, saturation: 2.4, canEatAtFull: true },
  "baked_potato": { hunger: 5, saturation: 6, canEatAtFull: false },
  "beetroot": { hunger: 1, saturation: 1, canEatAtFull: false },
  "beetroot_soup": { hunger: 6, saturation: 7.2, canEatAtFull: false },
  "bread": { hunger: 5, saturation: 6, canEatAtFull: false },
  "cake": { hunger: 2, saturation: 0.4, canEatAtFull: false },
  "carrot": { hunger: 3, saturation: 3.6, canEatAtFull: false },
  "chorus_fruit": { hunger: 4, saturation: 2.4, canEatAtFull: true },
  "cooked_chicken": { hunger: 6, saturation: 7.2, canEatAtFull: false },
  "cooked_cod": { hunger: 5, saturation: 6, canEatAtFull: false },
  "cooked_mutton": { hunger: 6, saturation: 9.6, canEatAtFull: false },
  "cooked_porkchop": { hunger: 8, saturation: 12.8, canEatAtFull: false },
  "cooked_rabbit": { hunger: 5, saturation: 6, canEatAtFull: false },
  "cooked_salmon": { hunger: 6, saturation: 9.6, canEatAtFull: false },
  "cookie": { hunger: 2, saturation: 0.4, canEatAtFull: false },
  "dried_kelp": { hunger: 1, saturation: 0.2, canEatAtFull: false },
  "enchanted_golden_apple": {
    hunger: 4, saturation: 9.6, canEatAtFull: true, effects: [
      { effect: "regeneration", duration: 400, amplifier: 1 },
      { effect: "absorption", duration: 2400, amplifier: 3 },
      { effect: "resistance", duration: 6000, amplifier: 0 },
      { effect: "fire_resistance", duration: 6000, amplifier: 0 }
    ]
  },
  "golden_apple": {
    hunger: 4, saturation: 9.6, canEatAtFull: true, effects: [
      { effect: "regeneration", duration: 100, amplifier: 1 },
      { effect: "absorption", duration: 0, amplifier: 0, clear: true },
      { effect: "absorption", duration: 2400, amplifier: 0 }
    ]
  },
  "glow_berries": { hunger: 2, saturation: 0.4, canEatAtFull: false },
  "golden_carrot": { hunger: 6, saturation: 14.4, canEatAtFull: false },
  "honey_bottle": {
    hunger: 6, saturation: 1.2, canEatAtFull: true, effects: [
      { effect: "poison", duration: 0, amplifier: 0, clear: true }
    ]
  },
  "melon_slice": { hunger: 2, saturation: 1.2, canEatAtFull: false },
  "mushroom_stew": { hunger: 6, saturation: 7.2, canEatAtFull: false },
  "poisonous_potato": {
    hunger: 2, saturation: 1.2, canEatAtFull: false, effects: [
      { effect: "poison", duration: 100, amplifier: 0, chance: 0.6 }
    ]
  },
  "potato": { hunger: 1, saturation: 0.6, canEatAtFull: false },
  "pufferfish": {
    hunger: 1, saturation: 0.2, canEatAtFull: true, effects: [
      { effect: "poison", duration: 1200, amplifier: 3 },
      { effect: "hunger", duration: 300, amplifier: 2 },
      { effect: "nausea", duration: 300, amplifier: 0 }
    ]
  },
  "pumpkin_pie": { hunger: 8, saturation: 4.8, canEatAtFull: false },
  "rabbit_stew": { hunger: 10, saturation: 12, canEatAtFull: false },
  "beef": { hunger: 3, saturation: 1.8, canEatAtFull: false },
  "chicken": {
    hunger: 2, saturation: 1.2, canEatAtFull: false, effects: [
      { effect: "hunger", duration: 600, amplifier: 0, chance: 0.3 }
    ]
  },
  "cod": { hunger: 2, saturation: 0.4, canEatAtFull: false },
  "mutton": { hunger: 2, saturation: 1.2, canEatAtFull: false },
  "porkchop": { hunger: 3, saturation: 1.8, canEatAtFull: false },
  "rabbit": { hunger: 3, saturation: 1.8, canEatAtFull: false },
  "salmon": { hunger: 2, saturation: 0.4, canEatAtFull: false },
  "rotten_flesh": {
    hunger: 4, saturation: 0.8, canEatAtFull: false, effects: [
      { effect: "hunger", duration: 600, amplifier: 0, chance: 0.8 }
    ]
  },
  "spider_eye": {
    hunger: 2, saturation: 3.2, canEatAtFull: false, effects: [
      { effect: "poison", duration: 100, amplifier: 0 }
    ]
  },
  "cooked_beef": { hunger: 8, saturation: 12.8, canEatAtFull: false },
  "suspicious_stew": { hunger: 6, saturation: 7.2, canEatAtFull: true },
  "sweet_berries": { hunger: 2, saturation: 1.2, canEatAtFull: false },
  "tropical_fish": { hunger: 1, saturation: 0.2, canEatAtFull: false }
};

const crouchData = new Map(); // playerId -> { times: number[], lastState: boolean }
const DETECTION_WINDOW = 40; // 3 seconds in ticks
const SNEAK_SWAP_THRESHOLD = 2;
const SNEAK_SWAP_THRESHOLD_5 = 5;
const pendingSwapPlayers = new Set();

system.runInterval(() => {
  if (world.getDynamicProperty("offhand_food") === false) return;
  const now = system.currentTick;
  for (const player of world.getPlayers()) {
    const id = player.id;
    let data = crouchData.get(id);
    if (!data) {
      data = { times: [], lastState: player.isSneaking };
      crouchData.set(id, data);
    }
    const isCurrentlySneaking = player.isSneaking;
    // Detect a crouch "toggle" (went from not sneaking to sneaking)
    if (isCurrentlySneaking && !data.lastState) {
      data.times.push(now);
      // Clean old crouch timestamps
      data.times = data.times.filter((t) => now - t <= DETECTION_WINDOW);
      const offhandSwapMode = player.getDynamicProperty("offhand_swap");
      // 2x Sneak
      if (offhandSwapMode === 0 && data.times.length >= SNEAK_SWAP_THRESHOLD) {
        swapOffhand(player);
        data.times = [];
      }
      // 5x Sneak
      if (offhandSwapMode === 1 && data.times.length >= SNEAK_SWAP_THRESHOLD_5) {
        swapOffhand(player);
        data.times = [];
      }
    }
    // Emote (mode 2) handled by emote event below
    // None (mode 3) disables swap
    data.lastState = isCurrentlySneaking;

    if (pendingSwapPlayers.has(player.id)) {
      const inventory = player.getComponent("minecraft:inventory").container;
      const equippable = player.getComponent("minecraft:equippable");
      const slot = player.selectedSlotIndex;
      const mainHand = inventory.getItem(slot);
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand);


      // If mainHand is empty and offhand is swappable, move offhand to main hand
      if (!mainHand && offhand && (SWAPPABLE_EXTRA_IDS.includes(offhand.typeId) || offhand.hasTag("bf:shield") || SWAPPABLE_FOOD_IDS.includes(offhand.typeId) || SWAPPABLE_FOOD_IDS2.includes(offhand.typeId))) {
        player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
        inventory.setItem(slot, offhand);
        player.playSound("armor.equip_generic");
        pendingSwapPlayers.delete(player.id);
        continue;
      }

      // If mainHand is swappable food or extra, move it to offhand
      if (mainHand && (SWAPPABLE_EXTRA_IDS.includes(mainHand.typeId) || mainHand.hasTag("bf:shield") || SWAPPABLE_FOOD_IDS.includes(mainHand.typeId) || SWAPPABLE_FOOD_IDS2.includes(mainHand.typeId))) {
        let swapType = mainHand.typeId;
        // For food, use bf:<name>_offhand if in SWAPPABLE_FOOD_IDS
        if (SWAPPABLE_FOOD_IDS.includes(mainHand.typeId)) {
          const foodName = mainHand.typeId.split(":").pop();
          const offhandId = `bf:${foodName}_offhand`;
          swapType = offhandId;
        }
        // Shields and extras: direct swap
        if (swapType === "minecraft:shield" || swapType === "bf:shield" || SWAPPABLE_EXTRA_IDS.includes(mainHand.typeId)) {
          equippable.setEquipment(EquipmentSlot.Offhand, mainHand);
        } else {
          player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${swapType} ${mainHand.amount}`);
        }
        if (offhand) {
          inventory.setItem(slot, offhand);
        } else {
          inventory.setItem(slot, undefined);
        }
        player.playSound("armor.equip_generic");
        pendingSwapPlayers.delete(player.id);
        continue;
      }

      // If offhand is swappable and mainHand is empty, move offhand to main hand
      if (!mainHand && offhand && (SWAPPABLE_EXTRA_IDS.includes(offhand.typeId) || offhand.hasTag("bf:shield") || SWAPPABLE_FOOD_IDS.includes(offhand.typeId) || SWAPPABLE_FOOD_IDS2.includes(offhand.typeId))) {
        player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
        inventory.setItem(slot, offhand);
        player.playSound("armor.equip_generic");
        pendingSwapPlayers.delete(player.id);
        continue;
      }

      pendingSwapPlayers.delete(player.id);
    }
    pendingSwapPlayers.delete(player.id);
  }
}, 2); // Check every tick

// Emote-based swap (mode 2)
world.afterEvents.playerEmote.subscribe((event) => {
  if (world.getDynamicProperty("offhand_food") === false) return;
  const player = event.player;
  if (!player) return;
  const offhandSwapMode = player.getDynamicProperty("offhand_swap");
  if (offhandSwapMode === 2) {
    // Emote swap cooldown (2 seconds = 40 ticks)
    const lastEmoteSwap = player.getDynamicProperty("lastEmoteSwap") ?? 0;
    const now = system.currentTick;
    if (now - lastEmoteSwap < 40) return;
    player.setDynamicProperty("lastEmoteSwap", now);
    swapOffhand(player);
  }
});

function swapOffhand(player) {
  if (world.getDynamicProperty("offhand_food") === false) return;
  const inventory = player.getComponent("minecraft:inventory").container;
  const equippable = player.getComponent("minecraft:equippable");
  const slot = player.selectedSlotIndex;
  const mainHand = inventory.getItem(slot);
  const offhand = equippable.getEquipment(EquipmentSlot.Offhand);


  // If mainHand is empty and offhand is swappable, move offhand to main hand
  if (!mainHand && offhand && (SWAPPABLE_EXTRA_IDS.includes(offhand.typeId) || offhand.hasTag("bf:shield") || SWAPPABLE_FOOD_IDS.includes(offhand.typeId) || SWAPPABLE_FOOD_IDS2.includes(offhand.typeId))) {
    player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
    inventory.setItem(slot, offhand);
    player.playSound("armor.equip_generic");
    pendingSwapPlayers.delete(player.id);
    return;
  }

  // If mainHand is swappable food or extra, move it to offhand
  if (mainHand && (SWAPPABLE_EXTRA_IDS.includes(mainHand.typeId) || mainHand.hasTag("bf:shield") || SWAPPABLE_FOOD_IDS.includes(mainHand.typeId) || SWAPPABLE_FOOD_IDS2.includes(mainHand.typeId))) {
    let swapType = mainHand.typeId;
    // For food, use bf:<name>_offhand if in SWAPPABLE_FOOD_IDS
    if (SWAPPABLE_FOOD_IDS.includes(mainHand.typeId)) {
      const foodName = mainHand.typeId.split(":").pop();
      const offhandId = `bf:${foodName}_offhand`;
      swapType = offhandId;
    }
    // Shields and extras: direct swap
    if (swapType === "minecraft:shield" || swapType === "bf:shield" || SWAPPABLE_EXTRA_IDS.includes(mainHand.typeId)) {
      equippable.setEquipment(EquipmentSlot.Offhand, mainHand);
    } else {
      player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${swapType} ${mainHand.amount}`);
    }
    if (offhand) {
      inventory.setItem(slot, offhand);
    } else {
      inventory.setItem(slot, undefined);
    }
    player.playSound("armor.equip_generic");
    pendingSwapPlayers.delete(player.id);
    return;
  }

  // If offhand is swappable and mainHand is empty, move offhand to main hand
  if (!mainHand && offhand && (SWAPPABLE_EXTRA_IDS.includes(offhand.typeId) || offhand.hasTag("bf:shield") || SWAPPABLE_FOOD_IDS.includes(offhand.typeId) || SWAPPABLE_FOOD_IDS2.includes(offhand.typeId))) {
    player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
    inventory.setItem(slot, offhand);
    player.playSound("armor.equip_generic");
    pendingSwapPlayers.delete(player.id);
    return;
  }
}

system.beforeEvents.startup.subscribe((init) => {
  // No enums defined

  const swapCmd = {
    name: "bf:swap",
    description: "swaps the mainHand item with the offHand item",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false
  };

  init.customCommandRegistry.registerCommand(swapCmd, swapHandler);
});

function swapHandler(origin) {
  if (world.getDynamicProperty("offhand_food") === false) return;
  const player = origin.sourceEntity;
  if (!player) {
    return { status: CustomCommandStatus.Fail, message: "This command can only be run by a player." };
  }
  pendingSwapPlayers.add(player.id); // Add player to pending swaps
  return { status: CustomCommandStatus.Success, message: "Swapping items..." };
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (world.getDynamicProperty("offhand_food") === false) return;
  const { id, sourceEntity } = event;
  if (id === "bf:attack") {
    if (sourceEntity?.typeId === "minecraft:player") {
      if (!globalThis._swappedPlayers || !globalThis._swappedPlayers.has(sourceEntity.id)) return;
      const inventory = sourceEntity.getComponent("minecraft:inventory")?.container;
      const equippable = sourceEntity.getComponent("minecraft:equippable");
      if (!inventory || !equippable) return;
      const slot = sourceEntity.selectedSlotIndex;
      const mainHand = inventory.getItem(slot);
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
      // Only swap back if both items exist and amounts are valid
      if (mainHand && offhand && mainHand.amount > 0 && offhand.amount > 0) {
        inventory.setItem(slot, offhand);
        equippable.setEquipment(EquipmentSlot.Offhand, mainHand);
      } else if (mainHand && !offhand && mainHand.amount > 0) {
        inventory.setItem(slot, mainHand);
        equippable.setEquipment(EquipmentSlot.Offhand, undefined);
      } else if (!mainHand && offhand && offhand.amount > 0) {
        inventory.setItem(slot, offhand);
        equippable.setEquipment(EquipmentSlot.Offhand, undefined);
      }
      globalThis._swappedPlayers.delete(sourceEntity.id);
    }
  }
});


const use = {};

world.afterEvents.itemStartUse.subscribe(({ itemStack, source }) => {
  if (world.getDynamicProperty("offhand_food") === false) return;
  if (SWAPPABLE_ITEM_IDS.includes(itemStack.typeId)) use[source.id] = true;
});

world.afterEvents.itemStopUse.subscribe(({ source, itemStack }) => {
  if (world.getDynamicProperty("offhand_food") === false) return;
  use[source.id] = false;
});

const OFFHAND_EAT_START_DELAY = 5;
const OFFHAND_EAT_ITEM_DELAY = 5;
const offhandEatState = new Map(); // playerId -> { startTick, itemType, lastEatSoundTick, finishedTick }

system.runInterval(() => {
  if (world.getDynamicProperty("offhand_food") === false) return;
  const now = system.currentTick;
  for (const player of world.getPlayers()) {
    if (!player?.hasComponent("minecraft:equippable")) continue;
    const equippable = player.getComponent("minecraft:equippable");
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
    if (!offhand || !SWAPPABLE_FOOD_IDS2.includes(offhand.typeId)) {
      offhandEatState.delete(player.id);
      continue;
    }
    // Use the 'use' system for holding interact
    let state = offhandEatState.get(player.id);
    const foodKey = offhand.typeId.split(":").pop().replace("_offhand", "");
    const foodData = food[foodKey];
    const hunger = player.getHunger() ?? 20;
    if (foodData && (foodData.canEatAtFull || hunger < 20)) {
      if (player.getProperty("bf:can_eat") != undefined) {
        player.setProperty("bf:can_eat", 1);
      }
    } else {
      if (player.getProperty("bf:can_eat") != undefined) {
        player.setProperty("bf:can_eat", 0);
      }
    }
    // Only start eating if allowed (not full, or canEatAtFull)
    if (use[player.id] && (!state || state.itemType !== offhand.typeId)) {
      if (foodData && (foodData.canEatAtFull || hunger < 20)) {
        // Start eating
        offhandEatState.set(player.id, { startTick: now, itemType: offhand.typeId, lastEatSoundTick: now, finishedTick: null });
        state = offhandEatState.get(player.id); // update state reference
      } else {
        offhandEatState.delete(player.id);
        continue;
      }
    }
    if (use[player.id] && state) {
      // If just finished eating, block sound for 10 ticks
      if (state.finishedTick && now - state.finishedTick < OFFHAND_EAT_ITEM_DELAY) {
        // End after cooldown
        if (now - state.finishedTick >= OFFHAND_EAT_ITEM_DELAY - 1) {
          offhandEatState.delete(player.id);
        }
        continue;
      }
      // Only play eating sound after initial delay and if not finished
      if (!state.finishedTick && now - state.startTick >= OFFHAND_EAT_START_DELAY && now - state.lastEatSoundTick >= 4) {
        let foodName = foodKey.split(":").pop().replace("_offhand", "");
        if (foodName === "rotten_flesh") {
          foodName = "rotten_flesh2"
        }
        player.runCommand("playsound random.eat @a ~~~");
        player.runCommand(`particle bf:eating_${foodName} ~ ~1.5 ~`);
        state.lastEatSoundTick = now;
        offhandEatState.set(player.id, state);
      }
      // Eat item after delay from last eat
      if (!state.finishedTick && now - state.startTick >= 32) {
        const foodKey = offhand.typeId.split(":").pop().replace("_offhand", "");
        const foodData = food[foodKey];
        if (foodData) {
          player.runCommand("playsound random.burp @a ~~~");
          const hunger = player.getHunger() ?? 20;
          const saturation = player.getSaturation() ?? 20;
          // Only allow eating if not full, unless canEatAtFull is true
          if (foodData.canEatAtFull || hunger < 20) {
            player.setHunger(Math.min(hunger + foodData.hunger, 20));
            player.setSaturation(Math.min(saturation + foodData.saturation, 20));
            // Apply effects if present
            if (foodData.effects) {
              for (const eff of foodData.effects) {
                if (eff.clear) {
                  player.runCommand(`effect @s clear ${eff.effect}`);
                  continue;
                }
                if (eff.chance && Math.random() > eff.chance) continue;
                player.addEffect(eff.effect, eff.duration, { amplifier: eff.amplifier, showParticles: true });
              }
            }
            if (offhand.typeId === "bf:chorus_fruit_offhand") {
              // 2 second cooldown per player
              if (!globalThis._chorusOffhandCooldown) globalThis._chorusOffhandCooldown = {};
              const nowTick = system.currentTick;
              const lastTick = globalThis._chorusOffhandCooldown[player.id] ?? 0;
              if (nowTick - lastTick < 40) {
                // Still on cooldown, skip teleport
              } else {
                globalThis._chorusOffhandCooldown[player.id] = nowTick;
                // Random teleport within 8 blocks for chorus fruit
                const pos = player.location;
                let tries = 0;
                let found = false;
                while (tries < 8 && !found) {
                  const offsetX = (Math.random() * 16) - 8;
                  const offsetY = (Math.random() * 16) - 8;
                  const offsetZ = (Math.random() * 16) - 8;
                  const dest = { x: pos.x + offsetX, y: pos.y + offsetY, z: pos.z + offsetZ };
                  const block = player.dimension.getBlock({ x: Math.floor(dest.x), y: Math.floor(dest.y), z: Math.floor(dest.z) });
                  const blockDown = player.dimension.getBlock({ x: Math.floor(dest.x), y: Math.floor(dest.y - 1), z: Math.floor(dest.z) });
                  if (block && blockDown != "minecraft:air" && block.typeId === "minecraft:air") {
                    player.teleport(dest, player.dimension);
                    player.runCommand("playsound entity.enderman.teleport @a ~~~");
                    found = true;
                  }
                  tries++;
                }
              }
            }
            // Remove one item from offhand
            if (offhand.amount > 1) {
              offhand.amount--;
              player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${offhand.typeId} ${offhand.amount}`);
            } else {
              player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
            }
          }
        }
        // Mark finishedTick so sound is blocked for 10 ticks
        offhandEatState.set(player.id, { ...state, finishedTick: now });
        continue;
      }
      // Emergency: If held for more than 200 ticks, forcibly end
      if (!state.finishedTick && now - state.startTick > 200) {
        offhandEatState.delete(player.id);
        continue;
      }
    } else {
      offhandEatState.delete(player.id);
    }
  }
}), 5;
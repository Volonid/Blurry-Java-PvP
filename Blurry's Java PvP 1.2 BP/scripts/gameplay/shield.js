import { world, Player, system, EquipmentSlot } from '@minecraft/server';

const itemList = [
  "bf:wooden_axe",
  "bf:wooden_sword",
  "bf:stone_axe",
  "bf:stone_sword",
  "bf:iron_axe",
  "bf:iron_sword",
  "bf:copper_axe",
  "bf:copper_sword",
  "bf:golden_axe",
  "bf:golden_sword",
  "bf:diamond_axe",
  "bf:diamond_sword",
  "bf:netherite_axe",
  "bf:ember_axe",
  "bf:frost_blade",
  "bf:frost_blade",
  "bf:netherite_sword",
  "bf:amethyst_sword",
  "bf:shield"
];

const toggleItemList = [
  "minecraft:mace",
  "minecraft:totem_of_undying",
  // Wooden
  "minecraft:wooden_pickaxe",
  "minecraft:wooden_shovel",
  // Stone
  "minecraft:stone_pickaxe",
  "minecraft:stone_shovel",
  // Iron
  "minecraft:iron_pickaxe",
  "minecraft:iron_shovel",
  // Golden
  "minecraft:golden_pickaxe",
  "minecraft:golden_shovel",
  // Diamond
  "minecraft:diamond_pickaxe",
  "minecraft:diamond_shovel",
  // Netherite
  "minecraft:netherite_pickaxe",
  "minecraft:netherite_shovel",
];

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id === "bf:attack") {
        if (sourceEntity?.typeId === "minecraft:player") {
          const inventory = sourceEntity.getComponent("minecraft:inventory")?.container;
          const selectedItem = inventory?.getItem(sourceEntity.selectedSlotIndex);
            const player = event.sourceEntity;
            player.runCommand(`event entity @s bf:shield_add`);
            player.runCommand(`scoreboard players set @s shield_up 0`);
            player.removeTag("shield_toggle");
            player.removeTag("shield");
            player.removeTag("shield_up");
            player.removeTag("shield_br");
            // Prevent shield up for 10 ticks
            player.addTag("shield_cooldown");
            system.runTimeout(() => {
                if (player.isValid) {
                    player.removeTag("shield_cooldown");
                }
            }, 5);
      }
    }
});

world.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (world.getDynamicProperty("player") === true && world.getDynamicProperty("shield") === true) return;
  // Remove long timeout, set immediately
  for (const player of world.getPlayers()) {
    if (player.hasTag("shield")) {
      player.runCommand(`scoreboard players set @s shield_up 1`);
    } else {
      player.runCommand(`scoreboard players set @s shield_up 0`);
    }
  }
});

world.afterEvents.itemUse.subscribe(event => {
  const player = event.source;
  const offhandItem = player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand);
  if (player) {
    // Prevent shield up if on cooldown
    const inventory = player.getComponent("minecraft:inventory")?.container;
    const selectedItem = inventory?.getItem(player.selectedSlotIndex);
    const shieldUseMode = player.getDynamicProperty("shield_use");
    // Toggle logic: only allow toggling with toggleItemList if config is 0, else only itemList
    const canToggle = (
      selectedItem &&
      (shieldUseMode === 0 && toggleItemList.includes(selectedItem.typeId)) &&
      offhandItem && offhandItem.hasTag("bf:shield") &&
      world.getDynamicProperty("player") === true &&
      world.getDynamicProperty("shield") === true &&
      !player.hasTag("shield_cooldown") &&
      !player.hasTag("shield_b")
    );
    if (canToggle) {
      if (player.hasTag("shield_toggle")) {
        // Turn off
        player.runCommand(`event entity @s bf:shield_add`);
        player.runCommand(`scoreboard players set @s shield_up 0`);
        player.removeTag("shield_toggle");
        player.removeTag("shield");
        player.removeTag("shield_up");
        player.removeTag("shield_br");
      } else {
        // Turn on
        player.runCommand(`event entity @s bf:shield_remove`);
        player.runCommand(`scoreboard players set @s shield_up 1`);

        player.addTag("shield_toggle");
        player.addTag("shield_up");
        player.addTag("shield");
        player.addTag("shield_br");
      }
      return;
    }
    if ((offhandItem && offhandItem.hasTag("bf:shield") && selectedItem && itemList.includes(selectedItem.typeId) || selectedItem && selectedItem.hasTag("bf:shield")) &&
      world.getDynamicProperty("player") === true &&
      world.getDynamicProperty("shield") === true &&
      !player.hasTag("shield_b")
    ) {
      player.runCommand(`scoreboard players set @s shield_up 1`);
      player.addTag("shield_up");
      player.addTag("shield");
      player.addTag("shield_br");
    } else {
      player.runCommand(`scoreboard players set @s shield_up 0`);
      player.removeTag("shield");
      player.removeTag("shield_up");
      player.removeTag("shield_br");
    }
  }
  if (!world.scoreboard.getObjective("shield_up")) {
    world.scoreboard.addObjective("shield_up", "shield_up");
  }
  if (!world.scoreboard.getObjective("side_shield")) {
    world.scoreboard.addObjective("side_shield", "side_shield");
  }
});

// Check every tick if player is still holding a toggle item, else turn off shield
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (player.hasTag("shield_toggle")) {
      const inventory = player.getComponent("minecraft:inventory")?.container;
      const selectedItem = inventory?.getItem(player.selectedSlotIndex);
      if (!selectedItem || !toggleItemList.includes(selectedItem.typeId)) {
        player.runCommand(`event entity @s bf:shield_remove`);
        player.runCommand(`scoreboard players set @s shield_up 0`);
        player.removeTag("shield_toggle");
        player.removeTag("shield");
        player.removeTag("shield_up");
        player.removeTag("shield_br");
      }
    }
  }
}, 2); // check every 2 ticks for responsiveness

world.afterEvents.itemStopUse.subscribe(event => {
  const player = event.source;
  if (player) {
    if (world.getDynamicProperty("player") === true) {
      const inventory = player.getComponent("minecraft:inventory")?.container;
      const selectedItem = inventory?.getItem(player.selectedSlotIndex);
      if (selectedItem && selectedItem.hasTag("bf:shield")) {
        player.runCommand(`scoreboard players set @s shield_up 3`);
        system.runTimeout(() => {
          if (player.isValid) {
            player.runCommand(`scoreboard players set @s shield_up 0`);
            player.removeTag("shield");
            player.removeTag("shield_up");
            player.removeTag("shield_br");
          }
        }, 5);
      } else {
          player.runCommand(`scoreboard players set @s shield_up 0`);
          player.removeTag("shield");
          player.removeTag("shield_up");
          player.removeTag("shield_br");
      }
    }
  }
});

system.runInterval(() => {
 for (const player of world.getPlayers()) {
    if (!player.hasTag("shield")) {
      const inventory = player.getComponent("minecraft:inventory")?.container;
      const selectedItem = inventory?.getItem(player.selectedSlotIndex);
      const offhandItem = player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand);
      if (offhandItem && offhandItem.hasTag("bf:shield") && player.getDynamicProperty("shield") === false) {
        player.runCommand(`playanimation @s animation.shield.wield_off_hand_first_person2 a 10000000`);
      } else if (offhandItem && offhandItem.hasTag("bf:shield") && player.getDynamicProperty("shield") === true) {
        player.runCommand(`playanimation @s animation.shield.wield_off_hand_first_person2_side a 10000000`);
      }
      if (selectedItem  && selectedItem.hasTag("bf:shield") && player.getDynamicProperty("shield") === false) {
        player.runCommand(`playanimation @s animation.shield.wield_main_hand_first_person2 a 10000000`);
      } else if (selectedItem  && selectedItem.hasTag("bf:shield") && player.getDynamicProperty("shield") === true) {
        player.runCommand(`playanimation @s animation.shield.wield_main_hand_first_person2_side a 10000000`);
      }
        player.runCommand(`scoreboard players set @s shield_up 0`);
        player.runCommand(`/event entity @s bf:shield_add`);
        player.removeTag("shield");
        player.removeTag("shield_up");
        player.removeTag("shield_br");
      }
      if (player.getDynamicProperty("shield") === false) {
        player.runCommand(`scoreboard players set @s side_shield 0`);
      } else if (player.getDynamicProperty("shield") === true) {
        player.runCommand(`scoreboard players set @s side_shield 1`);
      }
    }
}, 10);
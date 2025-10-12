import { world, system, TicksPerSecond, EquipmentSlot, Player, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from '@minecraft/server';
import { ModalFormData } from "@minecraft/server-ui";
import {
  dynamicProperties,
  dynamicPropertiesPlayer,
  dp,
  dpPlayer,
  clampNumber,
  configHandler,
  configPlayerHandler,
  showItemForm,
  showItemFormPlayer
} from './config.js';

// Extend Player prototype with hunger methods - MUST be after Player import
Player.prototype.getHunger = function () {
  return this.getComponent("player.hunger")?.currentValue;
};

Player.prototype.setHunger = function (number) {
  this.getComponent("player.hunger")?.setCurrentValue(number);
};

Player.prototype.getSaturation = function () {
  return this.getComponent("player.saturation")?.currentValue;
};

Player.prototype.setSaturation = function (number) {
  this.getComponent("player.saturation")?.setCurrentValue(number);
};

Player.prototype.getExhaustion = function () {
  return this.getComponent("player.exhaustion")?.currentValue;
};

Player.prototype.setExhaustion = function (number) {
  this.getComponent("player.exhaustion")?.setCurrentValue(number);
};

// Helper to get inventory container (2.0.0+)
function getInventoryContainer(player) {
  const invComp = player.getComponent('minecraft:inventory');
  return invComp ? invComp.container : undefined;
}

// Helper to get effect (2.0.0+)
function getEffect(entity, effectName) {
  return entity.getEffect(effectName);
}

// Helper to add effect (2.0.0+)
function addEffect(entity, effectName, duration, amplifier, showParticles = false) {
  entity.addEffect(effectName, duration, { amplifier, showParticles });
}

// --- Patch usages below ---

// Patch gethealth to use new effect API
function gethealth(entity) {
  const healthEffect = getEffect(entity, "minecraft:health_boost");
  if (!healthEffect) { return 0; }
  const amplifier = healthEffect.amplifier;
  const health = 4 * (amplifier + 1);
  return health;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
  const { id, sourceEntity } = event;
  if (id === "bf:config") {
    showItemForm(sourceEntity)
  }
});

system.beforeEvents.startup.subscribe((init) => {
  // No enums defined

  const configCmd = {
    name: "bf:admin_config",
    description: "Opens the ADMIN config (Blurry's Java PvP)",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    cheatsRequired: false
  };

  const configPlayerCmd = {
    name: "bf:config",
    description: "Opens the config (Blurry's Java PvP)",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false
  };

  init.customCommandRegistry.registerCommand(configPlayerCmd, configPlayerHandler);
  init.customCommandRegistry.registerCommand(configCmd, configHandler);
});

// Patch itemUse event for inventory
world.afterEvents.itemUse.subscribe(event => {
  const player = event.source;
  if (!player) return;
  const inventory = getInventoryContainer(player);
  const selectedItem = inventory?.getItem(player.selectedSlotIndex);
  // Config UI for renamed dye
  if (selectedItem?.typeId.includes("_dye") && player.hasTag("op") && selectedItem.nameTag && selectedItem.nameTag.toLowerCase() === "config") {
    showItemForm(player);
  }
});

world.afterEvents.itemCompleteUse.subscribe(event => {
  let player = event.source;
  let item = event.itemStack;
  if (item.typeId.includes("_dye") && player.hasTag("op")) {
    showItemForm(player);
  }
  if (item.typeId === "bf:golden_apple") {
    player.runCommand("effect @s clear absorption");
    player.addEffect("absorption", 2400, { amplifier: 0, showParticles: true });
    player.addEffect("regeneration", 100, { amplifier: 0, showParticles: true });
  }
});

// itemCompleteUse is not needed for config UI or golden apple in beta, so it is removed.

system.runInterval(() => {
  const isSaturationOn = world.getDynamicProperty("sat");
  if (!isSaturationOn) return;

  world.getAllPlayers().forEach(player => {
    const health = player.getComponent("health");
    const currentHealth = health.currentValue;
    const maxHealth = health.defaultValue;
    const extraHealth = gethealth(player);
    const hunger = player.getHunger();
    const saturation = player.getSaturation();

    if (
      currentHealth < (maxHealth + extraHealth) &&
      (saturation > 0 || (saturation <= 0 && hunger > 18))
    ) {
      // Heal 1 point if not at max health
      if (currentHealth < (maxHealth + extraHealth)) {
        health.setCurrentValue(Math.min(currentHealth + 2, maxHealth + extraHealth));
      }
      // Reduce saturation first, then hunger
      if (saturation > 0) {
        player.setSaturation(clampNumber(saturation - 2, 0, 20));
      } else {
        player.setHunger(clampNumber(hunger - 2, 0, 20));
      }
    }
  });
}, 10);

world.afterEvents.worldLoad.subscribe(() => {
  world.setDynamicProperty("player", false);
  system.runTimeout(() => {
    // Set all dynamicProperties defaults if undefined
    dynamicProperties.forEach(property => {
      if (world.getDynamicProperty(property.id) === undefined) {
        world.setDynamicProperty(property.id, property.value);
      }
    });
    // Legacy and extra properties
    if (world.getDynamicProperty("satdis") === undefined) world.setDynamicProperty("satdis", true);
    if (world.getDynamicProperty("sat") === undefined) world.setDynamicProperty("sat", true);
    if (world.getDynamicProperty("swap") === undefined) world.setDynamicProperty("swap", true);
    if (world.getDynamicProperty("old_web") === undefined) world.setDynamicProperty("old_web", false);
    if (world.getDynamicProperty("cooldown") === undefined) world.setDynamicProperty("cooldown", true);
    if (world.getDynamicProperty("fireworks") === undefined) world.setDynamicProperty("fireworks", true);
    if (world.getDynamicProperty("hud_mode") === undefined) world.setDynamicProperty("hud_mode", 0);
    if (world.getDynamicProperty("new_string_duper") === undefined) world.setDynamicProperty("new_string_duper", 0);
    if (world.getDynamicProperty("web") === undefined) world.setDynamicProperty("web", 0);
    if (world.getDynamicProperty("combat_log") === undefined) world.setDynamicProperty("combat_log", false);
    if (world.getDynamicProperty("anti_dupe") === undefined) world.setDynamicProperty("anti_dupe", false);
    if (world.getDynamicProperty("auto_sort") === undefined) world.setDynamicProperty("auto_sort", false);
    if (world.getDynamicProperty("auto_refill") === undefined) world.setDynamicProperty("auto_refill", false);
    if (world.getDynamicProperty("pickup_lock") === undefined) world.setDynamicProperty("pickup_lock", false);
    world.setDynamicProperty("player", false);
    world.sendMessage("§f§l/bf:admin_config §6to open the admin config.");
    world.getDimension("overworld").runCommand("gamerule naturalregeneration false");
  }, 80);
});

world.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (entity.typeId === "minecraft:player") {

  }
});

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  // Set all dynamicPropertiesPlayer defaults if undefined
  dynamicPropertiesPlayer.forEach(property => {
    if (player.getDynamicProperty(property.id) === undefined) {
      player.setDynamicProperty(property.id, property.value);
    }
  });
  player.setDynamicProperty("saturationTime", 6);
  const effect = getEffect(player, "minecraft:absorption");
  if (effect) {
    player.runCommand("effect @s clear absorption");
    player.addEffect("absorption", 2400, { amplifier: 0, showParticles: true });
  }
  system.runTimeout(() => {
    if (player.isValid) {
      player.sendMessage("§f§l/bf:config §6to open the config.");
    }
  }, 80);
});

system.runInterval(() => {
  world.getAllPlayers().forEach(player => {
    if (!player) return;
    let sat = player.getDynamicProperty("saturationTime") ?? 6; // Ensure default value if undefined
    sat = Math.max(0, sat - 1); // Prevent negative values
    player.setDynamicProperty("saturationTime", sat);
  });
}, 400);
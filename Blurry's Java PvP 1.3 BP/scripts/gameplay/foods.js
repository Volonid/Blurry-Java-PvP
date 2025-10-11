import { world, system, TicksPerSecond, EquipmentSlot, Player, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from '@minecraft/server';
import { ModalFormData } from "@minecraft/server-ui";

// Utility to clamp a number between min and max
function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

let dynamicProperties = [
  // Game Mechanics
  { id: "java", name: "Java Knockback Hit", value: false, category: "Game Mechanics" },
  { id: "port", name: "Java Portals", value: true, category: "Game Mechanics" },
  { id: "door", name: "Java Doors", value: true, category: "Game Mechanics" },
  { id: "sat", name: "Java Saturation", value: true, category: "Game Mechanics" },
  { id: "mace", name: "Mace Stun Slam", value: false, category: "Game Mechanics" },
  { id: "cpvp", name: "Fast Crystals §42x Vertical KB", value: false, category: "Game Mechanics" },

  // Anti-Cheat & Balance
  { id: "lag", name: "Anti Reach", value: false, category: "Anti-Cheat & Balance" },
  { id: "spam", name: "Anti Spam", value: true, category: "Anti-Cheat & Balance" },

  // Features & Quality of Life
  { id: "death", name: "Death Message", value: true, category: "Features & Quality of Life" },
  { id: "op", name: "Extra Stuff", value: true, category: "Features & Quality of Life" },
  { id: "offhand_food", name: "Offhand Food", value: true, category: "Features & Quality of Life" },
  { id: "firework", name: "Better Fireworks", value: false, category: "Features & Quality of Life" },
  { id: "shield", name: "Custom Shield", value: true, category: "Features & Quality of Life" },

  // Advanced Settings
  { id: "new_string_duper", name: "String Duper Toggle", value: 0, category: "Advanced Settings" },
  { id: "web", name: "Web Mode", value: 0, category: "Advanced Settings" },
  { id: "hud_display_mode", name: "HUD Display Mode", value: 0, category: "Advanced Settings" }
];

function dp(player, { id }) {
  const worldValue = world.getDynamicProperty(id);
  if (worldValue === undefined) {
    const localValue = dynamicProperties.find(property => property.id === id);
    return localValue ? localValue.value : false;
  }
  return worldValue;
}

// Group properties by category
function groupPropertiesByCategory(properties) {
  const categories = {};
  properties.forEach(property => {
    if (!categories[property.category]) {
      categories[property.category] = [];
    }
    categories[property.category].push(property);
  });
  return categories;
}

// The working showItemForm function with categories
function showItemForm(player) {
  const form = new ModalFormData().title("§lBlurry's PvP Admin Config");
  const categories = groupPropertiesByCategory(dynamicProperties);

  let totalFields = 0;

  // Add each category with dividers
  Object.keys(categories).forEach(categoryName => {
    // Add category divider
    form.label(`§6§l${categoryName}§r`);
    totalFields++;

    // Add properties in this category
    categories[categoryName].forEach(property => {
      if (property.id === "hud_display_mode") {
        let saved = world.getDynamicProperty("hud_display_mode");
        if (typeof saved !== "number") saved = 0;
        form.dropdown(property.name, ["Title + SubTitle", "Actionbar", "Off"], { defaultValueIndex: saved });
      } else if (property.id === "web") {
        let saved = world.getDynamicProperty("web");
        if (typeof saved !== "number") saved = 0;
        form.dropdown(property.name, ["Java Webs", "Old Webs", "Off"], { defaultValueIndex: saved });
      } else if (property.id === "new_string_duper") {
        let saved = world.getDynamicProperty("new_string_duper");
        if (typeof saved !== "number") saved = 0;
        form.dropdown(property.name, ["Off", "Old String Duper", "Better String Duper"], { defaultValueIndex: saved });
      } else {
        form.toggle(property.name, { defaultValue: Boolean(dp(player, { id: property.id })) });
      }
      totalFields++;
    });
  });

  form.show(player).then((response) => {
    if (response.canceled) {
      player.sendMessage("Configuration canceled.");
      return;
    }

    const categories = groupPropertiesByCategory(dynamicProperties);
    let responseIndex = 0;

    Object.keys(categories).forEach(categoryName => {
      responseIndex++; // Skip category label

      categories[categoryName].forEach(property => {
        if (property.id === "hud_display_mode") {
          const val = response.formValues[responseIndex];
          property.value = val;
          world.setDynamicProperty(property.id, val);
        } else if (property.id === "web") {
          const val = response.formValues[responseIndex];
          property.value = val;
          world.setDynamicProperty(property.id, val);
        } else if (property.id === "new_string_duper") {
          const val = response.formValues[responseIndex];
          property.value = val;
          world.setDynamicProperty(property.id, val);
        } else {
          const isChecked = response.formValues[responseIndex];
          property.value = isChecked;
          world.setDynamicProperty(property.id, isChecked);
        }
        responseIndex++;
      });
    });

    system.runTimeout(() => {
      for (const player of world.getPlayers()) {
        if (player.isValid) {
          player.sendMessage("toast.");
          player.onScreenDisplay.setTitle("notificatiom.", {
            stayDuration: 0,
            fadeInDuration: 0,
            fadeOutDuration: 0,
          });
          player.onScreenDisplay.updateSubtitle("notification.");
        }
      }
    }, 2);
    player.sendMessage(`Config Saved`);
  }).catch((error) => {
    player.sendMessage("Failed to show config form.");
  });
}

let dynamicPropertiesPlayer = [
  // HUD Settings
  { id: "sat_hud", name: "Saturation HUD (apple skin)", value: true, category: "HUD Settings" },
  { id: "armor_hud", name: "Armor HUD", value: true, category: "HUD Settings" },
  { id: "shield_hud", name: "Shield HUD", value: true, category: "HUD Settings" },

  // Gameplay Settings
  { id: "offset", name: "Mobile Saturation Offset", value: true, category: "Gameplay Settings" },
  { id: "shield", name: "Side Shield", value: false, category: "Gameplay Settings" },

  // Advanced Controls
  { id: "shield_use", name: "Shield Use Mode", value: 0, category: "Advanced Controls" },
  { id: "offhand_swap", name: "Offhand Swap Mode", value: 0, category: "Advanced Controls" }
];

function dpPlayer(player, { id }) {
  const worldValue = player.getDynamicProperty(id);
  if (worldValue === undefined) {
    const localValue = dynamicPropertiesPlayer.find(property => property.id === id);
    return localValue ? localValue.value : false;
  }
  return worldValue;
}

// The working showItemForm function with categories
function showItemFormPlayer(player) {
  const form = new ModalFormData().title("§lBlurry's PvP Config");
  const categories = groupPropertiesByCategory(dynamicPropertiesPlayer);

  let totalFields = 0;

  // Add each category with dividers
  Object.keys(categories).forEach(categoryName => {
    // Add category divider
    form.label(`§6§l${categoryName}§r`);
    totalFields++;

    // Add properties in this category
    categories[categoryName].forEach(property => {
      if (property.id === "offhand_swap") {
        let saved = player.getDynamicProperty("offhand_swap");
        if (typeof saved !== "number") saved = 0;
        form.dropdown(property.name, ["2x Sneak", "5x Sneak", "Emote", "None"], { defaultValueIndex: saved });
      } else if (property.id === "shield_use") {
        let saved = player.getDynamicProperty("shield_use");
        if (typeof saved !== "number") saved = 0;
        form.dropdown(property.name, ["All possible items", "Custom Items only"], { defaultValueIndex: saved });
      } else {
        form.toggle(property.name, { defaultValue: Boolean(dpPlayer(player, { id: property.id })) });
      }
      totalFields++;
    });
  });

  form.show(player).then((response) => {
    if (response.canceled) {
      player.sendMessage("Configuration canceled.");
      return;
    }

    const categories = groupPropertiesByCategory(dynamicPropertiesPlayer);
    let responseIndex = 0;

    Object.keys(categories).forEach(categoryName => {
      responseIndex++; // Skip category label

      categories[categoryName].forEach(property => {
        const isChecked = response.formValues[responseIndex];
        property.value = isChecked;
        player.setDynamicProperty(property.id, isChecked);
        responseIndex++;
      });
    });

    player.sendMessage(`Config Saved`);
  }).catch((error) => {
    player.sendMessage("Failed to show config form.");
  });
}

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

function configHandler(origin) {
  const player = origin.sourceEntity;
  if (!player) {
    return { status: CustomCommandStatus.Fail, message: "This command can only be run by a player." };
  }
  system.run(() => {
    showItemForm(player);
  })
  return { status: CustomCommandStatus.Success, message: "Opening Config" };
}

function configPlayerHandler(origin) {
  const player = origin.sourceEntity;
  if (!player) {
    return { status: CustomCommandStatus.Fail, message: "This command can only be run by a player." };
  }
  system.run(() => {
    showItemFormPlayer(player);
  })
  return { status: CustomCommandStatus.Success, message: "Opening Config" };
}


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
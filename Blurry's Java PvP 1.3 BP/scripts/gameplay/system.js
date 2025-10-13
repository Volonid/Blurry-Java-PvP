import { world, Player, system, EquipmentSlot } from '@minecraft/server';

// === Imports and Constants ===
const cooldowns = new Map();
const activeCooldowns = new Set();
const vec2YSub = (a, b) => a.y - b.y;
const recentHits = new Map();
const CROSSBOW_TAG = "shot_crossbow";
const crossbowShotPlayers = new Map(); // player.id -> true
const playerFallData = new Map(); // player.id -> { startY: number, isFalling: boolean }
let playerdata = {};
let lastItemDamageTick = new Map();

// === Cached World Properties ===
let cachedProps = {};
function updateCachedProps() {
  cachedProps = {
    op: world.getDynamicProperty("op"),
    cpvp: world.getDynamicProperty("cpvp"),
    fireworks: world.getDynamicProperty("firework"),
    java: world.getDynamicProperty("java"),
    cooldown: world.getDynamicProperty("cooldown"),
    spam: world.getDynamicProperty("spam"),
    lag: world.getDynamicProperty("lag"),
    player: world.getDynamicProperty("player"),
    shield: world.getDynamicProperty("shield"),
    mace: world.getDynamicProperty("mace")
  };
}
system.runInterval(updateCachedProps, 120);

// === Crossbow Shot Tracking ===
world.beforeEvents.itemUse.subscribe((event) => {
  const { itemStack, source } = event;
  if (!itemStack || !source || source.typeId !== "minecraft:player") return;
  if (itemStack.typeId === "minecraft:crossbow") {
    crossbowShotPlayers.set(source.id, true);
    system.runTimeout(() => {
      crossbowShotPlayers.delete(source.id);
    }, 60);
  }
});

// === Shield Arrow Deflection System ===
system.runInterval(() => {
  if (cachedProps.op === false) return;
  for (const player of world.getPlayers()) {
    if (!player.hasTag("shield")) continue;
    const playerLoc = player.location;
    const view = player.getViewDirection();
    const projectiles = player.dimension.getEntities({
      location: playerLoc,
      maxDistance: 3,
      type: "minecraft:arrow"
    });
    for (const proj of projectiles) {
      // Get current velocity
      const v = proj.getVelocity();
      proj.applyImpulse({ x: -v.x, y: -v.y, z: -v.z });
      const customVelo = { x: view.x * 1.5, y: view.y * 1.5 + 0.2, z: view.z * 1.5 };
      proj.applyImpulse(customVelo);
    }
  }
});

// === Player Hurt Effects ===

system.runInterval(() => {
  const players = world.getPlayers();
  for (const player of players) {
    if (!player) continue;

    // Cache player state
    const playerId = player.id;
    const isOnGround = player.isOnGround;
    const isSprinting = player.isSprinting;
    const isFalling = player.isFalling;

    // Update player data only if changed
    const prev = playerdata[playerId];
    if (!prev || prev.isFalling !== isFalling || prev.isOnGround !== isOnGround || prev.isSprinting !== isSprinting) {
      playerdata[playerId] = { isFalling, isOnGround, isSprinting };
    }

    // Java knockback logic
    if (cachedProps.java) {
      const kbValue = player.getDynamicProperty("kb");
      const kbHitValue = player.getDynamicProperty("kbhit");

      if (kbValue === undefined) player.setDynamicProperty("kb", false);
      if (kbHitValue === undefined) player.setDynamicProperty("kbhit", false);

      if (!isSprinting && kbHitValue === true) {
        player.setDynamicProperty("kb", false);
        player.setDynamicProperty("kbhit", false);
      } else if (isSprinting && kbHitValue === false) {
        player.setDynamicProperty("kbhit", true);
        player.setDynamicProperty("kb", true);
      }
    }

    // Crystal PvP logic
    if (cachedProps.cpvp) {
      const crystals = player.dimension.getEntities({
        location: player.getHeadLocation(),
        maxDistance: 6,
        type: "minecraft:ender_crystal"
      });
      for (const crystal of crystals) crystal.triggerEvent("minecraft:crystal_explode");
    }

    // Main item and cooldown logic
    if (cachedProps.op === true) {
      const cooldownPercent = Math.min(getCooldownPercent(player, "sweep") || 0, 100);
      const inv = player.getComponent("inventory")?.container;
      const item = inv?.getItem(player.selectedSlotIndex);
      const lastItem = player.getDynamicProperty("last_item_held") ?? "";

      if (item?.typeId) {
        const itemId = item.typeId;

        // Handle item switching
        if (itemId !== lastItem || player.hasTag("swapping")) {
          if (handleItemSwitch(player, itemId, lastItem)) continue;
        } else if (itemId.includes("_axe") && !player.hasTag("axe")) {
          // Ensure axe tag is present when holding axe
          player.addTag("axe");
        }

        // Tool weakness effect (exclude mace to allow hits below 70% cooldown)
        const isTool = itemId === "minecraft:trident" ||
          itemId.includes("_pickaxe") || itemId.includes("_shovel") || itemId.includes("_hoe");
        if (isTool && (cooldownPercent < 70 || cooldownPercent === 0)) {
          player.addEffect("weakness", 2, { amplifier: 255, showParticles: false });
        }
      } else {
        // No item in hand
        if (lastItem !== "§") player.setDynamicProperty("last_item_held", "§");
        if (player.hasTag("axe")) player.removeTag("axe");
      }
    }

    // Saturation effect
    if (player.getEffect("saturation")) {
      player.setHunger(20);
      player.setSaturation(20);
    }
  }
});

function handleItemSwitch(player, itemId, lastItem) {
  // Swapping logic
  if (player.hasTag("swapping")) {
    player.setDynamicProperty("last_item_held", itemId);
    return true; // Skip to next player
  }

  // Mace logic
  if (itemId === "minecraft:mace" && !lastItem.includes("mace")) {
    player.addTag(lastItem.includes("_axe") ? "sword_axe" : "sword");
    system.runTimeout(() => {
      if (!player) return;
      player.removeTag("sword");
      player.removeTag("sword_axe");
      activateCooldown(player);
      player.removeTag("axe");
    }, 4);
  }
  // Axe logic
  else if (itemId.includes("_axe") && !lastItem.includes("_axe")) {
    player.addTag("axe");
    activateCooldown(player);
  }
  else if (!itemId.includes("_axe") && lastItem.includes("_axe")) {
    activateCooldown(player);
    system.runTimeout(() => { if (player) player.removeTag("axe"); }, 6);
  }
  // Shield logic
  else if (itemId.includes("shield") !== lastItem.includes("shield")) {
    activateCooldown(player);
  }
  // Any other item change
  else {
    if (player.hasTag("axe")) player.removeTag("axe");
    activateCooldown(player);
  }

  player.setDynamicProperty("last_item_held", itemId);
  return false;
}


// === Player State Tracking and Main Per-Tick Logic ===
system.runInterval(() => {
  const players = world.getPlayers();
  for (const player of players) {
    if (!player) continue;

    // Get components once
    const inv = player.getComponent("inventory")?.container;
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) continue;

    const item = inv?.getItem(player.selectedSlotIndex);
    const cooldownPercent = Math.min(getCooldownPercent(player, "sweep") || 0, 100);

    // --- Cooldown/Tag Logic ---
    const shouldHaveDamTag = cooldownPercent < 60 && item?.typeId &&
      item.typeId !== "minecraft:mace" && player.hasTag("dam");
    if (shouldHaveDamTag && !player.hasTag("dam")) {
      player.addTag("dam");
    } else if (!shouldHaveDamTag && player.hasTag("dam")) {
      player.removeTag("dam");
    }

    // --- Firework Explode ---
    if (cachedProps.fireworks && !crossbowShotPlayers.has(player.id)) {
      const fireworks = player.dimension.getEntities({
        location: player.getHeadLocation(),
        maxDistance: 2,
        type: "minecraft:fireworks_rocket"
      });
      for (const firework of fireworks) {
        firework.triggerEvent("minecraft:explode");
        firework.runCommand("playsound firework.large_blast @a ~~~ 10 1.2");
        firework.runCommand("particle bf:sparkler_emitter");
      }
    }

    // --- Elytra Tag ---
    const hasElytra = equippable.getEquipment(EquipmentSlot.Chest)?.typeId === "minecraft:elytra";
    if ((hasElytra && item?.typeId === "minecraft:mace") && !player.hasTag("elytra")) {
      player.addTag("elytra");
    } else if (!hasElytra && player.hasTag("elytra")) {
      player.removeTag("elytra");
    }

    // --- Shield Animation ---
    const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);
    const hasShield = (item?.hasTag("bf:shield")) || (offhandItem?.hasTag("bf:shield"));
    if (!hasShield) {
      player.runCommand("/playanimation @s animation.player.shield_off a 10000000");
    }
  }
}, 10);

// === Armor Equip Sound System ===
// Tracks last equipped armor and plays custom equip sounds when changed
const lastArmorType = {};

function getArmorSound(typeId) {
  if (!typeId) return null;
  if (typeId.includes("netherite")) return "armor.equip_netherite2";
  if (typeId.includes("diamond")) return "armor.equip_diamond2";
  if (typeId.includes("gold")) return "armor.equip_gold2";
  if (typeId.includes("iron")) return "armor.equip_iron2";
  if (typeId.includes("chain")) return "armor.equip_chain2";
  if (typeId.includes("leather")) return "armor.equip_leather2";
  if (typeId.includes("copper")) return "armor.equip_copper2";
  return "armor.equip_generic2";
}

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable || player.hasTag("ui_off")) continue;
    if (!lastArmorType[player.id]) lastArmorType[player.id] = {};
    const slots = [
      EquipmentSlot.Head,
      EquipmentSlot.Chest,
      EquipmentSlot.Legs,
      EquipmentSlot.Feet
    ];
    for (const slot of slots) {
      const armor = equippable.getEquipment(slot);
      const prevType = lastArmorType[player.id][slot];
      const currType = armor ? armor.typeId : null;
      if (currType !== prevType) {
        if (currType) {
          const sound = getArmorSound(currType);
          if (!player.hasTag("ui_off")) {
            if (sound) player.runCommand(`playsound ${sound} @s ~~~ 1 1`);
          }
        }
        lastArmorType[player.id][slot] = currType;
      }
    }
  }
}, 2); // Check every 2 ticks for fast response

function startCooldown(player, cooldownType, cooldownDuration) {
  const cooldownStart = Date.now();
  const cooldownEnd = cooldownStart + cooldownDuration * 1000;
  const playerCooldowns = cooldowns.get(player.id) || {};
  playerCooldowns[cooldownType] = { cooldownStart, cooldownEnd };
  cooldowns.set(player.id, playerCooldowns);
  activeCooldowns.add(player.id);
  player.addTag("usingItem");
  system.runTimeout(() => {
    if (player) {
      player.removeTag("usingItem");
    }
  }, 20);
}

export function getCooldownPercent(player, cooldownType) {
  if (!player || !player.id) return 100;
  const playerCooldowns = cooldowns.get(player.id) || {};
  const cooldownData = playerCooldowns[cooldownType];
  if (cooldownData) {
    const remainingTime = Math.max(cooldownData.cooldownEnd - Date.now(), 0);
    const cooldownPercent = Math.max(100 - (remainingTime / (cooldownData.cooldownEnd - cooldownData.cooldownStart)) * 100, 0);
    return cooldownPercent;
  }
  return 100;
}

function activateCooldown(player) {
  const inventory = player.getComponent('minecraft:inventory')?.container;
  const selectedItem = inventory?.getItem(player.selectedSlotIndex);
  if (!selectedItem) {
    handleCooldowns(player, null, 0.4, 'sweep');
    return;
  }
  if (player.hasTag("sword")) {
    return;
  }
  const typeId = selectedItem.typeId;
  const tagCooldownMap = {
    'is_sword': 0.625,
    'is_axe': {
      'wooden': 1.2,
      'stone': 1.1,
      'default': 1.0
    },
    'is_pickaxe': 0.8,
    'is_shovel': 0.8,
    'is_hoe': 0.8
  };

  if (typeId.includes("mace")) {
    handleCooldowns(player, selectedItem, 1.4, 'sweep');
  } else if (typeId.includes("trident")) {
    handleCooldowns(player, selectedItem, 1.2, 'sweep');
  } else {
    for (const [tag, cooldown] of Object.entries(tagCooldownMap)) {
      if (selectedItem.hasTag(tag)) {
        if (typeof cooldown === 'object') {
          const specificCooldown = cooldown[typeId.split(':')[1]] || cooldown.default;
          handleCooldowns(player, selectedItem, specificCooldown, 'sweep');
        } else {
          handleCooldowns(player, selectedItem, cooldown, 'sweep');
        }
        return;
      }
    }
    handleCooldowns(player, selectedItem, 0.4, 'sweep');
  }

}

function handleCooldowns(player, item, cooldownDuration, cooldownType) {
  const hasteSpeed = getHasteSpeed(player);
  const miningSpeed = getMiningSpeed(player);
  const adjustedCooldownDuration = cooldownDuration * (1 - (hasteSpeed * 0.5) + (miningSpeed * 0.5));
  startCooldown(player, cooldownType, adjustedCooldownDuration);
}

function getHasteSpeed(entity) {
  if (world.getDynamicProperty("op") === false) return 0;
  const hasteEffect = entity.getEffect("minecraft:haste");
  if (!hasteEffect) { return 0; }
  const amplifier = hasteEffect.amplifier;
  const hasteSpeed = 0.03 * (amplifier + 1);
  return hasteSpeed;
}

function getMiningSpeed(entity) {
  if (world.getDynamicProperty("op") === false) return 0;
  const miningEffect = entity.getEffect("minecraft:mining_fatigue");
  if (!miningEffect) { return 0; }
  const amplifier = miningEffect.amplifier;
  const miningSpeed = 0.03 * (amplifier + 1);
  return miningSpeed;
}

function areEntitiesMoreThanBlocksApart(entity1, entity2) {
  const loc1 = entity1.location;
  const loc2 = entity2.location;

  const dx = loc1.x - loc2.x;
  const dy = loc1.y - loc2.y;
  const dz = loc1.z - loc2.z;

  const distanceSquared = dx * dx + dy * dy + dz * dz;
  return distanceSquared > 12.4;
}

function isBlockingWithShield(player) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  const mainHandItem = inventory?.getItem(player.selectedSlotIndex);
  const offhandItem = player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand);
  const isBlocking = player.isSneaking && (
    mainHandItem?.typeId === "minecraft:shield" ||
    offhandItem?.typeId === "minecraft:shield"
  );
  return isBlocking;
}

world.afterEvents.entityHitEntity.subscribe(async (event) => {
  const attacker = event.damagingEntity;
  const target = event.hitEntity;
  if (!attacker || !target || target.typeId === "minecraft:ender_crystal") return;
  if (target.typeId === "minecraft:boat") { target.applyDamage(100, { cause: "none", source: attacker }); return; }
  const PRot = attacker.getRotation?.();
  const DRot = target.getRotation?.();
  if (!PRot || !DRot) return;
  const YDeferent = vec2YSub(PRot, DRot);
  if (world.getDynamicProperty("player") === true && world.getDynamicProperty("shield") === true) {
    if (target.typeId === "minecraft:player") {
      const offhandItem = target.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand);
      const inventory = target.getComponent("minecraft:inventory")?.container;
      const mainHandItem = inventory.getItem(target.selectedSlotIndex);
      if (mainHandItem && mainHandItem.typeId === "minecraft:mace") attacker.addTag("hit");
      system.runTimeout(() => {
        if (attacker) attacker.removeTag("hit");
      }, 10);
      if (!target.hasTag("usingItem") && (target.hasTag("shield_br") || (target.hasTag("shield") || world.scoreboard.getObjective("shield_up")?.getScore(target) != 0)) && !target.hasTag("shield_b") && (offhandItem?.hasTag("bf:shield") || mainHandItem?.hasTag("bf:shield")) && !(YDeferent <= 90 && YDeferent >= -90)) {
        const equippable = target.getComponent("minecraft:equippable");
        if (equippable && inventory) {
          const tick = system.currentTick;
          const lastTick = lastItemDamageTick.get(target.id) || 0;
          if (tick - lastTick > 5) {
            lastItemDamageTick.set(target.id, tick);
            const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);
            if (offhandItem?.hasTag("bf:shield") && mainHandItem?.typeId === "miecraft:mace") {
              const newOffhandItem = itemDurabilityDecrease(offhandItem, target, 10, true);
              if (newOffhandItem) {
                equippable.setEquipment(EquipmentSlot.Offhand, newOffhandItem);
              }
            } else if (offhandItem?.hasTag("bf:shield")) {
              const newOffhandItem = itemDurabilityDecrease(offhandItem, target, 1, true);
              if (newOffhandItem) {
                equippable.setEquipment(EquipmentSlot.Offhand, newOffhandItem);
              }
            }
            if (mainHandItem?.hasTag("bf:shield")) {
              const newMainHandItem = itemDurabilityDecrease(mainHandItem, target, 1, false);
              if (newMainHandItem) {
                inventory.setItem(target.selectedSlotIndex, newMainHandItem);
              }
            }
          }
        }
        activateCooldown(attacker);
        const velocity = attacker.getVelocity?.();
        if (attacker.hasTag("axe")) {
          target.runCommand("playsound random.break @a ~~~ 10 1.2");
          target.addTag("shield_b");
          target.runCommand(`event entity @s bf:shield_remove`);
          target.runCommand(`scoreboard players set @s shield_up 0`);
          target.removeTag("shield");
          target.removeTag("shield_up");
          target.removeTag("shield_br");

          // Apply mace effect if attacker fell 2.5+ blocks and has mace
          const attackerId = attacker.id;
          const fallData = playerFallData.get(attackerId);
          if (fallData && fallData.isFalling) {
            const currentFallDistance = fallData.startY - attacker.location.y;
            console.log(currentFallDistance);
            if (currentFallDistance >= 2.5 && cachedProps.mace) {
              try {
                attacker.applyKnockback({ x: 0, z: 0 }, 1.2);
              } catch (e) { }
            }
          }
          system.runTimeout(() => {
            if (attacker.hasTag("axe") && !target.hasTag("shield_b")) {
              target.runCommand("playsound random.break @a ~~~ 10 1.2");
              target.addTag("shield_b");
              target.runCommand(`event entity @s bf:shield_remove`);
              target.runCommand(`scoreboard players set @s shield_up 0`);
              target.removeTag("shield");
              target.removeTag("shield_up");
              target.removeTag("shield_br");

              // Apply mace effect if attacker fell 2.5+ blocks and has mace
              const attackerId = attacker.id;
              const fallData = playerFallData.get(attackerId);
              if (fallData && fallData.isFalling) {
                const currentFallDistance = fallData.startY - attacker.location.y;
                if (currentFallDistance >= 2.5 && cachedProps.mace) {
                  const mainHandItem = attacker.getComponent("minecraft:inventory")?.container?.getItem(attacker.selectedSlotIndex);
                  if (mainHandItem && mainHandItem.typeId === "minecraft:mace") {
                    try {
                      attacker.applyKnockback({ x: 0, z: 0 }, 1.2);
                    } catch (e) { }
                  }
                }
              }
            }
          }, 3);
        } else {
          target.runCommand("playsound item.shield.block @a ~~~");
        }
        return;
      }
    }
  } else if (target.typeId === "minecraft:player" && isBlockingWithShield(target) && !(YDeferent <= 90 && YDeferent >= -90) && !target.hasTag("usingItem") && !target.hasTag("shield_b")) {
    const inventory = attacker.getComponent("minecraft:inventory")?.container;
    try {
      attacker.applyKnockback({ x: -Math.sin(attacker.getRotation().y * (Math.PI / 180)), z: Math.cos(attacker.getRotation().y * (Math.PI / 180)) }, 0.2);
    } catch (e) {
    }
    if (!inventory) return;
    const mainHandItem = inventory.getItem(attacker.selectedSlotIndex);
    if (mainHandItem?.typeId.includes("axe")) {
      try {
        attacker.applyKnockback({ x: -Math.sin(attacker.getRotation().y * (Math.PI / 180)), z: Math.cos(attacker.getRotation().y * (Math.PI / 180)) }, 0.2);
      } catch (e) {
      }
      target.addTag("shield_b");
      system.runTimeout(() => {
        if (target) {
          target.removeTag("shield_b");
          target.runCommand("playsound random.orb @s");
        }
      }, 100);
      return;
    }
    activateCooldown(attacker);
    attacker.runCommand("playsound item.shield.block @s");
    target.runCommand("playsound item.shield.block @s");
    return;
  }
  let checkCount = 0;
  const intervalId = system.runInterval(() => {
    checkCount++;
    if (attacker.hasTag("axe") && target.hasTag("shield")) {
      target.runCommand("playsound random.break @a ~~~ 10 1.2");
      target.addTag("shield_b");
      target.runCommand(`event entity @s bf:shield_remove`);
      target.runCommand(`scoreboard players set @s shield_up 0`);
      target.removeTag("shield");
      target.removeTag("shield_up");
      target.removeTag("shield_br");

      // Apply mace effect if attacker fell 2.5+ blocks and has mace
      const attackerId = attacker.id;
      const fallData = playerFallData.get(attackerId);
      if (fallData && fallData.isFalling) {
        const currentFallDistance = fallData.startY - attacker.location.y;
        if (currentFallDistance >= 2.5 && cachedProps.mace) {
          const mainHandItem = attacker.getComponent("minecraft:inventory")?.container?.getItem(attacker.selectedSlotIndex);
          if (mainHandItem && mainHandItem.typeId === "minecraft:mace") {
            try {
              attacker.applyKnockback({ x: 0, z: 0 }, 1.2);
            } catch (e) { }
          }
        }
      }
      // Clear the interval once condition is met
      system.clearRun(intervalId);
    } else if (checkCount >= 5) {
      // Stop checking after 4 ticks
      system.clearRun(intervalId);
    }
  }, 1);

  if (attacker.typeId != "minecraft:player") return;
  handleHit(attacker, target);
  recentHits.set(target.id, attacker);
  system.runTimeout(() => recentHits.delete(target.id), 20);
  activateCooldown(attacker);
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (world.getDynamicProperty("op") === false) return;
  const { id, sourceEntity } = event;
  const cooldownPercent = getCooldownPercent(sourceEntity, "sweep");
  if (id === "bf:attack" && cooldownPercent > 50) {
    if (sourceEntity?.typeId === "minecraft:player") {
      activateCooldown(sourceEntity);
    }
  }
  if (id === "bf:player") {
    if (sourceEntity?.typeId === "minecraft:player") {
      world.setDynamicProperty("player", true);
    }
  }
});

function isWearingNetheriteArmor(player) {
  try {
    if (!player || player.isDead) return false;

    const equippableComponent = player.getComponent("equippable");
    if (!equippableComponent) return false;

    const armorSlots = {
      Head: "minecraft:netherite_helmet",
      Chest: "minecraft:netherite_chestplate",
      Legs: "minecraft:netherite_leggings",
      Feet: "minecraft:netherite_boots"
    };

    let count = 0;
    for (const [slot, expectedItem] of Object.entries(armorSlots)) {
      const equippedItem = equippableComponent.getEquipment(slot)?.typeId;
      if (equippedItem === expectedItem) count++;
    }
    return count >= 3;
  } catch (e) {
    return false;
  }
}

function getEffectDamage(entity, effectName, multiplier) {
  try {
    if (!entity || entity.isDead) return 0;
    const effect = entity.getEffect(effectName);
    return effect ? multiplier * (effect.amplifier + 1) : 0;
  } catch (e) {
    return 0;
  }
}

function getStrengthDamage(entity) {
  return getEffectDamage(entity, "minecraft:strength", 3);
}

function getWeaknessDamage(entity) {
  return getEffectDamage(entity, "minecraft:weakness", 3);
}

function getSharpnessDamage(item) {
  if (!item) return 0;
  const enchantableComponent = item.getComponent("enchantable");
  if (!enchantableComponent) return 0;

  const sharpnessDamageMap = new Map([
    [1, 1],
    [2, 1.5],
    [3, 2],
    [4, 2.5],
    [5, 3]
  ]);

  const sharpness = enchantableComponent.getEnchantments().find(e => e.type.id === "sharpness")?.level || 0;
  return sharpnessDamageMap.get(sharpness) || 0;
}

function getEnchantmentLevel(item, enchantmentId) {
  if (!item) return 0;
  const enchantableComponent = item.getComponent("enchantable");
  if (!enchantableComponent) return 0;

  return enchantableComponent.getEnchantments().find(e => e.type.id === enchantmentId)?.level || 0;
}

function getKnockBack(item) {
  return getEnchantmentLevel(item, "knockback");
}

import { items } from './itemDamages';

function handleHit(attacker, hitEntity) {
  if (!attacker || !hitEntity || hitEntity.isDead) return;
  const cooldownPercent = getCooldownPercent(attacker, "sweep");
  const inventory = attacker.getComponent("inventory")?.container;
  const selectedItem = inventory?.getItem(attacker.selectedSlotIndex);
  const playerState = playerdata[attacker.id] || {};
  let isCritical = (!playerState.isOnGround && playerState.isFalling && !attacker.isInWater) ||
    (attacker.isInWater && !playerState.isSprinting);
  let isKnockBack = playerState.isSprinting || (selectedItem?.typeId.includes("_axe"));
  const javaProp = world.getDynamicProperty("java");
  const kbProp = attacker.getDynamicProperty("kb");
  if (javaProp) {
    if (kbProp !== undefined) {
      isKnockBack = kbProp;
      isCritical = (!playerState.isOnGround && playerState.isFalling && !kbProp);
    }
  }
  const spamProp = world.getDynamicProperty("spam");
  if (attacker.hasTag("dam") || attacker.hasTag("elytra")) return;
  const lagProp = world.getDynamicProperty("lag");
  if (cooldownPercent < 70) {
    console.log(`Cooldown Percent: ${cooldownPercent}`);
    // Allow mace hits below 70% cooldown, but block other weapons
    if (selectedItem?.typeId === "minecraft:mace") {
      // Mace can hit but without special effects (no sweep, no crit, no knockback)
      const dimension = hitEntity.dimension;
      const hitLoc = hitEntity.location;
      dimension.spawnParticle("bf:damage_indicator_emitter", hitLoc);
      hitEntity.runCommand(`playsound hit @a ~~~`);
      attacker.addTag("dam");
      return;
    }
    // Block other weapons from hitting below 70% cooldown
    try {
      hitEntity.applyKnockback({ x: 0, z: 0 }, 0);
      attacker.addTag("dam");
    } catch (e) { }
    return;
  }
  if ((lagProp && areEntitiesMoreThanBlocksApart(attacker, hitEntity))) {
    try {
      hitEntity.applyKnockback({ x: 0, z: 0 }, 0);
      attacker.addTag("dam");
      console.log(`${attacker.name} Has triggered the ANTI-REACH: blocks: ${Math.sqrt((attacker.location.x - hitEntity.location.x) ** 2 + (attacker.location.y - hitEntity.location.y) ** 2 + (attacker.location.z - hitEntity.location.z) ** 2)}`);
    } catch (e) { }
    return;
  }
  attacker.removeTag("shield_hit");
  const rotationY = attacker.getRotation().y * (Math.PI / 180);
  const sinY = Math.sin(rotationY);
  const cosY = Math.cos(rotationY);
  if (cooldownPercent >= 70 || !spamProp) {
    const dimension = hitEntity.dimension;
    const hitLoc = hitEntity.location;
    dimension.spawnParticle("bf:damage_indicator_emitter", hitLoc);
    hitEntity.runCommand(`playsound hit @a ~~~`);
    if (selectedItem?.hasTag("minecraft:is_sword") && !isCritical && !isKnockBack) {
      const sweepPos = {
        x: attacker.location.x - sinY * 1.8,
        y: attacker.location.y + 0.3,
        z: attacker.location.z + cosY * 1.8,
      };
      dimension.spawnParticle("dave:sweep", sweepPos);
      hitEntity.runCommand(`playsound sweep @a ~~~`);
      dimension.getEntities({ location: hitLoc, maxDistance: 1.5 }).forEach(entity => {
        if (hitEntity.hasTag("hit")) return;
        if (entity.id !== attacker.id && entity.id !== hitEntity.id) {
          if (entity.typeId === "minecraft:item") return;
          let knockbackPower = 0.6;
          let knockbackHeight = 0.28;
          let finalKnockbackX = -sinY * knockbackPower;
          let finalKnockbackZ = cosY * knockbackPower;
          const horizontalForce = { x: finalKnockbackX, z: finalKnockbackZ };
          entity.applyKnockback(horizontalForce, knockbackHeight);
          entity.applyDamage(10 * (Math.random() * 0.25 + 0.5), {
            cause: "none",
            source: { type: "entity", entity: attacker },
          });
        }
      });
    } else if (isCritical) {
      dimension.spawnParticle("bf:critical_hit_emitter", {
        x: hitLoc.x,
        y: hitLoc.y + 2,
        z: hitLoc.z
      });
      hitEntity.runCommand(`playsound critical_hit @a ~~~`);
    } else if (isKnockBack) {
      hitEntity.runCommand(`playsound knockback @a ~~~`);
      attacker.setDynamicProperty("kb", false);
    } else {
      hitEntity.runCommand(`playsound hit @a ~~~`);
    }
  }
  if (hitEntity.hasTag("hit")) {
    try {
      hitEntity.applyKnockback({ x: 0, z: 0 }, 0);
    } catch (e) {
    }
    return;
  }
  const kb = getKnockBack(selectedItem);
  const netherite = isWearingNetheriteArmor(hitEntity) && hitEntity.typeId === "minecraft:player";
  let knockbackPower = netherite ? 0.45 : 0.3;
  let knockbackHeight = netherite ? 0.2 : 0.28;
  if (!attacker.hasTag("sword")) {
    if (javaProp) {
      knockbackPower = netherite ? 0.135 : 0.15;
      knockbackHeight = netherite ? 0.1 : 0.18;
    }
    if (kb >= 1) {
      knockbackPower += kb * 0.3;
      knockbackHeight += kb * 0.1;
      if (world.getDynamicProperty("cpvp")) {
        knockbackHeight += kb * 0.2;
      }
    }
    if (hitEntity.typeId === "minecraft:player" && !playerdata[hitEntity.id]?.isOnGround) {
      knockbackHeight = knockbackHeight * 0.5;
      knockbackPower = knockbackPower * 0.5;
    }
    if (isKnockBack === true) {
      knockbackPower = netherite ? 1.35 : 0.9;
      knockbackHeight = netherite ? 0.2 : 0.38;
      if (javaProp) {
        knockbackPower = netherite ? 1 : 0.7;
      }
      if (kb >= 1) {
        knockbackPower += kb * 0.3;
        knockbackHeight += kb * 0.1;
        if (world.getDynamicProperty("cpvp")) {
          knockbackHeight += kb * 0.2;
        }
      }
    }
  }
  const currentVelo = hitEntity.getVelocity?.();
  let finalKnockbackX = -sinY * knockbackPower;
  let finalKnockbackZ = cosY * knockbackPower;
  let finalKnockbackY = knockbackHeight;

  if (currentVelo) {
    finalKnockbackX += currentVelo.x;;
    finalKnockbackZ += currentVelo.z;
  }
  const dirX = -Math.sin(rotationY);
  const dirZ = Math.cos(rotationY);

  // Normalize direction (already unit length if from rotation)
  const magnitude = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const normX = dirX / magnitude;
  const normZ = dirZ / magnitude;

  // Multiply by horizontal strength to get force vector
  const horizontalStrength = knockbackPower; // your calculated value
  const knockbackVector = {
    x: normX * horizontalStrength,
    z: normZ * horizontalStrength
  };

  const verticalStrength = knockbackHeight; // your calculated value

  // New V2 usage
  try {
    hitEntity.applyKnockback(knockbackVector, verticalStrength);
  } catch (e) {
  }
  let damage = 1;
  if (selectedItem) {
    const matchedItem = items.find(item => item.typeId === selectedItem.typeId);
    damage = (matchedItem?.extraDamage || 1) * getCooldownDamageScale(cooldownPercent);
    if (isCritical) damage *= 1.5;
    damage += getSharpnessDamage(selectedItem) + getStrengthDamage(attacker) - getWeaknessDamage(attacker);
  }
  if (attacker.hasTag("sword")) {
    damage = damage + 15
  }
  if (attacker.hasTag("sword_axe")) {
    damage = damage + 28
  }
  hitEntity.applyDamage(damage);
  hitEntity.addTag("hit");
  attacker.addTag("shield_hit");
  system.runTimeout(() => hitEntity.removeTag("hit"), 10);
}

function getCooldownDamageScale(percent) {
  if (percent <= 0) return 0.0;
  if (percent >= 100) return 1.0;

  const thresholds = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const outputs = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3125, 0.3445, 0.3805, 0.4205, 0.4645, 0.5125, 0.5645, 0.6205, 0.6805, 0.7445, 0.8125, 0.8845, 0.9605, 1.0];
  const index = thresholds.findIndex((value, i) => percent > value && percent <= thresholds[i + 1]);
  const t1 = thresholds[index];
  const t2 = thresholds[index + 1];
  const o1 = outputs[index];
  const o2 = outputs[index + 1];
  return o1 + ((percent - t1) / (t2 - t1)) * (o2 - o1);
}

// === Miscellaneous Systems ===
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (!player) continue;
    player.removeTag("hit");
    player.removeTag("swapping");
    player.removeTag("fire");
    player.addTag("shield_hit");
  }
}, 600);

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    if (!player) continue;
    player.removeTag("shield_b");
  }
}, 6000);

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
  "bf:netherite_sword"
];

function itemDurabilityDecrease(itemStack, player, decreaseAmount, offhand = false) {
  const durability = itemStack.getComponent("durability");
  if (durability) {
    durability.damage += decreaseAmount;
    if (durability.damage >= durability.maxDurability) {
      const inv = player.getComponent("minecraft:inventory")?.container;
      const equippable = player.getComponent("minecraft:equippable");

      if (offhand && equippable) {
        equippable.setEquipment(EquipmentSlot.Offhand, undefined);
      } else if (inv) {
        inv.setItem(player.selectedSlotIndex, undefined);
      }
      player.runCommand(`playsound random.break @a ~~~`);
      return null;
    }
  }
  return itemStack;
}

world.afterEvents.playerBreakBlock.subscribe((eventData) => {
  const { player, itemStackBeforeBreak } = eventData;
  if (!itemStackBeforeBreak || !itemList.includes(itemStackBeforeBreak.typeId)) {
    return;
  }
  const newItem = itemDurabilityDecrease(itemStackBeforeBreak, player, 1);
  const inv = player.getComponent("inventory").container;
  if (newItem) {
    inv.setItem(player.selectedSlotIndex, newItem);
  }
});

world.afterEvents.entityDie.subscribe((event) => {
  const { deadEntity } = event;
  if (world.getDynamicProperty("death") === true) {
    if (deadEntity.typeId === "minecraft:player") {
      const killer = recentHits.get(deadEntity.id);
      if (killer && killer.typeId === "minecraft:player") {
        const deathMessage = `§l${deadEntity.name} was slain by ${killer.name}`;
        world.sendMessage(deathMessage);
      }
      recentHits.delete(deadEntity.id);
    }
  }
});

system.runInterval(() => {
  if (!cachedProps.mace) return;

  for (const player of world.getPlayers()) {
    const playerId = player.id;
    const velocity = player.getVelocity?.();
    const currentY = player.location.y;

    if (!velocity) continue;

    let fallData = playerFallData.get(playerId);

    // Check if player started falling
    if (velocity.y < -0.2 && (!fallData || !fallData.isFalling)) {
      playerFallData.set(playerId, {
        startY: currentY,
        isFalling: true
      });
    }
    // Check if player stopped falling (landed or upward movement)
    else if (velocity.y >= -0.2 && fallData && fallData.isFalling) {
      // Reset fall data
      playerFallData.set(playerId, {
        startY: currentY,
        isFalling: false
      });
    }
  }
}, 2); // Run every tick for accurate tracking

// === Player Data Cleanup on Leave ===
world.afterEvents.playerLeave.subscribe(event => {
  const playerId = event.playerId;
  cooldowns.delete(playerId);
  activeCooldowns.delete(playerId);
  recentHits.delete(playerId);
  crossbowShotPlayers.delete(playerId);
  lastItemDamageTick.delete(playerId);
  playerFallData.delete(playerId);
  delete playerdata[playerId];
});
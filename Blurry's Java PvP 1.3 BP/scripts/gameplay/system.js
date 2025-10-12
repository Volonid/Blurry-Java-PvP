import { world, Player, system, EquipmentSlot, ItemStack } from '@minecraft/server';
import { ModalFormData } from "@minecraft/server-ui";

class CombatSystem {
  constructor() {
    this.cooldowns = new Map();
    this.activeCooldowns = new Set();
    this.recentHits = new Map();
    this.crossbowShotPlayers = new Map();
    this.playerFallData = new Map();
    this.playerStates = new Map();
    this.lastItemDamageTick = new Map();
    this.lastArmorType = new Map();
    this.entityCache = new Map();
    this.cachedProps = {};
    this.lastPropUpdate = 0;
    this.currentPlayerIndex = 0;
    this.processingPhase = 0;
  }

  updateCachedProps() {
    const now = system.currentTick;
    if (now - this.lastPropUpdate < 120) return;

    this.cachedProps = {
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
    this.lastPropUpdate = now;
  }

  processPlayers() {
    this.updateCachedProps();
    const players = world.getPlayers();
    if (players.length === 0) return;

    for (let i = 0; i < Math.min(2, players.length); i++) {
      const player = players[this.currentPlayerIndex];
      if (player && player.isValid) {
        this.processPlayer(player);
      }
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % players.length;
    }

    if (this.currentPlayerIndex === 0) {
      this.processingPhase = (this.processingPhase + 1) % 3;
    }
  }

  processPlayer(player) {
    const playerId = player.id;
    const currentTick = system.currentTick;

    let state = this.playerStates.get(playerId);
    if (!state) {
      state = {
        isOnGround: false,
        isSprinting: false,
        isFalling: false,
        lastEntityQuery: 0,
        nearbyEntities: [],
        lastArmorCheck: 0,
        currentArmor: new Map(),
        lastMainLogic: 0
      };
      this.playerStates.set(playerId, state);
    }

    state.isOnGround = player.isOnGround;
    state.isSprinting = player.isSprinting;
    state.isFalling = player.isFalling;

    switch (this.processingPhase) {
      case 0: this.processCombatLogic(player, state, currentTick); break;
      case 1: this.processEntityQueries(player, state, currentTick); break;
      case 2: this.processEffectsAndSounds(player, state, currentTick); break;
    }

    this.processImmediateLogic(player, state, currentTick);
  }

  getNearbyEntitiesCached(player, types, maxDistance, cacheKey, cacheTime = 20) {
    const currentTick = system.currentTick;
    const key = `${player.id}_${cacheKey}`;

    const cached = this.entityCache.get(key);
    if (cached && currentTick - cached.timestamp < cacheTime) {
      return cached.entities;
    }

    const entities = player.dimension.getEntities({
      location: player.location,
      maxDistance: maxDistance,
      types: types
    });

    this.entityCache.set(key, { entities, timestamp: currentTick });
    return entities;
  }

  processCombatLogic(player, state, currentTick) {
    if (currentTick - state.lastMainLogic < 10) return;
    state.lastMainLogic = currentTick;

    if (this.cachedProps.java) {
      const kbValue = player.getDynamicProperty("kb");
      const kbHitValue = player.getDynamicProperty("kbhit");
      const isSprinting = player.isSprinting;

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

    if (this.cachedProps.cpvp) {
      const crystals = this.getNearbyEntitiesCached(
        player,
        ["minecraft:ender_crystal"],
        6,
        "crystals",
        5
      );

      for (const crystal of crystals) {
        crystal.triggerEvent("minecraft:crystal_explode");
      }
    }

    if (this.cachedProps.op === true) {
      const cooldownPercent = Math.min(this.getCooldownPercent(player, "sweep") || 0, 100);
      const inv = player.getComponent("inventory")?.container;
      const item = inv?.getItem(player.selectedSlotIndex);
      const lastItem = player.getDynamicProperty("last_item_held") ?? "";

      if (item?.typeId) {
        const itemId = item.typeId;

        if (itemId !== lastItem || player.hasTag("swapping")) {
          if (this.handleItemSwitch(player, itemId, lastItem)) return;
        } else if (itemId.includes("_axe") && !player.hasTag("axe")) {
          player.addTag("axe");
        }

        const isTool = itemId === "minecraft:trident" ||
          itemId.includes("_pickaxe") || itemId.includes("_shovel") || itemId.includes("_hoe");
        if (isTool && (cooldownPercent < 70 || cooldownPercent === 0)) {
          player.addEffect("weakness", 2, { amplifier: 255, showParticles: false });
        }
      } else {
        if (lastItem !== "§") player.setDynamicProperty("last_item_held", "§");
        if (player.hasTag("axe")) player.removeTag("axe");
      }
    }

    if (player.getEffect("saturation")) {
      player.setHunger(20);
      player.setSaturation(20);
    }
  }

  processEntityQueries(player, state, currentTick) {
    if (currentTick - state.lastEntityQuery < 20) return;
    state.lastEntityQuery = currentTick;

    if (this.cachedProps.fireworks && !this.crossbowShotPlayers.has(player.id)) {
      const fireworks = this.getNearbyEntitiesCached(
        player,
        ["minecraft:fireworks_rocket"],
        2,
        "fireworks",
        5
      );

      for (const firework of fireworks) {
        firework.triggerEvent("minecraft:explode");
        try {
          firework.dimension.playSound("firework.large_blast", firework.location);
        } catch (e) {
          firework.runCommand("playsound firework.large_blast @a ~~~ 10 1.2");
        }
      }
    }

    if (this.cachedProps.op === false) return;

    if (!player.hasTag("shield")) return;

    const playerLoc = player.location;
    const view = player.getViewDirection();
    const projectiles = this.getNearbyEntitiesCached(
      player,
      ["minecraft:arrow"],
      3,
      "arrows",
      2
    );

    for (const proj of projectiles) {
      const v = proj.getVelocity();
      proj.applyImpulse({ x: -v.x, y: -v.y, z: -v.z });
      const customVelo = { x: view.x * 1.5, y: view.y * 1.5 + 0.2, z: view.z * 1.5 };
      proj.applyImpulse(customVelo);
    }
  }

  processEffectsAndSounds(player, state, currentTick) {
    if (currentTick - state.lastArmorCheck < 10) return;
    state.lastArmorCheck = currentTick;

    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable || player.hasTag("ui_off")) return;

    const slots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
    for (const slot of slots) {
      const armor = equippable.getEquipment(slot);
      const prevType = state.currentArmor.get(slot);
      const currType = armor ? armor.typeId : null;

      if (currType !== prevType) {
        if (currType && !player.hasTag("ui_off")) {
          const sound = this.getArmorSound(currType);
          if (sound) {
            try {
              player.dimension.playSound(sound, player.location);
            } catch (e) {
              player.runCommand(`playsound ${sound} @s ~~~ 1 1`);
            }
          }
        }
        state.currentArmor.set(slot, currType);
      }
    }

    const equippable2 = player.getComponent("minecraft:equippable");
    if (!equippable2) return;

    const hasElytra = equippable2.getEquipment(EquipmentSlot.Chest)?.typeId === "minecraft:elytra";
    const inv = player.getComponent("inventory")?.container;
    const item = inv?.getItem(player.selectedSlotIndex);

    if ((hasElytra && item?.typeId === "minecraft:mace") && !player.hasTag("elytra")) {
      player.addTag("elytra");
    } else if (!hasElytra && player.hasTag("elytra")) {
      player.removeTag("elytra");
    }

    const equippable3 = player.getComponent("minecraft:equippable");
    if (!equippable3) return;

    const offhandItem = equippable3.getEquipment(EquipmentSlot.Offhand);
    const inv2 = player.getComponent("inventory")?.container;
    const mainHandItem = inv2?.getItem(player.selectedSlotIndex);
    const hasShield = (mainHandItem?.hasTag("bf:shield")) || (offhandItem?.hasTag("bf:shield"));

    if (!hasShield) {
      player.runCommand("/playanimation @s animation.player.shield_off a 10000000");
    }
  }

  getArmorSound(typeId) {
    if (!typeId) return null;
    if (typeId.includes("netherite")) return "armor.equip_netherite2";
    if (typeId.includes("diamond")) return "armor.equip_diamond2";
    if (typeId.includes("gold")) return "armor.equip_gold2";
    if (typeId.includes("iron")) return "armor.equip_iron2";
    if (typeId.includes("chain")) return "armor.equip_chain2";
    if (typeId.includes("leather")) return "armor.equip_leather2";
    return "armor.equip_generic2";
  }

  processImmediateLogic(player, state, currentTick) {
    const inv = player.getComponent("inventory")?.container;
    const item = inv?.getItem(player.selectedSlotIndex);
    const cooldownPercent = Math.min(this.getCooldownPercent(player, "sweep") || 0, 100);

    const shouldHaveDamTag = cooldownPercent < 60 && item?.typeId &&
      item.typeId !== "minecraft:mace" && player.hasTag("dam");

    if (shouldHaveDamTag && !player.hasTag("dam")) {
      player.addTag("dam");
    } else if (!shouldHaveDamTag && player.hasTag("dam")) {
      player.removeTag("dam");
    }

    if (this.cachedProps.mace) {
      const playerId = player.id;
      const velocity = player.getVelocity?.();
      const currentY = player.location.y;

      if (!velocity) return;

      let fallData = this.playerFallData.get(playerId);

      if (velocity.y < -0.2 && (!fallData || !fallData.isFalling)) {
        this.playerFallData.set(playerId, {
          startY: currentY,
          isFalling: true
        });
      }
      else if (velocity.y >= -0.2 && fallData && fallData.isFalling) {
        this.playerFallData.set(playerId, {
          startY: currentY,
          isFalling: false
        });
      }
    }
  }

  handleItemSwitch(player, itemId, lastItem) {
    if (player.hasTag("swapping")) {
      player.setDynamicProperty("last_item_held", itemId);
      return true;
    }

    if (itemId === "minecraft:mace" && !lastItem.includes("mace")) {
      player.addTag(lastItem.includes("_axe") ? "sword_axe" : "sword");
      system.runTimeout(() => {
        if (player.isValid) {
          player.removeTag("sword");
          player.removeTag("sword_axe");
          this.activateCooldown(player);
          player.removeTag("axe");
        }
      }, 4);
    }
    else if (itemId.includes("_axe") && !lastItem.includes("_axe")) {
      player.addTag("axe");
      this.activateCooldown(player);
    }
    else if (!itemId.includes("_axe") && lastItem.includes("_axe")) {
      this.activateCooldown(player);
      system.runTimeout(() => { if (player.isValid) player.removeTag("axe"); }, 6);
    }
    else if (itemId.includes("shield") !== lastItem.includes("shield")) {
      this.activateCooldown(player);
    }
    else {
      if (player.hasTag("axe")) player.removeTag("axe");
      this.activateCooldown(player);
    }

    player.setDynamicProperty("last_item_held", itemId);
    return false;
  }

  startCooldown(player, cooldownType, cooldownDuration) {
    const cooldownStart = Date.now();
    const cooldownEnd = cooldownStart + cooldownDuration * 1000;
    const playerCooldowns = this.cooldowns.get(player.id) || {};
    playerCooldowns[cooldownType] = { cooldownStart, cooldownEnd };
    this.cooldowns.set(player.id, playerCooldowns);
    this.activeCooldowns.add(player.id);
    player.addTag("usingItem");
    system.runTimeout(() => {
      if (player.isValid) {
        player.removeTag("usingItem");
      }
    }, 20);
  }

  getCooldownPercent(player, cooldownType) {
    if (!player || !player.id) return 100;
    const playerCooldowns = this.cooldowns.get(player.id) || {};
    const cooldownData = playerCooldowns[cooldownType];
    if (cooldownData) {
      const remainingTime = Math.max(cooldownData.cooldownEnd - Date.now(), 0);
      const cooldownPercent = Math.max(100 - (remainingTime / (cooldownData.cooldownEnd - cooldownData.cooldownStart)) * 100, 0);
      return cooldownPercent;
    }
    return 100;
  }

  activateCooldown(player) {
    const inventory = player.getComponent('minecraft:inventory')?.container;
    const selectedItem = inventory?.getItem(player.selectedSlotIndex);
    if (!selectedItem) {
      this.handleCooldowns(player, null, 0.4, 'sweep');
      return;
    }
    if (player.hasTag("sword")) return;

    const typeId = selectedItem.typeId;
    const tagCooldownMap = {
      'is_sword': 0.625,
      'is_axe': { 'wooden': 1.2, 'stone': 1.1, 'default': 1.0 },
      'is_pickaxe': 0.8, 'is_shovel': 0.8, 'is_hoe': 0.8
    };

    if (typeId.includes("mace")) {
      this.handleCooldowns(player, selectedItem, 1.4, 'sweep');
    } else if (typeId.includes("trident")) {
      this.handleCooldowns(player, selectedItem, 1.2, 'sweep');
    } else {
      for (const [tag, cooldown] of Object.entries(tagCooldownMap)) {
        if (selectedItem.hasTag(tag)) {
          if (typeof cooldown === 'object') {
            const specificCooldown = cooldown[typeId.split(':')[1]] || cooldown.default;
            this.handleCooldowns(player, selectedItem, specificCooldown, 'sweep');
          } else {
            this.handleCooldowns(player, selectedItem, cooldown, 'sweep');
          }
          return;
        }
      }
      this.handleCooldowns(player, selectedItem, 0.4, 'sweep');
    }
  }

  handleCooldowns(player, item, cooldownDuration, cooldownType) {
    const hasteSpeed = this.getHasteSpeed(player);
    const miningSpeed = this.getMiningSpeed(player);
    const adjustedCooldownDuration = cooldownDuration * (1 - (hasteSpeed * 0.5) + (miningSpeed * 0.5));
    this.startCooldown(player, cooldownType, adjustedCooldownDuration);
  }

  getHasteSpeed(entity) {
    if (this.cachedProps.op === false) return 0;
    const hasteEffect = entity.getEffect("minecraft:haste");
    if (!hasteEffect) return 0;
    return 0.03 * (hasteEffect.amplifier + 1);
  }

  getMiningSpeed(entity) {
    if (this.cachedProps.op === false) return 0;
    const miningEffect = entity.getEffect("minecraft:mining_fatigue");
    if (!miningEffect) return 0;
    return 0.03 * (miningEffect.amplifier + 1);
  }

  cleanup() {
    const currentTick = system.currentTick;

    for (const [playerId, state] of this.playerStates.entries()) {
      const player = world.getPlayer(playerId);
      if (!player || !player.isValid()) {
        this.playerStates.delete(playerId);
        this.cooldowns.delete(playerId);
        this.activeCooldowns.delete(playerId);
        this.recentHits.delete(playerId);
        this.crossbowShotPlayers.delete(playerId);
        this.lastItemDamageTick.delete(playerId);
        this.playerFallData.delete(playerId);
        this.lastArmorType.delete(playerId);
      }
    }

    for (const [key, data] of this.entityCache.entries()) {
      if (currentTick - data.timestamp > 600) {
        this.entityCache.delete(key);
      }
    }
  }

  handlePlayerLeave(playerId) {
    this.cooldowns.delete(playerId);
    this.activeCooldowns.delete(playerId);
    this.recentHits.delete(playerId);
    this.crossbowShotPlayers.delete(playerId);
    this.lastItemDamageTick.delete(playerId);
    this.playerFallData.delete(playerId);
    this.playerStates.delete(playerId);
    this.lastArmorType.delete(playerId);
  }
}

const combatSystem = new CombatSystem();

// === CROSSBOW TRACKING ===
world.beforeEvents.itemUse.subscribe((event) => {
  const { itemStack, source } = event;
  if (!itemStack || !source || source.typeId !== "minecraft:player") return;
  if (itemStack.typeId === "minecraft:crossbow") {
    combatSystem.crossbowShotPlayers.set(source.id, true);
    system.runTimeout(() => {
      if (source.isValid) {
        combatSystem.crossbowShotPlayers.delete(source.id);
      }
    }, 60);
  }
});

// === PLAYER HURT EFFECTS ===
world.afterEvents.entityHurt.subscribe((event) => {
  if (combatSystem.cachedProps.op === false) return;
  const entity = event.hurtEntity;
  if (entity?.typeId !== "minecraft:player") return;
  entity.runCommand(`playsound hit @a ~~~`);
  try {
    if (event.damage <= 5) return;
    const equippable = entity.getComponent("minecraft:equippable");
    if (equippable) {
      const slots = [
        EquipmentSlot.Head,
        EquipmentSlot.Chest,
        EquipmentSlot.Legs,
        EquipmentSlot.Feet
      ];
      for (const slot of slots) {
        const armor = equippable.getEquipment(slot);
        if (armor && armor.getComponent && armor.getComponent("durability")) {
          const durabilityComp = armor.getComponent("durability");
          if (durabilityComp.damage > 0) {
            durabilityComp.damage = Math.max(0, durabilityComp.damage - 1);
            equippable.setEquipment(slot, armor);
          }
        }
      }
    }
  } catch (e) { }
  const poison = entity.getEffect("minecraft:poison");
  const wither = entity.getEffect("minecraft:wither");
  if (poison || wither) {
    try {
      entity.applyKnockback({ x: 0, z: 0 }, 0);
    } catch (e) { }
  }
});

// === ENTITY HIT HANDLER ===
const vec2YSub = (a, b) => a.y - b.y;
const itemList = [
  "bf:wooden_axe", "bf:wooden_sword", "bf:stone_axe", "bf:stone_sword",
  "bf:iron_axe", "bf:iron_sword", "bf:copper_axe", "bf:copper_sword",
  "bf:golden_axe", "bf:golden_sword", "bf:diamond_axe", "bf:diamond_sword",
  "bf:netherite_axe", "bf:netherite_sword"
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
  if (combatSystem.cachedProps.player === true && combatSystem.cachedProps.shield === true) {
    if (target.typeId === "minecraft:player") {
      const offhandItem = target.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand);
      const inventory = target.getComponent("minecraft:inventory")?.container;
      const mainHandItem = inventory.getItem(target.selectedSlotIndex);
      if (mainHandItem && mainHandItem.typeId === "minecraft:mace") attacker.addTag("hit");
      system.runTimeout(() => {
        if (attacker.isValid) attacker.removeTag("hit");
      }, 10);
      if (!target.hasTag("usingItem") && (target.hasTag("shield_br") || (target.hasTag("shield") || world.scoreboard.getObjective("shield_up")?.getScore(target) != 0)) && !target.hasTag("shield_b") && (offhandItem?.hasTag("bf:shield") || mainHandItem?.hasTag("bf:shield")) && !(YDeferent <= 90 && YDeferent >= -90)) {
        const equippable = target.getComponent("minecraft:equippable");
        if (equippable && inventory) {
          const tick = system.currentTick;
          const lastTick = combatSystem.lastItemDamageTick.get(target.id) || 0;
          if (tick - lastTick > 5) {
            combatSystem.lastItemDamageTick.set(target.id, tick);
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
        combatSystem.activateCooldown(attacker);
        const velocity = attacker.getVelocity?.();
        if (attacker.hasTag("axe")) {
          target.runCommand("playsound random.break @a ~~~ 10 1.2");
          target.addTag("shield_b");
          target.runCommand(`event entity @s bf:shield_remove`);
          target.runCommand(`scoreboard players set @s shield_up 0`);
          target.removeTag("shield");
          target.removeTag("shield_up");
          target.removeTag("shield_br");

          const attackerId = attacker.id;
          const fallData = combatSystem.playerFallData.get(attackerId);
          if (fallData && fallData.isFalling) {
            const currentFallDistance = fallData.startY - attacker.location.y;
            console.log(currentFallDistance);
            if (currentFallDistance >= 2.5 && combatSystem.cachedProps.mace) {
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

              const attackerId = attacker.id;
              const fallData = combatSystem.playerFallData.get(attackerId);
              if (fallData && fallData.isFalling) {
                const currentFallDistance = fallData.startY - attacker.location.y;
                if (currentFallDistance >= 2.5 && combatSystem.cachedProps.mace) {
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
    const currentVelocity = attacker.getVelocity();
    try {
      const rotationY = attacker.getRotation().y * (Math.PI / 180);
      const knockbackX = -Math.sin(rotationY) * 0.79;
      const knockbackZ = Math.cos(rotationY) * 0.79;
      const knockbackY = -0.1;
      attacker.applyKnockback({
        x: currentVelocity.x + knockbackX,
        z: currentVelocity.z + knockbackZ
      }, currentVelocity.y + knockbackY);
    } catch (e) { }
    if (!inventory) return;
    const mainHandItem = inventory.getItem(attacker.selectedSlotIndex);
    if (mainHandItem?.typeId.includes("axe")) {
      target.addTag("shield_b");
      system.runTimeout(() => {
        if (target.isValid) {
          target.removeTag("shield_b");
          target.runCommand("playsound random.orb @s");
        }
      }, 100);
      return;
    }
    combatSystem.activateCooldown(attacker);
    attacker.runCommand("playsound item.shield.block @s");
    target.runCommand("playsound item.shield.block @s");
    return;
  }
  if (combatSystem.cachedProps.op === true) {
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

        const attackerId = attacker.id;
        const fallData = combatSystem.playerFallData.get(attackerId);
        if (fallData && fallData.isFalling) {
          const currentFallDistance = fallData.startY - attacker.location.y;
          if (currentFallDistance >= 2.5 && combatSystem.cachedProps.mace) {
            const mainHandItem = attacker.getComponent("minecraft:inventory")?.container?.getItem(attacker.selectedSlotIndex);
            if (mainHandItem && mainHandItem.typeId === "minecraft:mace") {
              try {
                attacker.applyKnockback({ x: 0, z: 0 }, 0);
              } catch (e) { }
            }
          }
        }
        system.clearRun(intervalId);
      } else if (checkCount >= 5) {
        system.clearRun(intervalId);
      }
    }, 1);
  }
  if (attacker.typeId != "minecraft:player") return;
  handleHit(attacker, target);
  combatSystem.recentHits.set(target.id, attacker);
  system.runTimeout(() => combatSystem.recentHits.delete(target.id), 20);
  combatSystem.activateCooldown(attacker);
});

// === HIT HANDLER FUNCTION ===
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
    [1, 1], [2, 1.5], [3, 2], [4, 2.5], [5, 3]
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

function areEntitiesMoreThanBlocksApart(entity1, entity2) {
  const loc1 = entity1.location;
  const loc2 = entity2.location;
  const dx = loc1.x - loc2.x;
  const dy = loc1.y - loc2.y;
  const dz = loc1.z - loc2.z;
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  return distanceSquared > 12.4;
}

function handleHit(attacker, hitEntity) {
  if (!attacker || !hitEntity || hitEntity.isDead) return;
  const cooldownPercent = combatSystem.getCooldownPercent(attacker, "sweep");
  const inventory = attacker.getComponent("inventory")?.container;
  const selectedItem = inventory?.getItem(attacker.selectedSlotIndex);
  const playerState = combatSystem.playerStates.get(attacker.id) || {};
  let isCritical = (!playerState.isOnGround && playerState.isFalling && !attacker.isInWater) ||
    (attacker.isInWater && !playerState.isSprinting);
  let isKnockBack = playerState.isSprinting || (selectedItem?.typeId.includes("_axe"));
  const javaProp = combatSystem.cachedProps.java;
  const kbProp = attacker.getDynamicProperty("kb");
  if (javaProp) {
    if (kbProp !== undefined) {
      isKnockBack = kbProp;
      isCritical = (!playerState.isOnGround && playerState.isFalling && !kbProp);
    }
  }
  const spamProp = combatSystem.cachedProps.spam;
  if (attacker.hasTag("dam") || attacker.hasTag("elytra")) return;
  const lagProp = combatSystem.cachedProps.lag;
  if (cooldownPercent < 70) {
    console.log(`Cooldown Percent: ${cooldownPercent}`);
    if (selectedItem?.typeId === "minecraft:mace") {
      const dimension = hitEntity.dimension;
      const hitLoc = hitEntity.location;
      dimension.spawnParticle("bf:damage_indicator_emitter", hitLoc);
      hitEntity.runCommand(`playsound hit @a ~~~`);
      attacker.addTag("dam");
      return;
    }
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
  if (cooldownPercent >= 60 || !spamProp) {
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
      if (combatSystem.cachedProps.cpvp) {
        knockbackHeight += kb * 0.2;
      }
    }
    if (hitEntity.typeId === "minecraft:player" && !playerState.isOnGround) {
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
        if (combatSystem.cachedProps.cpvp) {
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
  const magnitude = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const normX = dirX / magnitude;
  const normZ = dirZ / magnitude;
  const horizontalStrength = knockbackPower;
  const knockbackVector = {
    x: normX * horizontalStrength,
    z: normZ * horizontalStrength
  };
  const verticalStrength = knockbackHeight;
  hitEntity.applyKnockback(knockbackVector, verticalStrength);
  let damage = 1;
  if (selectedItem) {
    const items = [];
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
  system.runTimeout(() => {
    if (hitEntity.isValid) {
      hitEntity.removeTag("hit");
    }
  }, 10);
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

// === SCRIPT EVENT HANDLERS ===
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (combatSystem.cachedProps.op === false) return;
  const { id, sourceEntity } = event;
  const cooldownPercent = combatSystem.getCooldownPercent(sourceEntity, "sweep");
  if (id === "bf:attack" && cooldownPercent > 25) {
    if (sourceEntity?.typeId === "minecraft:player") {
      combatSystem.activateCooldown(sourceEntity);
    }
  }
  if (id === "bf:player") {
    if (sourceEntity?.typeId === "minecraft:player") {
      world.setDynamicProperty("player", true);
    }
  }
});

// === BLOCK BREAK HANDLER ===
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

// === CLEANUP INTERVALS ===
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

// === PLAYER LEAVE CLEANUP ===
world.afterEvents.playerLeave.subscribe(event => {
  combatSystem.handlePlayerLeave(event.playerId);
});

// === MAIN COMBAT SYSTEM LOOPS ===
system.runInterval(() => {
  combatSystem.processPlayers();
}, 2);

system.runInterval(() => {
  combatSystem.cleanup();
}, 6000);

export function getCooldownPercent(player, cooldownType) {
  return combatSystem.getCooldownPercent(player, cooldownType);
}

console.log("Optimized Combat System Loaded");
import { world, system, TicksPerSecond, EquipmentSlot, Player } from '@minecraft/server';
import { getCooldownPercent } from '../gameplay/system.js';

Player.prototype.getHunger = function() {
  return this.getComponent("player.hunger")?.currentValue;
};

Player.prototype.setHunger = function(number) {
  this.getComponent("player.hunger")?.setCurrentValue(number);
};

Player.prototype.getSaturation = function() {
  return this.getComponent("player.saturation")?.currentValue;
};

Player.prototype.setSaturation = function(number) {
  this.getComponent("player.saturation")?.setCurrentValue(number);
};

Player.prototype.getExhaustion = function() {
  return this.getComponent("player.exhaustion")?.currentValue;
};

Player.prototype.setExhaustion = function(number) {
  this.getComponent("player.exhaustion")?.setCurrentValue(number);
};

function getHealthComponent(entity) {
    return entity.getComponent('minecraft:health');
}

function getEffect(entity, effectName) {
    return entity.getEffect(effectName);
}

function gethealth(entity) {
    const healthEffect = getEffect(entity, "minecraft:health_boost");
    if (!healthEffect) {return 0;}
    const amplifier = healthEffect.amplifier;
    const health = 4 * (amplifier + 1);
    return health;
}

function getArmorGlyph(item) {
  if (!item || !item.typeId || !item.getComponent) return '';
  const durabilityComp = item.getComponent('minecraft:durability');
  if (!durabilityComp) return '';
  const max = durabilityComp.maxDurability;
  const current = durabilityComp.damage;
  if (typeof max !== 'number' || typeof current !== 'number') return '';
  const percent = 1 - (current / max);
  const idx = Math.max(0, Math.min(armorGlyphs.length - 1, Math.floor(percent * 10)));
  return armorGlyphs[idx];
}

function getEntityInView(player, maxDistance = 4, radius = 0.5, radius_y = 2) {
  if (world.getDynamicProperty("op") === false) return "f";
  const view = player.getViewDirection();
  const origin = player.getHeadLocation();
  const entities = player.dimension.getEntities({
    location: origin,
    maxDistance: maxDistance + Math.max(radius, radius_y)
  });

  for (const entity of entities) {
    if (entity.id === player.id) continue;
    const eloc = entity.location;
    const dx = eloc.x - origin.x;
    const dy = eloc.y - origin.y;
    const dz = eloc.z - origin.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist > maxDistance) continue;
    const dot = dx * view.x + dy * view.y + dz * view.z;
    if (dot < 0) continue;
    const proj = {
      x: origin.x + view.x * dot,
      y: origin.y + view.y * dot,
      z: origin.z + view.z * dot
    };
    if (
      Math.abs(eloc.x - proj.x) <= radius &&
      Math.abs(eloc.y - proj.y) <= radius_y &&
      Math.abs(eloc.z - proj.z) <= radius
    ) {
      return "t";
    }
  }
  return "f";
}

const saturationIcons = [
  '','','','','','','','','','','','','','','','','','','','','',''
];

const armorGlyphs = [
  '', // 10%
  '', // 20%
  '', // 30%
  '', // 40%
  '', // 50%
  '', // 60%
  '', // 70%
  '', // 80%
  '', // 90%
  ''  // 100%
];

const shieldGlyphs = [
  '', // 10%
  '', // 20%
  '', // 30%
  '', // 40%
  '', // 50%
  '', // 60%
  '', // 70%
  '', // 80%
  '', // 90%
  ''  // 100%
];

system.runInterval(() => {
  const hudDisplayMode = world.getDynamicProperty("hud_display_mode");
  world.getAllPlayers().forEach(player => {
      const isSaturationDisplayOn = player.getDynamicProperty("sat_hud");
      const isArmorDisplayOn = player.getDynamicProperty("armor_hud");
      const isShieldDisplayOn = player.getDynamicProperty("shield_hud");
      const cooldownEnabled = player.getDynamicProperty("cooldown") ?? true;
      // --- Shield_b cooldown display ---
      let shieldGlyphDisplay = '';
      let shieldCooldown = player.getDynamicProperty('shield_b_cd');
      const healthComp = getHealthComponent(player);
      const maxHealth = healthComp.value;
      const saturationTime = player.getSaturation();
      let sat = '';
      if (isSaturationDisplayOn === false || player.matches({gameMode: 'Creative'}) || player.matches({gameMode: 'Spectator'})) {
        sat = '';
      } else if (typeof saturationTime === 'number' && !isNaN(saturationTime)) {
        if (saturationTime >= 20) {
          sat = saturationIcons[saturationIcons.length - 1];
        } else if (saturationTime <= 0) {
          sat = saturationIcons[0];
        } else {
          sat = saturationIcons[Math.floor(saturationTime)];
        }
      } else {
        sat = '';
      }
      const { platformType } = player.clientSystemInfo;
      let offhand = "  "
      let heart = ""
      const extraHealth = gethealth(player);
      if (player.hasTag("heal") && extraHealth === 0 && maxHealth === 20) {
        heart = ""
      }
      let space = `    `
      let space2 = `                     `
      if (platformType === "Desktop") {
          space = `    `
          space2 = `                     `
      } else if (platformType === "Mobile" && player.getDynamicProperty("offset") === true) {
        space = `         `
        space2 = `                          `
      } else if (platformType === "Console") {
        space = `    `
        space2 = `                       `
      }
      if (player.hasTag('shield_b')) {
        // Always treat shieldCooldown as a number
        let cd = Number(shieldCooldown);
        if (!Number.isFinite(cd) || cd <= 0) {
          cd = 120;
        } else {
          cd--;
        }
        player.setDynamicProperty('shield_b_cd', cd);
        // Show glyphs (10 steps)
        let shieldIdx = Math.floor((cd / 120) * 10);
        shieldIdx = Math.max(0, Math.min(9, shieldIdx));
        if (isShieldDisplayOn) {
          shieldGlyphDisplay = space2 + shieldGlyphs[shieldIdx] + '\n';
        }
        // Remove tag if finished
        if (cd <= 0) {
          player.removeTag('shield_b');
          player.setDynamicProperty('shield_b_cd', undefined);     
        }
      }
      let dira = '';
      const equippable = player.getComponent('minecraft:equippable');
      let showWarning = false;
      // Animate up/down every 5 ticks
      const tick = Math.floor(system.currentTick / 10) % 2;
      if (isArmorDisplayOn && equippable) {
        const armorSlots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
        for (const slot of armorSlots) {
          const item = equippable.getEquipment(slot);
          if (item && item.getComponent) {
            const durabilityComp = item.getComponent('minecraft:durability');
            if (durabilityComp) {
              const max = durabilityComp.maxDurability;
              const current = durabilityComp.damage;
              if (typeof max === 'number' && typeof current === 'number') {
                const percent = 1 - (current / max);
                if (percent <= 0.2) {
                  showWarning = true;
                  break;
                }
              }
            }
          }
        }
        if (showWarning) {
          if (tick === 0) {
            dira += space2 + '\n\n\n\n';
          } else {
            dira += space2 + '\n\n\n';
          }
        }
        const helmet = equippable.getEquipment(EquipmentSlot.Head);
        const chest = equippable.getEquipment(EquipmentSlot.Chest);
        const legs = equippable.getEquipment(EquipmentSlot.Legs);
        const boots = equippable.getEquipment(EquipmentSlot.Feet);
        dira += space2 + getArmorGlyph(helmet) + '\n';
        dira += space2 + getArmorGlyph(chest) + '\n';
        dira += space2 + getArmorGlyph(legs) + '\n';
        dira += space2 + getArmorGlyph(boots) + '\n \n \n \n';
      }
      let newActionbarText = "notification." + shieldGlyphDisplay + dira + heart + space + sat;
      if ((hudDisplayMode === 0 || hudDisplayMode === undefined)) {
      } else {
        newActionbarText = "";
      }
    if (cooldownEnabled) {
      const cooldownPercent = Math.min(getCooldownPercent(player, "sweep") || 0, 100);
      const lastPercent = player.getDynamicProperty("lastCooldownPercent") ?? 0;
      const lastEntity = player.getDynamicProperty("lastEntityInView") ?? "f";
      const entity = getEntityInView(player);
      // --- GLYPH SYSTEM ---
      // Map percent to glyph using a lookup table
      const glyphMap = [
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', ''
      ];
      const glyphIndex = Math.max(0, Math.min(32, Math.round((cooldownPercent / 100) * 32)));
      const glyph = glyphMap[glyphIndex];
      let title = glyph;
      if (cooldownPercent >= 100) {
        if (entity === "t") {
          title = "";
        } else {
          // Show nothing at 100% if no entity
          title = '';
        }
      } else if (entity === "t") {
        // If entity in view and not 100%, use a different glyph map for the bar
        const entityGlyphMap = [
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', '',
        '', '', '', '', '', '', '', ''
        ];
        title = entityGlyphMap[glyphIndex];
      }
      if (!title) title = "";
      // Only send toast when cooldown just finished or entity === "t" went from on to off
      let sent = false;
      function showHudToast(msg) {
        let subTitle = "notification." + shieldGlyphDisplay + dira + heart + space + sat
        if (hudDisplayMode === 1) {
          player.onScreenDisplay.setActionBar(subTitle);
        }
        if (hudDisplayMode === 0 && !player.hasTag("ui_off")) {
          const titleText = "notificatiom." + msg.replace("toast.", "");
          player.onScreenDisplay.setTitle(titleText, {
            stayDuration: 0,
            fadeInDuration: 0,
            fadeOutDuration: 0,
          });
          player.onScreenDisplay.updateSubtitle(subTitle);
        } else {
          player.sendMessage(msg);
        }
      }
      if (cooldownPercent >= 100) {
        if (entity === "t") {
          showHudToast("toast.");
        } else {
          showHudToast("toast.");
        }
        sent = true;
      }
      if (!sent && Math.floor(cooldownPercent) !== Math.floor(lastPercent) && cooldownPercent < 100) {
        showHudToast("toast." + title);
      }
      player.setDynamicProperty("lastCooldownPercent", cooldownPercent);
      player.setDynamicProperty("lastEntityInView", entity);
    }
  });
});
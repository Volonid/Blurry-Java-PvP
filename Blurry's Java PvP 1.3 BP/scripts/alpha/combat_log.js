import { world, system, Player } from "@minecraft/server";

class CombatTracker {
    constructor() {
        this.combatPlayers = new Map();
        this.combatDuration = 20 * 20;
        this.lastPlayerCheck = 0;
        this.lastCleanup = 0;
        this.cachedCombatLoggers = null;
        this.cacheTime = 0;
    }

    isEnabled() {
        const sliderValue = world.getDynamicProperty('combat_log');
        return sliderValue !== 0;
    }

    getTimerSeconds() {
        const sliderValue = world.getDynamicProperty('combat_log');

        const timerOptions = {
            0: 0,
            1: 10,
            2: 15,
            3: 20,
            4: 30,
            5: 60
        };

        return timerOptions[sliderValue] || 20;
    }

    getTimerDisplayName() {
        const sliderValue = world.getDynamicProperty('combat_log');
        const displayNames = {
            0: "Off",
            1: "10 seconds",
            2: "15 seconds",
            3: "20 seconds",
            4: "30 seconds",
            5: "1 minute"
        };
        return displayNames[sliderValue] || "20 seconds";
    }

    enterCombat(player) {
        if (!this.isEnabled()) return;

        this.combatDuration = this.getTimerSeconds() * 20;

        const playerId = player.id;
        const currentTime = system.currentTick;

        const existing = this.combatPlayers.get(playerId);
        if (!existing || currentTime > existing.expireTime - 100) {
            this.combatPlayers.set(playerId, {
                name: player.name,
                expireTime: currentTime + this.combatDuration
            });

            if (!player.getDynamicProperty('inCombat')) {
                player.sendMessage("§cYou have entered combat!");
                player.setDynamicProperty('inCombat', true);
            }
        }
    }

    leaveCombat(player) {
        const playerId = player.id;
        if (this.combatPlayers.has(playerId)) {
            this.combatPlayers.delete(playerId);
            player.setDynamicProperty('inCombat', false);
            player.sendMessage("§aYou have left combat");
        }
    }

    getCombatLoggers() {
        const currentTime = system.currentTick;
        if (!this.cachedCombatLoggers || currentTime - this.cacheTime > 100) {
            this.cachedCombatLoggers = JSON.parse(world.getDynamicProperty('combatLoggers') || '{}');
            this.cacheTime = currentTime;
        }
        return this.cachedCombatLoggers;
    }

    setCombatLoggers(combatLoggers) {
        this.cachedCombatLoggers = combatLoggers;
        this.cacheTime = system.currentTick;
        world.setDynamicProperty('combatLoggers', JSON.stringify(combatLoggers));
    }

    handlePlayerQuit(playerName, playerId) {
        if (!this.isEnabled()) return;

        const combatLoggers = this.getCombatLoggers();

        if (!combatLoggers[playerName]) {
            combatLoggers[playerName] = {
                playerId: playerId,
                logoutTime: system.currentTick
            };
            this.setCombatLoggers(combatLoggers);

            this.broadcastToAll(`§6${playerName} has logged out in combat!`);
        }
    }

    handlePlayerJoin(player) {
        if (!this.isEnabled()) return;

        const combatLoggers = this.getCombatLoggers();

        if (combatLoggers[player.name]) {
            delete combatLoggers[player.name];
            this.setCombatLoggers(combatLoggers);

            this.punishPlayer(player);
        }

        if (player.getDynamicProperty('inCombat')) {
            player.setDynamicProperty('inCombat', false);
        }
    }

    punishPlayer(player) {
        try {
            player.kill();
            player.sendMessage("§4You were killed for logging out during combat!");
            this.notifyNearbyPlayers(player, `${player.name} was killed for combat logging!`);
        } catch (error) {
        }
    }

    broadcastToAll(message) {
        const players = world.getPlayers();
        for (const p of players) {
            p.sendMessage(message);
        }
    }

    notifyNearbyPlayers(targetPlayer, message) {
        const players = world.getPlayers();
        const targetLoc = targetPlayer.location;

        for (const player of players) {
            if (player.id !== targetPlayer.id && player.location) {
                const dist = this.getDistance(player.location, targetLoc);
                if (dist < 50) {
                    player.sendMessage(`§6${message}`);
                }
            }
        }
    }

    getDistance(loc1, loc2) {
        const dx = loc1.x - loc2.x;
        const dy = loc1.y - loc2.y;
        const dz = loc1.z - loc2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    updatePlayerTracking(currentTime) {
        if (!this.isEnabled()) return;

        if (currentTime - this.lastPlayerCheck < 40) return;

        this.lastPlayerCheck = currentTime;
        const currentPlayers = world.getPlayers();
        const currentPlayerIds = new Set(currentPlayers.map(p => p.id));

        for (const [playerId, combatData] of this.combatPlayers.entries()) {
            if (!currentPlayerIds.has(playerId)) {
                this.handlePlayerQuit(combatData.name, playerId);
                this.combatPlayers.delete(playerId);
            }
        }
    }

    cleanup(currentTime) {
        if (currentTime - this.lastCleanup < 200) return;
        this.lastCleanup = currentTime;

        for (const [playerId, combatData] of this.combatPlayers.entries()) {
            if (currentTime >= combatData.expireTime) {
                const player = world.getPlayers().find(p => p.id === playerId);
                if (player) {
                    this.leaveCombat(player);
                } else {
                    this.combatPlayers.delete(playerId);
                }
            }
        }

        const combatLoggers = this.getCombatLoggers();
        if (Object.keys(combatLoggers).length > 0) {
            let changed = false;
            for (const [playerName, data] of Object.entries(combatLoggers)) {
                if (currentTime - data.logoutTime > 12000) {
                    delete combatLoggers[playerName];
                    changed = true;
                }
            }
            if (changed) {
                this.setCombatLoggers(combatLoggers);
            }
        }
    }
}

const tracker = new CombatTracker();

system.runInterval(() => {
    const currentTime = system.currentTick;

    if (tracker.isEnabled()) {
        tracker.updatePlayerTracking(currentTime);

        const players = world.getPlayers();
        for (const player of players) {
            const lastChecked = player.getDynamicProperty('lastCombatCheck') || 0;
            if (currentTime - lastChecked > 100) {
                tracker.handlePlayerJoin(player);
                player.setDynamicProperty('lastCombatCheck', currentTime);
            }
        }

        tracker.cleanup(currentTime);
    }
}, 20);

const recentHits = new Map();

function setupCombatDetection() {
    world.afterEvents.entityHitEntity.subscribe((event) => {
        if (!tracker.isEnabled()) return;

        if (event.damagingEntity instanceof Player && event.hitEntity instanceof Player) {
            const currentTime = system.currentTick;
            const hitKey = `${event.damagingEntity.id}_${event.hitEntity.id}`;

            if (!recentHits.has(hitKey) || currentTime - recentHits.get(hitKey) > 10) {
                tracker.enterCombat(event.damagingEntity);
                tracker.enterCombat(event.hitEntity);
                recentHits.set(hitKey, currentTime);
            }
        }
    });

    world.afterEvents.entityHurt.subscribe((event) => {
        if (!tracker.isEnabled()) return;

        const hurtEntity = event.hurtEntity;
        const damageSource = event.damageSource;

        if (hurtEntity instanceof Player && damageSource && damageSource.damagingEntity instanceof Player) {
            const currentTime = system.currentTick;
            const hitKey = `${damageSource.damagingEntity.id}_${hurtEntity.id}`;

            if (!recentHits.has(hitKey) || currentTime - recentHits.get(hitKey) > 10) {
                tracker.enterCombat(hurtEntity);
                tracker.enterCombat(damageSource.damagingEntity);
                recentHits.set(hitKey, currentTime);
            }
        }
    });
}

setupCombatDetection();

system.runInterval(() => {
    const currentTime = system.currentTick;
    for (const [key, time] of recentHits.entries()) {
        if (currentTime - time > 1200) {
            recentHits.delete(key);
        }
    }
}, 1200);

console.log("Combat Logger: Slider Version Loaded");
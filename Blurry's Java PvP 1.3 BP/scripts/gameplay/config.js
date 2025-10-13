import { world, system, CommandPermissionLevel, CustomCommandStatus } from '@minecraft/server';
import { ModalFormData } from "@minecraft/server-ui";

// Utility to clamp a number between min and max
function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Dynamic Properties Configuration
let dynamicProperties = [
    // Game Mechanics
    { id: "java", name: "Java Knockback Hit", value: false, category: "Game Mechanics" },
    { id: "port", name: "Java Portals", value: true, category: "Game Mechanics" },
    { id: "door", name: "Java Doors", value: true, category: "Game Mechanics" },
    { id: "sat", name: "Java Saturation", value: true, category: "Game Mechanics" },
    { id: "mace", name: "Mace Stun Slam", value: false, category: "Game Mechanics" },
    { id: "cpvp", name: "Fast Crystals §42x Vertical KB", value: false, category: "Game Mechanics" },
    { id: "invis_death", name: "Hide Killer Name When Invisible §a(New)", value: false, category: "Game Mechanics" },

    // Anti-Cheat & Balance
    { id: "lag", name: "Anti Reach", value: false, category: "Anti-Cheat & Balance" },
    { id: "spam", name: "Anti Spam", value: true, category: "Anti-Cheat & Balance" },
    { id: "anti_dupe", name: "Anti Dupe §a(New)", value: false, category: "Anti-Cheat & Balance" },
    { id: "combat_log", name: "Anti Combat Log §a(New)", value: 0, category: "Anti-Cheat & Balance" },

    // Features & Quality of Life
    { id: "death", name: "Death Message", value: true, category: "Features & Quality of Life" },
    { id: "op", name: "Extra Stuff", value: true, category: "Features & Quality of Life" },
    { id: "offhand_food", name: "Offhand Food", value: true, category: "Features & Quality of Life" },
    { id: "armor_repair", name: "Armor Healing", value: false, category: "Features & Quality of Life" },
    { id: "auto_sort", name: "Auto Sort §a(New)", value: false, category: "Features & Quality of Life" },
    { id: "auto_refill", name: "Auto Hotbar Refill §a(New)", value: false, category: "Features & Quality of Life" },
    { id: "pickup_lock", name: "Pickup Lock §a(New) §4Clears Items", value: false, category: "Features & Quality of Life" },
    { id: "firework", name: "Better Fireworks", value: false, category: "Features & Quality of Life" },
    { id: "shield", name: "Custom Shield", value: true, category: "Features & Quality of Life" },

    // Advanced Settings
    { id: "new_string_duper", name: "String Duper Toggle", value: 0, category: "Advanced Settings" },
    { id: "web", name: "Web Mode", value: 0, category: "Advanced Settings" },
    { id: "hud_display_mode", name: "HUD Display Mode", value: 0, category: "Advanced Settings" }
];

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

// Helper functions
function dp(player, { id }) {
    const worldValue = world.getDynamicProperty(id);
    if (worldValue === undefined) {
        const localValue = dynamicProperties.find(property => property.id === id);
        return localValue ? localValue.value : false;
    }
    return worldValue;
}

function dpPlayer(player, { id }) {
    const worldValue = player.getDynamicProperty(id);
    if (worldValue === undefined) {
        const localValue = dynamicPropertiesPlayer.find(property => property.id === id);
        return localValue ? localValue.value : false;
    }
    return worldValue;
}

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

// Form functions
function showItemForm(player) {
    const form = new ModalFormData().title("§lBlurry's PvP Admin Config");
    const categories = groupPropertiesByCategory(dynamicProperties);

    let totalFields = 0;

    Object.keys(categories).forEach(categoryName => {
        form.label(`§6§l${categoryName}§r`);
        totalFields++;

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
            } else if (property.id === "combat_log") {
                let saved = world.getDynamicProperty("combat_log");
                if (typeof saved !== "number") saved = 0;
                form.dropdown(property.name, ["Off", "10 seconds", "15 seconds", "20 seconds", "30 seconds", "1 minute"], { defaultValueIndex: saved });
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
            responseIndex++;
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
                } else if (property.id === "combat_log") {
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
        player.sendMessage(`Configuration Saved`);
    }).catch((error) => {
        player.sendMessage("Failed to show config form.");
    });
}

function showItemFormPlayer(player) {
    const form = new ModalFormData().title("§lBlurry's PvP Config");
    const categories = groupPropertiesByCategory(dynamicPropertiesPlayer);

    let totalFields = 0;

    Object.keys(categories).forEach(categoryName => {
        form.label(`§6§l${categoryName}§r`);
        totalFields++;

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
            player.sendMessage("Configuration Canceled.");
            return;
        }

        const categories = groupPropertiesByCategory(dynamicPropertiesPlayer);
        let responseIndex = 0;

        Object.keys(categories).forEach(categoryName => {
            responseIndex++;
            categories[categoryName].forEach(property => {
                const isChecked = response.formValues[responseIndex];
                property.value = isChecked;
                player.setDynamicProperty(property.id, isChecked);
                responseIndex++;
            });
        });

        player.sendMessage(`Config Saved`);
    }).catch((error) => {
        player.sendMessage("Failed to show configuration form.");
    });
}

// Command handlers
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

// Export the functions and properties that foods.js needs
export {
    dynamicProperties,
    dynamicPropertiesPlayer,
    dp,
    dpPlayer,
    clampNumber,
    configHandler,
    configPlayerHandler,
    showItemForm,
    showItemFormPlayer
};
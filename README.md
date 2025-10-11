# Blurry's Java PvP

An accurate, faithful recreation of **Java 1.9+ combat** as a Minecraft Bedrock addon. Includes **timed hits**, a **cooldown bar**, **sweeping edge**, **Java knockback**, **webs and doors**, **saturation**, and many more **quality-of-life improvements** — all tuned to match the feel of Minecraft Java Edition.

> Created and maintained by **JCD Team**.

## Features

- Java-style combat mechanics
- Cooldown-based attacks
- Sweeping edge support
- Java knockback physics
- Java-style webs and doors
- True saturation + hunger system
- Custom shields
- Optional offhand food
- Full config UI for both players and admins

### Requirements
- Minecraft Bedrock **v1.21+**

Once installed, the addon automatically registers two configuration commands:
- `/bf:config` - Opens the player config menu
- `/bf:admin_config` - Opens the admin config menu

## Adding Custom Food

Blurry's Java PvP supports **custom foods** through the included JavaScript system.

### Step 1: Open the main `scripts/` folder
Locate your project's main `.js` file (the one including the food and config logic).

### Step 2: Create a new food item behavior
Each food item should be registered in your behavior pack using Bedrock's normal `items/` definition system. Define its hunger and saturation values as normal.

### Step 3: Adjust the hunger/saturation logic in script
The provided script includes these helper functions for player food stats:
```js
Player.prototype.getHunger()
Player.prototype.setHunger(value)
Player.prototype.getSaturation()
Player.prototype.setSaturation(value)
```

You can easily extend or modify them to apply custom food effects.

**Example:**
```js
world.afterEvents.itemCompleteUse.subscribe(event => {
  const player = event.source;
  const item = event.itemStack;

  // Custom cooked beef logic
  if (item.typeId === "myaddon:cooked_beef_plus") {
    player.setHunger(Math.min(player.getHunger() + 6, 20));
    player.setSaturation(Math.min(player.getSaturation() + 8, 20));
    player.addEffect("strength", 600, { amplifier: 0, showParticles: true });
  }
});
```

This example restores 6 hunger and 8 saturation points and adds a short **Strength** effect when eaten.

## Adding Custom Weapons

Blurry's Java PvP uses a damage value system to assign **Java-accurate damage values** to addon weapons.

### Step 1: Open the `items` array
Inside your script, locate:
```js
const items = [
    { typeId: "bf:wooden_axe", extraDamage: 8 },
    { typeId: "bf:stone_axe", extraDamage: 10 },
    ...
];
```

### Step 2: Add your custom weapon
To create a new custom weapon entry, just add an object in this format:
```js
{
  typeId: "youraddon:custom_sword",
  extraDamage: 12
},
```

**Explanation:**
- `typeId` → the item's full identifier (matches your item definition)
- `extraDamage` → how much extra attack damage it deals (integer)

**Example:**
```js
{ typeId: "myaddon:crimson_blade", extraDamage: 14 },
```

Now your weapon will the addons damage system your chosen damage value. Keep in mind when registering extraDamage it may need to be tested accordingly with your addon to make sure the damages are correct.

## Adding Custom Item Animations

Blurry's Java PvP supports custom **item animations** and **attachable models** for special items such as swords, shields, or tools.

### Step 1: Configure Attachables
1. Go to the folder: `attachables/CUSTOM_ITEM_BASE.json`
2. Duplicate the base file and rename it to match your item, for example: `attachables/crimson_blade.json`
3. Inside the file, replace:
   - `CUSTOM_ITEM_BASE` → your item's name
   - `NAME` → your item's display name
4. Ensure all fields reference the correct animation controller or bone structure.

### Step 2: Set Up Item Texture
1. Open `textures/item_texture.json`
2. Add a new entry:
   ```json
   "myaddon:crimson_blade": {
     "textures": "textures/items/crimson_blade"
   }
   ```
3. Place your texture image here: `textures/items/crimson_blade.png`

Make sure the file name matches exactly.

### Step 3: Verify In-Game
1. Load the world with the addon installed.
2. Obtain your custom item using `/give @s myaddon:crimson_blade`.
3. Check that:
   - The texture displays correctly.
   - The attachable animation plays as intended.

If something doesn't show correctly, verify:
- The texture name matches your item typeId.
- The attachable JSON references the correct animation controller.

## Adding Custom Config Options

Blurry's Java PvP allows you to extend both the **admin config** (world settings) and **player config** (per-player settings) with your own custom options.

### Adding to Admin Config (World Settings)

**Step 1: Locate the dynamicProperties array**
Find this array in your main script file:
```js
let dynamicProperties = [
  // Game Mechanics
  { id: "java", name: "Java Knockback Hit", value: false, category: "Game Mechanics" },
  { id: "port", name: "Java Portals", value: true, category: "Game Mechanics" },
  // ... existing options
];
```

**Step 2: Add your custom option**
Insert your new config option in the appropriate category:
```js
let dynamicProperties = [
  // Game Mechanics
  { id: "java", name: "Java Knockback Hit", value: false, category: "Game Mechanics" },
  { id: "port", name: "Java Portals", value: true, category: "Game Mechanics" },
  
  // Your custom category or existing one
  { id: "my_custom_feature", name: "My Custom Feature", value: true, category: "Features & Quality of Life" },
  // ... rest of existing options
];
```

**Step 3: Use your setting in code**
Access your setting using the world's dynamic properties:
```js
const myFeatureEnabled = world.getDynamicProperty("my_custom_feature");

if (myFeatureEnabled) {
  // Your custom feature logic here
}
```

### Adding to Player Config (Per-Player Settings)

**Step 1: Locate the dynamicPropertiesPlayer array**
Find this array in your main script file:
```js
let dynamicPropertiesPlayer = [
  // HUD Settings
  { id: "sat_hud", name: "Saturation HUD (apple skin)", value: true, category: "HUD Settings" },
  { id: "armor_hud", name: "Armor HUD", value: true, category: "HUD Settings" },
  // ... existing options
];
```

**Step 2: Add your custom player option**
Insert your new config option in the appropriate category:
```js
let dynamicPropertiesPlayer = [
  // HUD Settings
  { id: "sat_hud", name: "Saturation HUD (apple skin)", value: true, category: "HUD Settings" },
  { id: "armor_hud", name: "Armor HUD", value: true, category: "HUD Settings" },
  
  // Your custom player option
  { id: "my_player_setting", name: "My Player Setting", value: false, category: "Gameplay Settings" },
  // ... rest of existing options
];
```

**Step 3: Use your player setting in code**
Access player-specific settings using the player's dynamic properties:
```js
world.afterEvents.playerSpawn.subscribe(({ player }) => {
  const playerSetting = player.getDynamicProperty("my_player_setting");
  
  if (playerSetting) {
    // Apply your custom logic for this player
  }
});
```

### Adding Dropdown Options

For settings with multiple choices (like web mode or HUD display), use dropdowns:

**Admin Config Example:**
```js
{ id: "my_dropdown_setting", name: "My Dropdown Setting", value: 0, category: "Advanced Settings" }
```

Then in the form handler:
```js
if (property.id === "my_dropdown_setting") {
  let saved = world.getDynamicProperty("my_dropdown_setting");
  if (typeof saved !== "number") saved = 0;
  form.dropdown(property.name, ["Option 1", "Option 2", "Option 3"], { defaultValueIndex: saved });
}
```

**Player Config Example:**
```js
{ id: "player_dropdown", name: "Player Dropdown", value: 0, category: "Advanced Controls" }
```

Then in the form handler:
```js
if (property.id === "player_dropdown") {
  let saved = player.getDynamicProperty("player_dropdown");
  if (typeof saved !== "number") saved = 0;
  form.dropdown(property.name, ["Choice A", "Choice B", "Choice C"], { defaultValueIndex: saved });
}
```

### Available Categories

**Admin Config Categories:**
- `"Game Mechanics"` - Core gameplay systems
- `"Anti-Cheat & Balance"` - Server protection features  
- `"Features & Quality of Life"` - Additional functionality
- `"Advanced Settings"` - Technical options

**Player Config Categories:**
- `"HUD Settings"` - Display and interface options
- `"Gameplay Settings"` - Player behavior settings
- `"Advanced Controls"` - Input and control schemes

## Configuration

**Admins** can manage the entire system using:
```
/bf:admin_config
```

**Players** can customize their own HUD and controls with:
```
/bf:config
```

These menus include settings for:
- Java knockback
- Anti-reach
- Firework behavior
- Shield and HUD options
- Web type and duper toggles
- Saturation HUD, armor HUD, and more

All saved settings persist per world or per player.

## Credits

**Creator:** Blurry FACE

**Developers:**
- Blurry FACE
- Volonid
- BigGamers4u
- Seawhite
- Sith

**Reminder:** This project is maintained by the JCD Team with contributions from the Minecraft addon community.

## License
This project is licensed under the GNU General Public License v3.0 (GPL-3.0).  
You are free to modify and share this addon as long as you provide proper credit and distribute your version under the same license.  
Commercial redistribution or reuploads without attribution are not permitted.

CurseForge license: Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)

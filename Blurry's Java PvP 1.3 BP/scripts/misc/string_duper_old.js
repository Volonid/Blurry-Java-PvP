import { world, ItemStack } from "@minecraft/server";

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { player, block } = event;
    if (!player || !block) return;
    if ((block.typeId === "minecraft:web") &&
        block.isWaterlogged) {
        block.setType("minecraft:air");
        block.setType("minecraft:air");
        block.setType("minecraft:web");
    }
    const Enabled = world.getDynamicProperty("dupe") === true;
    if (Enabled && block.typeId === "minecraft:trip_wire") {
        const invComp = player.getComponent("minecraft:inventory");
        const inv = invComp?.container;
        inv.addItem(new ItemStack("minecraft:string", 2));
        if (block.isWaterlogged) {
            const { x, y, z } = block.location;
            block.dimension.runCommand(`/setblock ${x} ${y} ${z} air destroy`);
        }
    }
});
import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "prefix_delete_respond_cooldown",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return replyEmbed(message, { type: "error", title: "⛔ Permission Needed", description: "You need **Manage Server** to change this." });
        }

        const input = (args[0] || "").toLowerCase();
        if (!input) {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,prefix_delete_respond_cooldown <seconds>` or `,prefix_delete_respond_cooldown off`" });
        }

        const settings = getGuildSettings(message.guild.id);

        if (input === "off") {
            settings.prefixDeleteCooldown = false;
            await saveSettings();
            return replyEmbed(message, { type: "settings", title: "✅ Auto-Delete Disabled", description: "Prefix command responses will no longer be auto-deleted." });
        }

        const seconds = parseInt(input, 10);
        if (!Number.isFinite(seconds) || seconds < 1 || seconds > 300) {
            return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Seconds must be between **1** and **300**, or `off` to disable." });
        }

        settings.prefixDeleteCooldown = seconds;
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "✅ Auto-Delete Updated", description: `Prefix command responses will now be deleted after **${seconds}** second(s).` });
    }
};

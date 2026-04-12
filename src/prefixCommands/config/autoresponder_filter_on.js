import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed, permissionError } from "../../utils/embeds.js";

export default {
    name: "autoresponder_filter_on",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return permissionError(message, "You need **Manage Server** to change this.");
        }
        const settings = getGuildSettings(message.guild.id);
        if (settings.autoresponderFilterOn === true) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Enabled", description: "Autoresponder filter is already **ON**." });
        }
        settings.autoresponderFilterOn = true;
        await saveSettings();
        return replyEmbed(message, { type: "settings", title: "✅ Filter Enabled", description: "Autoresponder filter is now **ON**." });
    }
};

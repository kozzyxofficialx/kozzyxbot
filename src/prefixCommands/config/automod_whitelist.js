import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed, permissionError } from "../../utils/embeds.js";

export default {
    name: "automod_whitelist",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return permissionError(message, "You need **Manage Server** to manage the automod whitelist.");
        }

        const settings = getGuildSettings(message.guild.id);
        settings.automodWhitelist = settings.automodWhitelist ?? [];

        const sub = (args[0] || "").toLowerCase();

        // ,automod_whitelist list
        if (sub === "list") {
            const list = settings.automodWhitelist;
            if (!list.length) {
                return replyEmbed(message, { type: "info", title: "🛡️ AutoMod Whitelist", description: "No words whitelisted. Messages containing whitelisted words bypass automod." });
            }
            return replyEmbed(message, {
                type: "settings",
                title: "🛡️ AutoMod Whitelist",
                description: list.map((w, i) => `\`${i + 1}.\` ${w}`).join("\n"),
            });
        }

        // ,automod_whitelist remove <word>
        if (sub === "remove") {
            const word = args.slice(1).join(" ").toLowerCase().trim();
            if (!word) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,automod_whitelist remove <word>`" });
            const before = settings.automodWhitelist.length;
            settings.automodWhitelist = settings.automodWhitelist.filter(w => w !== word);
            if (settings.automodWhitelist.length === before) {
                return replyEmbed(message, { type: "info", title: "ℹ️ Not Found", description: `\`${word}\` isn't on the whitelist.` });
            }
            await saveSettings();
            return replyEmbed(message, { type: "success", title: "✅ Removed", description: `Removed \`${word}\` from the automod whitelist.` });
        }

        // ,automod_whitelist add <word>  OR  ,automod_whitelist <word>  (shorthand)
        const word = (sub === "add" ? args.slice(1).join(" ") : args.join(" ")).toLowerCase().trim();
        if (!word) {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,automod_whitelist <word>` — add a word\n`,automod_whitelist remove <word>` — remove\n`,automod_whitelist list` — view all" });
        }
        if (word.length > 100) {
            return replyEmbed(message, { type: "error", title: "❌ Too Long", description: "Whitelisted words must be 100 characters or less." });
        }
        if (settings.automodWhitelist.includes(word)) {
            return replyEmbed(message, { type: "info", title: "ℹ️ Already Whitelisted", description: `\`${word}\` is already on the whitelist.` });
        }
        settings.automodWhitelist.push(word);
        await saveSettings();
        return replyEmbed(message, {
            type: "success",
            title: "✅ Whitelisted",
            description: `Messages containing \`${word}\` will now bypass automod.\n\nTotal whitelisted: **${settings.automodWhitelist.length}**`,
        });
    }
};

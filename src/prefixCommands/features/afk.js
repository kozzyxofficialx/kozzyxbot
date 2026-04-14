import { setAfk, getGuildSettings } from "../../utils/database.js";
import { replyEmbed } from "../../utils/embeds.js";

export default {
    name: "afk",
    async execute(message, args) {
        if (getGuildSettings(message.guild.id).plugins?.afk === false) {
            return replyEmbed(message, { type: "error", title: "🚫 Feature Disabled", description: "The AFK system is disabled in this server." });
        }
        const reason = args.join(" ") || "AFK";
        await setAfk(message.author.id, reason);
        return replyEmbed(message, { type: "afk", title: "😴 AFK Set", description: `You are now AFK: **${reason}**` });
    }
};

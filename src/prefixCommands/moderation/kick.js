import { PermissionsBitField } from "discord.js";
import { doKick } from "../../utils/moderationUtils.js";
import { replyEmbed, permissionError } from "../../utils/embeds.js";

export default {
    name: "kick",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return permissionError(message, "You need **Kick Members** permission.");
        }
        const target = message.mentions.members.first();
        const reason = args.filter(a => !a.match(/^<@!?\d+>$/)).join(" ") || "No reason provided.";
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,kick @user [reason]`" });
        return doKick(message, target, reason);
    }
};

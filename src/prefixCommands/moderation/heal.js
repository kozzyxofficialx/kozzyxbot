import { PermissionsBitField } from "discord.js";
import { doUntimeout } from "../../utils/moderationUtils.js";
import { replyEmbed, permissionError } from "../../utils/embeds.js";

export default {
    name: "heal",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return permissionError(message, "You need **Timeout Members** permission.");
        }
        const target = message.mentions.members.first();
        if (!target) return replyEmbed(message, { type: "error", title: "❌ Usage", description: "`,heal @user`" });
        return doUntimeout(message, target);
    }
};

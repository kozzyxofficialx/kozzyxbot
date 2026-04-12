import { PermissionsBitField } from "discord.js";
import { getGuildSettings, saveSettings } from "../../utils/database.js";
import { replyEmbed, permissionError } from "../../utils/embeds.js";

const RULES = {
    invite_links:  { label: "Invite Links",   description: "Block Discord invite links" },
    mass_mentions: { label: "Mass Mentions",  description: "Block messages with 5+ @mentions" },
    spam:          { label: "Spam",           description: "Block users sending 5+ messages in 5 seconds" },
    caps:          { label: "Excessive Caps", description: "Block messages that are 75%+ capital letters" },
};

const SENSITIVITY_LABELS = {
    low:    "🟡 Low — only removes the most severe violations",
    medium: "🟠 Medium — removes moderate and severe violations (default)",
    high:   "🔴 High — removes any detected violation",
};

export default {
    name: "automod",
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return permissionError(message, "You need **Manage Server** to configure automod.");
        }

        const settings = getGuildSettings(message.guild.id);
        settings.automodRules = settings.automodRules ?? {};

        const sub = (args[0] || "").toLowerCase();

        // ── ,automod list ──────────────────────────────────────────────────
        if (!sub || sub === "list") {
            const ruleLines = Object.entries(RULES).map(([key, meta]) => {
                const on = settings.automodRules[key] !== false;
                return `${on ? "🟢" : "🔴"} **${meta.label}** — ${meta.description}`;
            });

            const strikeLimit  = settings.automodRules.strike_limit  ?? 3;
            const sensitivity  = settings.automodRules.sensitivity    ?? "medium";

            return replyEmbed(message, {
                type: "settings",
                title: "🛡️ AutoMod Configuration",
                description:
                    "**Rules**\n" +
                    ruleLines.join("\n") +
                    "\n\n**Settings**\n" +
                    `⚡ **Strike limit:** \`${strikeLimit}\` strikes before timeout\n` +
                    `🎯 **Detection sensitivity:** \`${sensitivity}\` — ${SENSITIVITY_LABELS[sensitivity]}\n\n` +
                    "**Commands**\n" +
                    "`,automod <rule> on|off` — toggle a rule\n" +
                    "`,automod set strike_limit <1–10>` — strikes before timeout\n" +
                    "`,automod set sensitivity <low|medium|high>` — detection level",
            });
        }

        // ── ,automod set <key> <value> ─────────────────────────────────────
        if (sub === "set") {
            const key   = (args[1] || "").toLowerCase();
            const value = (args[2] || "").toLowerCase();

            if (key === "strike_limit") {
                const n = parseInt(value, 10);
                if (!Number.isFinite(n) || n < 1 || n > 10) {
                    return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Strike limit must be between **1** and **10**." });
                }
                if ((settings.automodRules.strike_limit ?? 3) === n) {
                    return replyEmbed(message, { type: "info", title: "ℹ️ No Change", description: `Strike limit is already **${n}**.` });
                }
                settings.automodRules.strike_limit = n;
                await saveSettings();
                return replyEmbed(message, { type: "settings", title: "✅ Strike Limit Updated", description: `Users will be timed out after **${n}** strike(s).` });
            }

            if (key === "sensitivity") {
                if (!["low", "medium", "high"].includes(value)) {
                    return replyEmbed(message, { type: "error", title: "❌ Invalid", description: "Sensitivity must be `low`, `medium`, or `high`." });
                }
                if ((settings.automodRules.sensitivity ?? "medium") === value) {
                    return replyEmbed(message, { type: "info", title: "ℹ️ No Change", description: `Sensitivity is already **${value}**.` });
                }
                settings.automodRules.sensitivity = value;
                await saveSettings();
                return replyEmbed(message, { type: "settings", title: "✅ Sensitivity Updated", description: `Detection sensitivity set to **${value}**.\n${SENSITIVITY_LABELS[value]}` });
            }

            return replyEmbed(message, {
                type: "error",
                title: "❌ Unknown Setting",
                description: "Valid settings: `strike_limit`, `sensitivity`",
            });
        }

        // ── ,automod <rule> on|off ─────────────────────────────────────────
        const rule   = sub;
        const toggle = (args[1] || "").toLowerCase();

        if (!RULES[rule]) {
            return replyEmbed(message, {
                type: "error",
                title: "❌ Unknown Rule",
                description: `Valid rules: ${Object.keys(RULES).map(r => `\`${r}\``).join(", ")}`,
            });
        }
        if (toggle !== "on" && toggle !== "off") {
            return replyEmbed(message, { type: "error", title: "❌ Usage", description: `\`,automod ${rule} on\` or \`,automod ${rule} off\`` });
        }

        const newState = toggle === "on";
        if ((settings.automodRules[rule] !== false) === newState) {
            return replyEmbed(message, { type: "info", title: "ℹ️ No Change", description: `**${RULES[rule].label}** is already **${newState ? "enabled" : "disabled"}**.` });
        }

        settings.automodRules[rule] = newState;
        await saveSettings();
        return replyEmbed(message, {
            type: "settings",
            title: newState ? "✅ Rule Enabled" : "🔴 Rule Disabled",
            description: `**${RULES[rule].label}** is now **${newState ? "ON 🟢" : "OFF 🔴"}**.`,
        });
    }
};

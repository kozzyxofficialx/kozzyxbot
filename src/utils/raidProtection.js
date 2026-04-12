import { PermissionsBitField, EmbedBuilder } from "discord.js";
import { getGuildSettings, saveSettings } from "./database.js";

// guildId -> [{ ts: number, memberId: string }]
const joinEntries = new Map();

// guildId -> boolean (already alerted for new-account in last 30s to avoid spam)
const newAcctAlertCooldown = new Map();

// ─────────────────────────────────────────────
//  Main entry point — called on every GuildMemberAdd
// ─────────────────────────────────────────────
export async function checkRaid(member) {
    const guild = member.guild;
    const settings = getGuildSettings(guild.id);

    // Account age check runs even if anti_raid plugin is off
    const { minAccountAgeDays = 7 } = settings.antiRaid ?? {};
    const accountAgeDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;

    if (settings.plugins?.anti_raid && accountAgeDays < minAccountAgeDays) {
        await handleSuspiciousAccount(member, guild, accountAgeDays, settings);
        return true;
    }

    if (!settings.plugins?.anti_raid) return false;

    const { threshold = 10, windowMs = 60_000, action = "lockdown" } = settings.antiRaid ?? {};

    // Maintain sliding window of recent joins
    const now = Date.now();
    const prev = (joinEntries.get(guild.id) ?? []).filter(e => now - e.ts < windowMs);
    prev.push({ ts: now, memberId: member.id });
    joinEntries.set(guild.id, prev);

    if (prev.length < threshold) return false;

    // ── RAID DETECTED ──────────────────────────────────────────────────────
    console.warn(`[antiRaid] 🚨 Raid in ${guild.name} — ${prev.length} joins in ${windowMs / 1000}s`);
    joinEntries.delete(guild.id); // reset window

    const raiderIds = [...new Set(prev.map(e => e.memberId))];

    if (action === "lockdown") {
        await lockdownGuild(guild, settings);
    }

    // Punish ALL raiders in the window, not just the trigger member
    let punished = 0;
    for (const id of raiderIds) {
        try {
            if (action === "ban" || action === "lockdown") {
                await guild.members.ban(id, { reason: `🚨 Anti-raid: mass join spike (${raiderIds.length} accounts)` });
            } else if (action === "kick") {
                const m = guild.members.cache.get(id) ?? await guild.members.fetch(id).catch(() => null);
                if (m) await m.kick(`🚨 Anti-raid: mass join spike`);
            }
            punished++;
        } catch { /* member already left or no perms */ }
    }

    await sendRaidAlert(guild, {
        raiderCount: raiderIds.length,
        punished,
        windowSec: windowMs / 1000,
        action,
        settings,
    });

    return true;
}

// ─────────────────────────────────────────────
//  New account alert/kick
// ─────────────────────────────────────────────
async function handleSuspiciousAccount(member, guild, ageDays, _settings) {
    const ageText = ageDays < 1
        ? `${Math.round(ageDays * 24)}h old`
        : `${ageDays.toFixed(1)} days old`;

    // Kick the suspicious account
    try {
        await member.kick(`🛡️ Account too new (${ageText}). Rejoin when your account is older.`);
    } catch { return; }

    // Rate-limit the alert so we don't spam the case channel
    const lastAlert = newAcctAlertCooldown.get(guild.id) ?? 0;
    if (Date.now() - lastAlert < 30_000) return;
    newAcctAlertCooldown.set(guild.id, Date.now());

    const { postCase, caseEmbed } = await import("./embeds.js");
    await postCase(guild, caseEmbed(guild.id, "🛡️ Suspicious Account Kicked", [
        `**User:** ${member.user.tag} (<@${member.id}>)`,
        `**Account age:** ${ageText}`,
        `**Reason:** Account below minimum age threshold.`,
        `**Tip:** Change minimum age with \`/antiraid config\``,
    ]));
}

// ─────────────────────────────────────────────
//  Raid alert embed posted to case channel + owner DM
// ─────────────────────────────────────────────
async function sendRaidAlert(guild, { raiderCount, punished, windowSec, action, settings }) {
    const actionText = action === "lockdown"
        ? `Server locked + **${punished}** raiders banned`
        : action === "ban"
            ? `**${punished}** raiders banned`
            : `**${punished}** raiders kicked`;

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🚨 RAID DETECTED — Server Protected")
        .setDescription(
            `A join spike was detected and the bot has taken action.\n\n` +
            `> **${raiderCount}** accounts joined within **${windowSec}s**\n` +
            `> Action: ${actionText}`
        )
        .addFields(
            { name: "🔓 To Unlock", value: "Run `,unraid` to restore normal access.", inline: false },
            { name: "⚙️ Configure", value: "Adjust thresholds with `/plugins`.", inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `${guild.name} • Anti-Raid System` });

    // Post to case channel
    if (settings.caseChannelId) {
        const ch = guild.channels.cache.get(settings.caseChannelId);
        await ch?.send({ embeds: [embed] }).catch(() => null);
    }

    // DM the server owner
    try {
        const owner = await guild.fetchOwner();
        await owner.send({ embeds: [embed] }).catch(() => null);
    } catch { /* owner DMs off */ }
}

// ─────────────────────────────────────────────
//  Lockdown / Unlock
// ─────────────────────────────────────────────
async function lockdownGuild(guild, settings) {
    settings.raidLockdown = true;
    await saveSettings();
    try {
        await guild.roles.everyone.setPermissions(
            guild.roles.everyone.permissions.remove(PermissionsBitField.Flags.SendMessages),
            "Anti-raid lockdown"
        );
    } catch (err) {
        console.error("[antiRaid] lockdown failed:", err.message);
    }
}

export async function unlockGuild(guild) {
    const settings = getGuildSettings(guild.id);
    settings.raidLockdown = false;
    await saveSettings();
    try {
        await guild.roles.everyone.setPermissions(
            guild.roles.everyone.permissions.add(PermissionsBitField.Flags.SendMessages),
            "Anti-raid lockdown lifted"
        );
    } catch (err) {
        console.error("[antiRaid] unlock failed:", err.message);
    }
}

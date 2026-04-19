import http from 'http';
import { ExtendedClient } from "./src/structures/Client.js";
import "dotenv/config";
import { initDB } from "./src/utils/db.js";
import { initReminders } from "./src/utils/reminders.js";
import interactionCreate from "./src/events/interactionCreate.js";
import messageCreate from "./src/events/messageCreate.js";
import loadCommands from "./src/handlers/commandHandler.js";
import { Events } from "discord.js";

const client = new ExtendedClient();

async function init() {
    console.log("-----------------------------------------");
    console.log("[Startup] BEGINNING INITIALIZATION");
    console.log("-----------------------------------------");

    await initDB();

    console.log("[Startup] Loading Commands...");
    await loadCommands(client);

    console.log("[Startup] Registering Interaction Handler...");
    client.on(Events.InteractionCreate, async (...args) => {
        try {
            await interactionCreate.execute(...args, client);
        } catch (err) {
            console.error("[CRITICAL] Uncaught error in interaction handler:", err);
        }
    });

    console.log("[Startup] Registering Message Handler...");
    client.on(Events.MessageCreate, async (...args) => {
        try {
            await messageCreate.execute(...args, client);
        } catch (err) {
            console.error("[CRITICAL] Uncaught error in message handler:", err);
        }
    });

    client.once(Events.ClientReady, (c) => {
        console.log(`[Startup] ✅ Logged in as ${c.user.tag}`);
        client.deploySlashCommands();

        // ── Stats endpoint ──────────────────────────────────────
        const statsData = {
            servers: client.guilds.cache.size,
            commands: 50,
        };

        client.on(Events.GuildCreate, () => { statsData.servers = client.guilds.cache.size; });
        client.on(Events.GuildDelete, () => { statsData.servers = client.guilds.cache.size; });

        http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                servers: statsData.servers,
                commands: statsData.commands,
                uptime: Math.floor(process.uptime()),
            }));
        }).listen(3456, () => console.log('[Stats] Endpoint live on :3456'));
    });

    await initReminders(client);

    console.log("[Startup] Logging in...");
    client.login(process.env.TOKEN);
}

init();

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

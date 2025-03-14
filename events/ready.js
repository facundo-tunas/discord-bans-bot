export default {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
    client.user.setActivity("Tracking warnings", { type: "WATCHING" });
  },
};

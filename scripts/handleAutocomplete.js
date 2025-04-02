import { getAllUsers } from "../utils/dataHandler.js";
import { warningsForBan } from "../utils/warningsUntilBan.js";

export async function handleAutocomplete(interaction) {
  try {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === "nombre") {
      const focusedValue = focusedOption.value.toLowerCase();
      const allUsers = getAllUsers();

      if (!Array.isArray(allUsers)) {
        throw new Error("getAllUsers did not return a valid array");
      }

      const filtered = allUsers
        .filter((user) => user.name.toLowerCase().includes(focusedValue))
        .sort((a, b) => {
          const aStartsWith = a.name.toLowerCase().startsWith(focusedValue);
          const bStartsWith = b.name.toLowerCase().startsWith(focusedValue);

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          return b.warnings - a.warnings;
        })
        .slice(0, 25);

      const choices = filtered.map((user) => {
        let label = `${user.name} (${user.warnings}/${warningsForBan(
          user.banCount
        )})`;
        if (user.banned) label += " [BANEADO]";

        return {
          name: label,
          value: user.name,
        };
      });

      await interaction.respond(choices);
    }
  } catch (error) {
    console.error("Error in handleAutocomplete:", error);
    await interaction.respond([
      { name: "Error retrieving users", value: "error" },
    ]);
  }
}

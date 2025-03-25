import dotenv from "dotenv";
dotenv.config();

export default {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,

  qchannel: "1326347406287306773",
  ruleChannel: "",
};

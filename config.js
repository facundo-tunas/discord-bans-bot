import dotenv from "dotenv";
dotenv.config();

export default {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,

  generalChannel: "954064278393077813",
  newsChannel: "1335015959353626755",
  qchannel: "1326347406287306773",
  warningsChannel: "1349935023536607334",
  ruleChannel: "",

  hostModsId: "1298079837621321839",
};

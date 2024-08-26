const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { getProfile } = require("./middleware/getProfile");
const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

/**
 * FIXED!
 * @returns contract by id
 */
app.get("/contracts/:id", getProfile, async (req, res) => {
  const { Contract } = req.app.get("models");
  const { id } = req.params;
  const profileId = req.profile?.dataValues?.id;
  const profileType = req.profile?.dataValues?.type;

  try {
    let contract = "";
    if (profileType === "client") {
      contract = await Contract.findOne({ where: { id, ClientId: profileId } });
    } else {
      contract = await Contract.findOne({
        where: { id, ContractorId: profileId },
      });
    }
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });
    res.json(contract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = app;

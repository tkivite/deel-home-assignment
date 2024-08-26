const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { Op } = require("sequelize");
const { getProfile } = require("./middleware/getProfile");
const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

/**
 * @returns all contracts for a logged in user
 */
app.get("/contracts", getProfile, async (req, res) => {
  const { Contract } = req.app.get("models");
  const { id } = req.params;
  const profileId = req.profile?.dataValues?.id;
  const profileType = req.profile?.dataValues?.type;

  let contracts = "";
  try {
    if (profileType === "client") {
      contracts = await Contract.findAll({
        where: { ClientId: profileId, status: { [Op.not]: "terminated" } },
      });
    } else {
      contracts = await Contract.findAll({
        where: { ContractorId: profileId, status: { [Op.not]: "terminated" } },
      });
    }

    res.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
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

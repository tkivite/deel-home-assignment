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

/**
 *
 * @returns jobs unpaid for a user
 */
app.get("/jobs/unpaid", getProfile, async (req, res) => {
  const { Job, Contract } = req.app.get("models");

  const profileId = req.profile?.dataValues?.id;
  const profileType = req.profile?.dataValues?.type;

  try {
    let jobs = [];
    if (profileType === "client") {
      jobs = await Job.findAll({
        where: { paid: false },
        include: [
          {
            model: Contract,
            where: {
              ClientId: profileId,
            },
          },
        ],
      });
    } else {
      jobs = await Job.findAll({
        where: { paid: false },
        include: [
          {
            model: Contract,
            where: {
              ContractorId: profileId,
            },
          },
        ],
      });
    }

    res.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/** Make payment for a job */
app.post("/jobs/:job_id/pay", getProfile, async (req, res) => {
  const { Profile, Contract, Job } = req.app.get("models");
  const { job_id } = req.params;
  //   const { amount } = req.body;
  const clientProfile = req.profile?.dataValues;

  try {
    // Check if  it's a client profile
    if (clientProfile?.type !== "client") {
      return res.status(400).json({ error: "Invalid client profile" });
    }

    //Retrieve Job
    const job = await Job.findOne({
      where: { id: job_id },
      include: [
        {
          model: Contract,
          where: {
            ClientId: clientProfile?.id || 0,
          },
        },
      ],
    });
    const jobPrice = job?.dataValues?.price;

    const contractorProfile = await Profile.findOne({
      where: { id: job.Contract.ContractorId },
    });
    console.log(clientProfile);
    console.log(contractorProfile.dataValues);

    // Validate Amount
    if (clientProfile?.balance < jobPrice) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    const t = await sequelize.transaction();

    // update profile
    await Profile.update(
      {
        balance: sequelize.literal(`balance - ${jobPrice}`),
      },
      {
        where: { id: clientProfile.id },
        transaction: t,
      }
    );

    // update contractor

    await Profile.update(
      {
        balance: sequelize.literal(`balance + ${jobPrice}`),
      },
      {
        where: { id: contractorProfile.id },
        transaction: t,
      }
    );

    // update job to paid if price is settled
    await job.update({ paid: true }, { transaction: t });
    await Job.update(
      {
        paid: true,
      },
      {
        where: { id: job.id },
        transaction: t,
      }
    );
    await t.commit();

    res.json({ message: `Payment of ${jobPrice} processed successfully` });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** deposit to a profile */
app.post("/balances/deposit/:userId", async (req, res) => {
  const { sequelize, Profile, Contract, Job } = req.app.get("models");
  const { userId } = req.params;
  const { amount } = req.body;
  const profile = await Profile.findOne({
    where: { id: userId || 0 },
  });

  const clientProfile = profile?.dataValues;

  try {
    // Check if  it's a client profile
    if (clientProfile?.type !== "client") {
      return res.status(400).json({ error: "Invalid client profile" });
    }

    // Calculate the total amount of unpaid jobs
    const unpaidJobs = await Job.findAll({
      where: {
        paid: false,
      },
      include: [
        {
          model: Contract,
          where: {
            ClientId: clientProfile?.id,
          },
        },
      ],
    });

    const totalUnpaidAmount = unpaidJobs.reduce(
      (sum, job) => sum + job.price,
      0
    );
    console.log(totalUnpaidAmount);
    console.log(amount);
    // Check if the client wants to deposit more than 25% of total unpaid jobs
    const maxDepositAmount = Math.min(totalUnpaidAmount * 0.25, amount);
    console.log(maxDepositAmount);

    // Validate the deposit amount
    if (maxDepositAmount < amount) {
      return res
        .status(400)
        .json({ error: "Deposit exceeds maximum allowed amount" });
    }

    await clientProfile.update({
      balance: sequelize.literal(`balance + ${req.body.amount}`),
    });

    res.json({ message: "Deposit processed successfully" });
  } catch (error) {
    console.error("Error fetching client profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/best-profession", async (req, res) => {
  try {
    const { sequelize, Profile, Job } = req.app.get("models");

    // Parse dates from query parameters
    const startDate = new Date(req.query.start);
    const endDate = new Date(req.query.end);

    // Validate input dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use ISO 8601." });
    }
    if (startDate > endDate) {
      return res
        .status(400)
        .json({ error: "Start date must be before end date" });
    }

    // Find the profession with the highest earnings
    const bestProfession = await Profile.findOne({
      attributes: [
        "profession",
        [sequelize.fn("SUM", sequelize.col("jobs.price")), "totalEarnings"],
      ],
      group: "profession",
      having: sequelize.and(
        sequelize.where(
          sequelize.fn("SUM", sequelize.col("jobs.price")),
          ">",
          0
        ),
        sequelize.where(
          sequelize.fn("MAX", sequelize.col("jobs.paymentDate")),
          ">=",
          startDate
        ),
        sequelize.where(
          sequelize.fn("MIN", sequelize.col("jobs.paymentDate")),
          "<=",
          endDate
        )
      ),
      order: [[sequelize.literal("SUM(jobs.price)"), "DESC"]],
      limit: 1,
    });

    if (!bestProfession) {
      return res.status(404).json({
        error: "No professions found within the specified date range",
      });
    }

    res.json({
      profession: bestProfession.profession,
      totalEarnings: bestProfession.totalEarnings,
    });
  } catch (error) {
    console.error("Error fetching best profession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin/best-clients", async (req, res) => {
  try {
    const { Profile, Contract, Job } = req.app.get("models");

    // Parse dates from query parameters
    const startDate = new Date(req.query.start);
    const endDate = new Date(req.query.end);

    // Validate input dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use ISO 8601." });
    }
    if (startDate > endDate) {
      return res
        .status(400)
        .json({ error: "Start date must be before end date" });
    }

    // Parse limit parameter
    const limit = parseInt(req.query.limit || "2");

    // Validate limit
    if (isNaN(limit) || limit <= 0) {
      return res
        .status(400)
        .json({ error: "Invalid limit. Must be a positive integer." });
    }

    // Find the top clients based on total payments
    const topClients = await Profile.findAll({
      attributes: [
        "firstName",
        "lastName",
        [sequelize.fn("SUM", sequelize.col("jobs.price")), "totalPayments"],
      ],
      group: "id",
      having: sequelize.and(
        sequelize.where(
          sequelize.fn("SUM", sequelize.col("jobs.price")),
          ">",
          0
        ),
        sequelize.where(
          sequelize.fn("MAX", sequelize.col("jobs.paymentDate")),
          ">=",
          startDate
        ),
        sequelize.where(
          sequelize.fn("MIN", sequelize.col("jobs.paymentDate")),
          "<=",
          endDate
        )
      ),
      include: [
        {
          model: Job,
          as: "jobs",
          through: Contract,
          where: {
            paid: true,
          },
        },
      ],
      order: [[sequelize.literal("SUM(jobs.price)"), "DESC"]],
      limit: limit,
    });

    if (topClients.length === 0) {
      return res
        .status(404)
        .json({ error: "No clients found within the specified date range" });
    }

    res.json(
      topClients.map((client) => ({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        totalPayments: client.totalPayments,
      }))
    );
  } catch (error) {
    console.error("Error fetching top clients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = app;

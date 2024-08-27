// __tests__/topup.test.js

const request = require("supertest");
const app = require("../src/app");
const { sequelize, Profile, Contract, Job } = require("../src/model");

describe("Balance Endpoints", () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await sequelize.query("DELETE FROM profiles");
    await sequelize.query("DELETE FROM contracts");
    await sequelize.query("DELETE FROM jobs");
  });

  describe("POST /balances/deposit/:userId", () => {
    it("should deposit money to a profile", async () => {
      const profile1 = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        profession: "IT",
        balance: 100,
        type: "client",
      });
      const profile2 = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        profession: "Programmer",
        balance: 100,
        type: "contractor",
      });

      const t_contract = await Contract.create({
        ClientId: profile1.id,
        ContractorId: profile2.id,
        status: "active",
        terms: "test",
      });

      await Job.create({
        price: 5000,
        paid: false,
        ContractId: t_contract.id,
        description: "test",
      });

      const res = await request(app)
        .post("/balances/deposit/" + profile1.id)
        .send({ amount: 500 });

      expect(res.status).toBe(200);
    });

    it("should fail if deposit exceeds max allowed amount", async () => {
      const profile = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        profession: "IT",
        balance: 100,
        type: "client",
      });

      const unpaidJobs = await Job.findAll({
        where: { paid: false },
        include: [{ model: Contract, where: { ClientId: profile.id } }],
      });

      const totalUnpaidAmount = unpaidJobs.reduce(
        (sum, job) => sum + job.price,
        0
      );

      const maxDeposit = Math.min(totalUnpaidAmount * 0.25, 500);

      const res = await request(app)
        .post("/balances/deposit/" + profile.id)
        .send({ amount: maxDeposit + 1 });

      expect(res.status).toBe(400);
      expect(profile.balance).toBe(100);
    });
  });
});

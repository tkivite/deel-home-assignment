// __tests__/jobs.test.js

const request = require("supertest");
const app = require("../src/app"); // Adjust the import path as needed
const { sequelize, Profile, Contract, Job } = require("../src/model");

describe("Jobs Endpoints", () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await sequelize.query("DELETE FROM profiles");
    await sequelize.query("DELETE FROM contracts");
    await sequelize.query("DELETE FROM jobs");
  });

  describe("GET /jobs/unpaid", () => {
    it("should return unpaid jobs for a client", async () => {
      const profile = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        balance: 1000,
        profession: "IT",
        type: "client",
      });

      const contract = await Contract.create({
        ClientId: profile.id,
        ContractorId: 1,
        status: "active",
        terms: "test",
      });

      const job = await Job.create({
        price: 500,
        paid: false,
        ContractId: contract.id,
        description: "test",
      });

      const res = await request(app)
        .get("/jobs/unpaid")
        .set("profile_id", `${profile.id}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].price).toBe(500);
      expect(res.body[0].paid).toBe(false);
    });

    it("should return unpaid jobs for a contractor", async () => {
      const profile = await Profile.create({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "0987654321",
        balance: 500,
        profession: "Programmer",
        type: "contractor",
      });

      const contract = await Contract.create({
        ClientId: 1,
        ContractorId: profile.id,
        status: "active",
        terms: "test",
      });

      const job = await Job.create({
        price: 500,
        paid: false,
        ContractId: contract.id,
        description: "test",
      });

      const res = await request(app)
        .get("/jobs/unpaid")
        .set("profile_id", `${profile.id}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].price).toBe(500);
      expect(res.body[0].paid).toBe(false);
    });
  });

  describe("POST /jobs/:job_id/pay", () => {
    it("should pay for a job", async () => {
      const profile = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        balance: 1000,
        profession: "IT",
        type: "client",
      });

      const contract = await Contract.create({
        ClientId: profile.id,
        ContractorId: 1,
        status: "active",
        terms: "test",
      });

      const job = await Job.create({
        price: 500,
        paid: false,
        ContractId: contract.id,
        description: "test",
      });

      const res = await request(app)
        .post("/jobs/" + job.id + "/pay")
        .set("profile_id", `${profile.id}`)
        .send({});
      expect(res.status).toBe(200);
    });

    it("should fail if insufficient balance", async () => {
      const profile = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        balance: 100,
        profession: "IT",
        type: "client",
      });

      const contract = await Contract.create({
        ClientId: profile.id,
        ContractorId: 1,
        status: "active",
        terms: "test",
      });

      const job = await Job.create({
        price: 150,
        paid: false,
        ContractId: contract.id,
        description: "test",
      });

      const res = await request(app)
        .post("/jobs/" + job.id + "/pay")
        .set("profile_id", `${profile.id}`)
        .send({});

      expect(res.status).toBe(400);
      expect(job.paid).toBe(false);
      expect(profile.balance).toBe(100);
    });
  });
});

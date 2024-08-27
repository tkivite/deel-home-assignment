// __tests__/contracts.test.js

const request = require("supertest");
const app = require("../src/app"); // Adjust the import path as needed
const { sequelize, Profile, Contract, Job } = require("../src/model");

describe("Contracts Endpoints", () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await sequelize.query("DELETE FROM profiles");
    await sequelize.query("DELETE FROM contracts");
    await sequelize.query("DELETE FROM jobs");
  });

  describe("GET /contracts", () => {
    it("should return all contracts for a client", async () => {
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
        terms: "test terms",
      });

      const res = await request(app)
        .get("/contracts")
        .set("profile_id", `${profile.id}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].ClientId).toBe(profile.id);
      expect(res.body[0].ContractorId).toBe(1);
      expect(res.body[0].status).toBe("active");
    });

    it("should return all contracts for a contractor", async () => {
      const profile = await Profile.create({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "0987654321",
        profession: "Programmer",
        balance: 500,
        type: "contractor",
      });

      const contract = await Contract.create({
        ClientId: 1,
        ContractorId: profile.id,
        status: "active",
        terms: "test terms",
      });

      const res = await request(app)
        .get("/contracts")
        .set("profile_id", `${profile.id}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].ClientId).toBe(1);
      expect(res.body[0].ContractorId).toBe(profile.id);
      expect(res.body[0].status).toBe("active");
    });
  });

  describe("GET /contracts/:id", () => {
    it("should return a contract by id", async () => {
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
        id: 1,
        ClientId: profile.id,
        ContractorId: 1,
        status: "active",
        terms: "test terms",
      });

      const res = await request(app)
        .get("/contracts/1")
        .set("profile_id", `${profile.id}`);

      expect(res.status).toBe(200);
      expect(res.body.ClientId).toBe(profile.id);
      expect(res.body.ContractorId).toBe(1);
      expect(res.body.status).toBe("active");
    });

    it("should return 404 if contract not found", async () => {
      const profile = await Profile.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        balance: 1000,
        profession: "IT",
        type: "client",
      });

      const res = await request(app)
        .get("/contracts/999")
        .set("profile_id", `${profile.id}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Contract not found");
    });
  });

  // Add tests for other endpoints here...
});

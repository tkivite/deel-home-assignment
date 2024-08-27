const request = require("supertest");
const app = require("../src/app");
const { sequelize, Profile, Contract, Job } = require("../src/model");

describe("Admin API", () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await sequelize.query("DELETE FROM profiles");
    await sequelize.query("DELETE FROM contracts");
    await sequelize.query("DELETE FROM jobs");
  });

  describe("GET /admin/best-profession", () => {
    it("should return best profession", async () => {
      const startDate = new Date("2022-01-01 10:00:00");
      const endDate = new Date("2025-01-01 10:00:00");

      const contractor1 = await Profile.create({
        profession: "Software Engineer",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "1234567890",
        profession: "Analytics",
        balance: 1000.0,
        type: "contractor",
      });

      const contractor2 = await Profile.create({
        profession: "Web Developer",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "0987654321",
        profession: "Programmer",
        balance: 800.0,
        type: "contractor",
      });

      const contract1 = await Contract.create({
        ClientId: 1,
        ContractorId: contractor1.id,
        status: "completed",
        terms: "test",
      });

      const job1 = await Job.create({
        price: 1000,
        paymentDate: "2023-01-01 10:00:00",
        ContractId: contract1.id,
        description: "test",
      });

      const contract2 = await Contract.create({
        ClientId: 1,
        ContractorId: contractor2.id,
        status: "completed",
        terms: "test",
      });

      const job2 = await Job.create({
        price: 800,
        paymentDate: "2024-01-01 10:00:00",
        ContractId: contract2.id,
        description: "test",
      });

      const res = await request(app).get(
        `/admin/best-profession?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );

      expect(res.status).toBe(200);
      expect(res.body.profession).toBe("Analytics");
      expect(res.body.totalEarnings).toBe(1000);
    });
  });

  describe("GET /admin/best-clients", () => {
    it("should return top clients by earnings", async () => {
      const startDate = new Date("2022-01-01 10:00:00");
      const endDate = new Date("2025-01-01 10:00:00");

      const client1 = await Profile.create({
        firstName: "Client1",
        lastName: "Smith",
        email: "client1@example.com",
        phone: "1234567890",
        profession: "IT",
        balance: 1000.0,
        type: "client",
      });

      const client2 = await Profile.create({
        firstName: "Client2",
        lastName: "Johnson",
        email: "client2@example.com",
        phone: "0987654321",
        profession: "IT",
        balance: 800.0,
        type: "client",
      });

      const contract1 = await Contract.create({
        ClientId: client1.id,
        ContractorId: 1,
        status: "completed",
        terms: "test",
      });

      const job1 = await Job.create({
        price: 1000,
        paymentDate: "2023-01-01 10:00:00",
        ContractId: contract1.id,
        description: "test",
        paid: true,
      });

      const contract2 = await Contract.create({
        ClientId: client2.id,
        ContractorId: 1,
        status: "completed",
        terms: "test",
      });

      const job2 = await Job.create({
        price: 800,
        paymentDate: "2024-01-01 10:00:00",
        ContractId: contract2.id,
        description: "test",
        paid: true,
      });

      const res = await request(app).get(
        `/admin/best-clients?start=${startDate.toISOString()}&end=${endDate.toISOString()}&limit=2`
      );

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].fullName).toBe("Client1 Smith");
      expect(res.body[0].paid).toBe(1000);
      expect(res.body[1].fullName).toBe("Client2 Johnson");
      expect(res.body[1].paid).toBe(800);
    });
  });
});

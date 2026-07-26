import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: process.env.NODE_ENV === "test" ? path.resolve(process.cwd(), ".env.test") : undefined,
  override: true
});
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

console.log("db.ts init: DATABASE_URL =", process.env.DATABASE_URL);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;

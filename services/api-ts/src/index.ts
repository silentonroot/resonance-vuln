import express from "express";
import helmet from "helmet";
import cors from "cors";
import "dotenv/config";
import { db } from "./db.js";
import type { PublicUser } from "./types/user.js";
import { registerSchema } from "./auth/register-schema.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { hashPassword } from "./auth/password.js";

type UserRow = PublicUser & RowDataPacket; 
const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const VERSION: string = "0.1.0";

app.use(helmet());
app.use(cors({origin: "http://localhost:5173"}));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
	res.json({
		service: "resonance-api-ts",
		status: "ok",
		version: VERSION,
	});
});

app.get("/health/db", async (_req, res) => {
	try {
	  await db.query("SELECT 1");

	  res.json({
	    status: "ok",
	    database: "connected",
	  });
	} catch (error) {
	  console.error("Database check failed:", error);

	  res.status(503).json({
	    status: "error",
	    database: "unavailable",
	   });
	 }
	});
	


app.get("/users", async (_req, res) => {
  try {
    const [users] = await db.query<UserRow[]>(
      "SELECT id, name, email, role FROM users ORDER BY id"
    );

    res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);

    res.status(500).json({
      error: "Unable to fetch users",
    });
  }
});

app.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      error: "ID must be a positive integer",
    });
  }

  try {
    const [users] = await db.execute<UserRow[]>(
      "SELECT id, name, email, role FROM users WHERE id = ?", 
      [id]
    );

    const user = users[0];

    if (!user) {
      return res.status(404).json({
	      error: "User not found",
      });
    }

    res.json(user);
  } catch (error) {
    console.error("Failed to fetch user:", error);

    res.status(500).json({
	    error: "Unable to fetch user",
    });
  }
});

app.post("/auth/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Name, email, or password is invalid",
    });
  }

  const { name, email, password } = result.data;

  try {
    const hashedPassword = await hashPassword(password);
    
    const [insertResult] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (name, email, role, hashed_password) VALUES (?,?,?,?)",
      [name, email, "user", hashedPassword]
    );

    const user: PublicUser = {
      id: insertResult.insertId,
      name,
      email,
      role: "user",
    };

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error && error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        error: "Email already registered",
    });
  }

  res.status(500).json({
    error: "Unable to register user",
  });
 }
});

app.listen(PORT, "127.0.0.1", () => {
	console.log(`Resonance API running on port ${PORT}`);
});


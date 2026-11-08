import "dotenv/config";
import mysql from "mysql2/promise";

const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
	throw new Error("Missing required database settings in .env"); 
}

export const db = mysql.createPool({
	host: DB_HOST,
	port: Number(process.env.DB_PORT ?? 3306),
	database: DB_NAME,
	user: DB_USER,
	password: DB_PASSWORD,
	connectionLimit: 5,
});


import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.STORAGE_URL);

export default sql;

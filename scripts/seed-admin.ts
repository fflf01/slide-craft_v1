import { ensureDbSchema } from "../src/lib/db";

await ensureDbSchema();
console.log("Usuário admin criado (ou já existia): admin / 1234567");

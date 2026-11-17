process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-de-test";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
// Los tests siempre usan la base en memoria, aunque haya un MONGO_URI en el entorno.
delete process.env.MONGO_URI;

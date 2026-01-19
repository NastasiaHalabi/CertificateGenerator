import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import pdfRoutes from "./routes/pdf";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/pdf", pdfRoutes);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
});

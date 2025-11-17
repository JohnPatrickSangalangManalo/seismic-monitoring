import express from "express";
import cors from "cors";
import { scrapePHIVOLCS } from "../src/scraper";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/earthquakes", async (req, res) => {
  try {
    console.log("Fetching earthquake data...");
    const earthquakes = await scrapePHIVOLCS();
    res.json(earthquakes);
  } catch (error) {
    console.error("Error fetching earthquakes:", error);
    res.status(500).json({
      error: "Failed to fetch earthquake data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;

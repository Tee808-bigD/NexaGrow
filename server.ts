import express from "express";
import path from "path";
import dotenv from "dotenv";
import alasql from "alasql";
import { createClient } from "@clickhouse/client";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini SDK Client
let ai: GoogleGenAI | null = null;
const isNvidiaMode = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith("nvapi-"));

if (process.env.GEMINI_API_KEY) {
  if (!isNvidiaMode) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.log("NVIDIA NIM client detected via nvapi- key prefix.");
  }
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
}

// Default Movie Dataset (Media & Entertainment theme)
const DEFAULT_MOVIES = [
  { movie_id: 1, title: "Galactic Odyssey", genre: "Sci-Fi", release_date: "2025-11-15", budget: 150000000, box_office_domestic: 120000000, box_office_international: 250000000, streaming_views: 5000000, sentiment_score: 0.82 },
  { movie_id: 2, title: "Shadows of Truth", genre: "Drama", release_date: "2025-12-05", budget: 35000000, box_office_domestic: 45000000, box_office_international: 30000000, streaming_views: 12000000, sentiment_score: 0.91 },
  { movie_id: 3, title: "The Neon Chase", genre: "Action", release_date: "2026-01-20", budget: 95000000, box_office_domestic: 85000000, box_office_international: 110000000, streaming_views: 8000000, sentiment_score: 0.68 },
  { movie_id: 4, title: "Laugh Out Loud", genre: "Comedy", release_date: "2026-02-14", budget: 20000000, box_office_domestic: 55000000, box_office_international: 25000000, streaming_views: 15000000, sentiment_score: 0.74 },
  { movie_id: 5, title: "Eerie Whispers", genre: "Horror", release_date: "2026-03-13", budget: 12000000, box_office_domestic: 40000000, box_office_international: 35000000, streaming_views: 9000000, sentiment_score: 0.70 }
];

// ClickHouse configuration state
const chConfig = {
  host: process.env.CLICKHOUSE_HOST || "",
  port: parseInt(process.env.CLICKHOUSE_PORT || "8443"),
  username: process.env.CLICKHOUSE_USERNAME || "default",
  password: process.env.CLICKHOUSE_PASSWORD || "",
  database: "default",
  useRemote: false // Set to true once successfully connected
};

// Simple helper to check if credentials are set
function hasRemoteCredentials() {
  return !!(chConfig.host && chConfig.password);
}

// Establish ClickHouse Client if config is active
function getClickHouseClient() {
  if (!chConfig.useRemote || !chConfig.host || !chConfig.password) {
    return null;
  }
  try {
    const url = chConfig.host.startsWith("http") ? chConfig.host : `https://${chConfig.host}:${chConfig.port}`;
    return createClient({
      url: url,
      username: chConfig.username,
      password: chConfig.password,
      database: chConfig.database,
      clickhouse_settings: {
        web_query_timeout_ms: 10000,
      }
    });
  } catch (err) {
    console.error("Error creating ClickHouse client:", err);
    return null;
  }
}

// Local In-Memory DB Management (Alasql)
let localMovies = [...DEFAULT_MOVIES];

function resetLocalDb() {
  try {
    // Drop existing table
    alasql("DROP TABLE IF EXISTS movie_performance");
    // Create schema
    alasql("CREATE TABLE movie_performance (movie_id INT, title STRING, genre STRING, release_date STRING, budget DOUBLE, box_office_domestic DOUBLE, box_office_international DOUBLE, streaming_views INT, sentiment_score DOUBLE)");
    // Load default movies
    alasql("SELECT * INTO movie_performance FROM ?", [DEFAULT_MOVIES]);
    localMovies = [...DEFAULT_MOVIES];
    console.log("Local alasql database initialized with default film performance records.");
  } catch (err) {
    console.error("Failed to initialize local alasql database:", err);
  }
}

// Initial seeding
resetLocalDb();

// Preprocess query to handle schema prefixes (e.g., 'default.movie_performance' -> 'movie_performance')
function preprocessQueryForLocal(query: string): string {
  return query.replace(/default\.movie_performance/gi, "movie_performance");
}

// ----------------------------------------
// Express API Routes
// ----------------------------------------

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: chConfig.useRemote ? "Remote ClickHouse" : "Local Simulator" });
});

// Get current database stats and connection mode
app.get("/api/db/status", async (req, res) => {
  const isRemote = chConfig.useRemote;
  let activeHost = isRemote ? chConfig.host : "Local In-Memory Simulator (Alasql)";
  let rowCount = 0;

  const client = getClickHouseClient();
  if (client) {
    try {
      const resultSet = await client.query({
        query: "SELECT count() as count FROM default.movie_performance",
        format: "JSONEachRow"
      });
      const data: any = await resultSet.json();
      rowCount = data[0] ? Number(data[0].count) : 0;
    } catch (err: any) {
      console.error("Remote ClickHouse count failed, reverting useRemote status:", err);
      chConfig.useRemote = false;
      rowCount = localMovies.length;
      activeHost = "Fallback to Local In-Memory Simulator";
    }
  } else {
    rowCount = localMovies.length;
  }

  res.json({
    useRemote: chConfig.useRemote,
    hasCredentials: hasRemoteCredentials(),
    host: activeHost,
    rowCount: rowCount,
    schema: "default.movie_performance"
  });
});

// Save and test ClickHouse credentials
app.post("/api/db/config", async (req, res) => {
  const { host, port, username, password, database, useRemote } = req.body;

  if (host !== undefined) chConfig.host = host;
  if (port !== undefined) chConfig.port = parseInt(port) || 8443;
  if (username !== undefined) chConfig.username = username;
  if (password !== undefined) chConfig.password = password;
  if (database !== undefined) chConfig.database = database || "default";

  if (useRemote === false) {
    chConfig.useRemote = false;
    return res.json({ success: true, message: "Switched to Local Simulator mode.", useRemote: false });
  }

  // If testing/using remote
  if (!chConfig.host || !chConfig.password) {
    chConfig.useRemote = false;
    return res.status(400).json({
      success: false,
      message: "Cannot enable ClickHouse Cloud: host and password are required."
    });
  }

  // Attempt to connect and initialize database
  try {
    const url = chConfig.host.startsWith("http") ? chConfig.host : `https://${chConfig.host}:${chConfig.port}`;
    const testClient = createClient({
      url: url,
      username: chConfig.username,
      password: chConfig.password,
      database: chConfig.database,
      clickhouse_settings: {
        web_query_timeout_ms: 5000,
      }
    });

    // Test query
    const pingRes = await testClient.query({
      query: "SELECT 1 as ping",
      format: "JSONEachRow"
    });
    await pingRes.json();

    // Setup schema
    await testClient.exec({
      query: `
        CREATE TABLE IF NOT EXISTS default.movie_performance (
          movie_id UInt32,
          title String,
          genre LowCardinality(String),
          release_date Date,
          budget Float64,
          box_office_domestic Float64,
          box_office_international Float64,
          streaming_views UInt64,
          sentiment_score Float32
        ) ENGINE = MergeTree()
        ORDER BY (genre, release_date, movie_id);
      `
    });

    // Seed if empty
    const checkRes = await testClient.query({
      query: "SELECT count() as count FROM default.movie_performance",
      format: "JSONEachRow"
    });
    const checkData: any = await checkRes.json();
    const count = checkData[0] ? Number(checkData[0].count) : 0;

    if (count === 0) {
      await testClient.insert({
        table: 'default.movie_performance',
        values: DEFAULT_MOVIES,
        format: 'JSONEachRow'
      });
      console.log("Remote ClickHouse initialized with sample film performance data.");
    }

    chConfig.useRemote = true;
    res.json({
      success: true,
      message: "Successfully connected to ClickHouse Cloud! Database schema verified.",
      useRemote: true
    });
  } catch (err: any) {
    chConfig.useRemote = false;
    console.error("ClickHouse Connection Test Failed:", err);
    res.status(500).json({
      success: false,
      message: `Failed to connect to ClickHouse Cloud: ${err.message || err}. Reverting to Local Simulator.`
    });
  }
});

// Retrieve current config (mask password)
app.get("/api/db/config", (req, res) => {
  res.json({
    host: chConfig.host,
    port: chConfig.port,
    username: chConfig.username,
    database: chConfig.database,
    useRemote: chConfig.useRemote,
    passwordMasked: chConfig.password ? "••••••••••••" : ""
  });
});

// Retrieve raw data list
app.get("/api/clickhouse/data", async (req, res) => {
  const client = getClickHouseClient();
  if (client) {
    try {
      const resultSet = await client.query({
        query: "SELECT * FROM default.movie_performance ORDER BY release_date DESC",
        format: "JSONEachRow"
      });
      const data = await resultSet.json();
      return res.json({ source: "ClickHouse Cloud", data });
    } catch (err: any) {
      console.error("Failed to query ClickHouse Cloud, falling back to local:", err.message);
    }
  }

  // Fallback to local
  res.json({ source: "Local Simulator", data: localMovies });
});

// Reset local data back to template
app.post("/api/clickhouse/reset", (req, res) => {
  resetLocalDb();
  res.json({ success: true, message: "Local database reset successfully.", data: localMovies });
});

// Helper function to validate SQL queries against security standards and SQL injection vulnerabilities
function validateSqlQuery(query: string): { valid: boolean; error?: string } {
  if (!query) {
    return { valid: false, error: "Missing SQL query." };
  }

  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  // 1. Must be a read-only SELECT statement
  if (!normalized.startsWith("select")) {
    return { valid: false, error: "Only SELECT statements are permitted for analytics safety." };
  }

  // 2. Strict block against multi-statement query stacking (semicolon injection)
  if (trimmed.includes(";")) {
    const lastCharIdx = trimmed.indexOf(";");
    // If there is any character after the semicolon, or multiple semicolons exist, reject it
    if (lastCharIdx !== trimmed.length - 1 || trimmed.split(";").length > 2) {
      return { valid: false, error: "Multi-statement execution via semicolons is strictly prohibited for security." };
    }
  }

  // 3. Prohibit standard DDL/DML mutation and administrative commands
  const forbiddenKeywords = [
    "insert", "drop", "alter", "truncate", "delete", "update", "create", "grant", 
    "revoke", "system", "rename", "optimize", "kill", "attach", "detach"
  ];
  for (const kw of forbiddenKeywords) {
    // Match word boundaries to prevent false positives inside movie titles or text fields
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(normalized)) {
      return { valid: false, error: `Modifying, administrative, or unauthorized SQL operation '${kw}' is strictly prohibited.` };
    }
  }

  return { valid: true };
}

// Run a user-submitted custom SQL query
app.post("/api/clickhouse/query", async (req, res) => {
  const { query } = req.body;
  const validation = validateSqlQuery(query);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const client = getClickHouseClient();
  const startTime = Date.now();

  if (client) {
    try {
      const resultSet = await client.query({
        query: query,
        format: "JSONEachRow"
      });
      const rows = await resultSet.json();
      return res.json({
        success: true,
        source: "ClickHouse Cloud",
        query,
        executionTimeMs: Date.now() - startTime,
        rows
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `ClickHouse Error: ${err.message}`
      });
    }
  }

  // Local Simulator Query Execution
  try {
    const preprocessed = preprocessQueryForLocal(query);
    const rows = alasql(preprocessed);
    res.json({
      success: true,
      source: "Local Simulator (Alasql)",
      query,
      executionTimeMs: Date.now() - startTime,
      rows: Array.isArray(rows) ? rows : [rows]
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `SQL Simulator Error: ${err.message}`
    });
  }
});

// Insert a new film record
app.post("/api/clickhouse/add", async (req, res) => {
  const { title, genre, release_date, budget, box_office_domestic, box_office_international, streaming_views, sentiment_score } = req.body;

  if (!title || !genre || !release_date) {
    return res.status(400).json({ error: "Title, Genre, and Release Date are required parameters." });
  }

  const newMovie = {
    movie_id: Math.floor(Math.random() * 1000000) + 10,
    title,
    genre,
    release_date,
    budget: Number(budget) || 0,
    box_office_domestic: Number(box_office_domestic) || 0,
    box_office_international: Number(box_office_international) || 0,
    streaming_views: Number(streaming_views) || 0,
    sentiment_score: Number(sentiment_score) || 0.0
  };

  const client = getClickHouseClient();
  if (client) {
    try {
      await client.insert({
        table: "default.movie_performance",
        values: [newMovie],
        format: "JSONEachRow"
      });
      console.log("Successfully inserted record into remote ClickHouse table:", newMovie);
    } catch (err: any) {
      console.error("Remote ClickHouse insert failed, updating local simulator anyway:", err);
    }
  }

  // Update Local Simulator Database
  try {
    localMovies.push(newMovie);
    alasql("INSERT INTO movie_performance VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      newMovie.movie_id,
      newMovie.title,
      newMovie.genre,
      newMovie.release_date,
      newMovie.budget,
      newMovie.box_office_domestic,
      newMovie.box_office_international,
      newMovie.streaming_views,
      newMovie.sentiment_score
    ]);
  } catch (err) {
    console.error("Failed to insert record in local database:", err);
  }

  res.json({ success: true, message: "Film record successfully loaded into database.", data: newMovie });
});

// ----------------------------------------
// Gemini AI Agent Tools & Chat Controller
// ----------------------------------------

// Tool Definitions
const getTableSchemaTool: FunctionDeclaration = {
  name: "get_table_schema",
  description: "Returns the schema definition of the movie_performance table to inform SQL query structure.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: []
  }
};

const runAnalyticalQueryTool: FunctionDeclaration = {
  name: "run_analytical_query",
  description: "Executes a read-only SELECT query on the movie_performance table. Use this tool to aggregate metrics, calculate ROI, filter, or sort movies.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The SQL SELECT query to run against the movie_performance table (e.g. SELECT genre, AVG(budget) FROM movie_performance GROUP BY genre)"
      }
    },
    required: ["query"]
  }
};

const insertMovieTool: FunctionDeclaration = {
  name: "insert_movie",
  description: "Inserts a new movie performance record directly into the ClickHouse database. Use this when the user requests to load, add, insert, save, or record a movie with stats.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the movie." },
      genre: { type: Type.STRING, description: "The genre of the movie (e.g., Sci-Fi, Drama, Action, Comedy, Horror)." },
      release_date: { type: Type.STRING, description: "The release date in YYYY-MM-DD format." },
      budget: { type: Type.NUMBER, description: "The production budget of the movie in USD." },
      box_office_domestic: { type: Type.NUMBER, description: "Domestic box office earnings in USD." },
      box_office_international: { type: Type.NUMBER, description: "International box office earnings in USD." },
      streaming_views: { type: Type.NUMBER, description: "Streaming views count on platform." },
      sentiment_score: { type: Type.NUMBER, description: "Audience sentiment score from 0.0 to 1.0." }
    },
    required: ["title", "genre", "release_date", "budget"]
  }
};

const webSearchMoviesTool: FunctionDeclaration = {
  name: "web_search_movies",
  description: "Performs a live real-time query of Wikipedia's database to retrieve real-world details, summaries, cast, budget, or box office statistics for any movie or franchise.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The name of the movie or search query to find film details for (e.g., 'Dune Part Two 2024 budget')." }
    },
    required: ["query"]
  }
};

const simulateBlockbusterPerformanceTool: FunctionDeclaration = {
  name: "simulate_blockbuster_performance",
  description: "Simulates and forecasts the box office performance, international audience reach, and ROI of a hypothetical movie under theatrical, streaming, or hybrid release tracks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The hypothetical movie title." },
      genre: { type: Type.STRING, description: "The genre of the film (e.g., Action, Sci-Fi, Comedy, Drama, Horror)." },
      budget: { type: Type.NUMBER, description: "The proposed production budget in USD." },
      target_sentiment: { type: Type.NUMBER, description: "Target audience sentiment score from 0.1 to 1.0 (defaults to 0.75)." },
      release_strategy: { type: Type.STRING, description: "The release strategy: 'Theatrical-First', 'Streaming-First', or 'Hybrid'." }
    },
    required: ["title", "genre", "budget"]
  }
};

// Tool Execution Handler
async function executeAgentTool(name: string, args: any) {
  if (name === "get_table_schema") {
    return {
      schema: `
        Table: default.movie_performance
        Columns:
          - movie_id: UInt32 (Unique ID)
          - title: String (Movie Title)
          - genre: LowCardinality(String) (Allowed values: Sci-Fi, Drama, Action, Comedy, Horror, or custom)
          - release_date: Date (YYYY-MM-DD)
          - budget: Float64 (Production cost in USD)
          - box_office_domestic: Float64 (Domestic earnings in USD)
          - box_office_international: Float64 (International earnings in USD)
          - streaming_views: UInt64 (Total views on streaming platform)
          - sentiment_score: Float32 (Audience sentiment score between 0.0 and 1.0)
      `.trim()
    };
  } else if (name === "run_analytical_query") {
    const query = args.query;
    const validation = validateSqlQuery(query);
    if (!validation.valid) {
      return { error: validation.error };
    }

    const client = getClickHouseClient();
    if (client) {
      try {
        const resultSet = await client.query({
          query: query,
          format: "JSONEachRow"
        });
        const rows = await resultSet.json();
        return { rows, source: "ClickHouse Cloud", queryUsed: query };
      } catch (err: any) {
        return { error: `ClickHouse execution failed: ${err.message}`, queryUsed: query };
      }
    } else {
      try {
        const preprocessed = preprocessQueryForLocal(query);
        const rows = alasql(preprocessed);
        return { rows, source: "Local ClickHouse Simulator (Alasql)", queryUsed: query };
      } catch (err: any) {
        return { error: `Local SQL execution failed: ${err.message}`, queryUsed: query };
      }
    }
  } else if (name === "insert_movie") {
    const { title, genre, release_date, budget, box_office_domestic, box_office_international, streaming_views, sentiment_score } = args;
    const newMovie = {
      movie_id: Math.floor(Math.random() * 1000000) + 10,
      title,
      genre,
      release_date: release_date || new Date().toISOString().split('T')[0],
      budget: Number(budget) || 0,
      box_office_domestic: Number(box_office_domestic) || 0,
      box_office_international: Number(box_office_international) || 0,
      streaming_views: Number(streaming_views) || 0,
      sentiment_score: Number(sentiment_score) || 0.75
    };

    const client = getClickHouseClient();
    if (client) {
      try {
        await client.insert({
          table: "default.movie_performance",
          values: [newMovie],
          format: "JSONEachRow"
        });
        console.log("[AI Agent Tool] Successfully inserted movie into remote ClickHouse:", newMovie);
      } catch (err: any) {
        console.error("[AI Agent Tool] Remote ClickHouse insert failed, saving locally:", err);
      }
    }

    try {
      localMovies.push(newMovie);
      alasql("INSERT INTO movie_performance VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        newMovie.movie_id,
        newMovie.title,
        newMovie.genre,
        newMovie.release_date,
        newMovie.budget,
        newMovie.box_office_domestic,
        newMovie.box_office_international,
        newMovie.streaming_views,
        newMovie.sentiment_score
      ]);
      console.log("[AI Agent Tool] Successfully inserted movie into local database:", newMovie);
    } catch (err) {
      console.error("[AI Agent Tool] Local database insert failed:", err);
    }

    return { success: true, message: `Successfully inserted movie '${title}' into the database!`, data: newMovie };
  } else if (name === "web_search_movies") {
    const query = args.query;
    try {
      console.log(`[AI Agent Tool] Performing live Wikipedia search for: "${query}"`);
      const openSearchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`);
      if (openSearchRes.ok) {
        const searchData = await openSearchRes.json();
        const titles = searchData[1];
        const urls = searchData[3];
        if (titles && titles.length > 0) {
          const matchedTitle = titles[0];
          const matchedUrl = urls[0];
          
          const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matchedTitle.replace(/ /g, "_"))}`);
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            return {
              matchedTitle,
              summary: summaryData.extract || "No extract available.",
              url: matchedUrl,
              thumbnail: summaryData.thumbnail ? summaryData.thumbnail.source : null,
              description: summaryData.description || ""
            };
          } else {
            return { matchedTitle, url: matchedUrl, summary: `Found article: ${matchedTitle}, but failed to load summary extracts.` };
          }
        }
      }
      return { message: `No real-time results found for '${query}'.` };
    } catch (e: any) {
      return { error: `Web search execution failed: ${e.message}` };
    }
  } else if (name === "simulate_blockbuster_performance") {
    const { title, genre, budget, target_sentiment, release_strategy } = args;
    const budgetVal = Number(budget) || 10000000;
    const sentiment = Number(target_sentiment) || 0.75;
    const strategy = release_strategy || "Hybrid";

    let domesticFactor = 0.45;
    let internationalFactor = 0.65;
    let viewMultiplier = 1.0;

    const lowerGenre = (genre || "").toLowerCase();
    if (lowerGenre.includes("action") || lowerGenre.includes("sci-fi")) {
      domesticFactor = 0.55;
      internationalFactor = 0.85;
      viewMultiplier = 1.2;
    } else if (lowerGenre.includes("comedy")) {
      domesticFactor = 0.60;
      internationalFactor = 0.30;
      viewMultiplier = 1.5;
    } else if (lowerGenre.includes("drama")) {
      domesticFactor = 0.40;
      internationalFactor = 0.45;
      viewMultiplier = 2.0;
    } else if (lowerGenre.includes("horror")) {
      domesticFactor = 0.70;
      internationalFactor = 0.50;
      viewMultiplier = 1.1;
    }

    let domesticOffice = 0;
    let internationalOffice = 0;
    let streamingViews = 0;

    if (strategy === "Theatrical-First") {
      domesticOffice = Math.round(budgetVal * domesticFactor * (sentiment * 1.5));
      internationalOffice = Math.round(budgetVal * internationalFactor * (sentiment * 1.6));
      streamingViews = Math.round((budgetVal / 10) * viewMultiplier * (sentiment * 0.5));
    } else if (strategy === "Streaming-First") {
      domesticOffice = Math.round(budgetVal * domesticFactor * 0.15);
      internationalOffice = Math.round(budgetVal * internationalFactor * 0.15);
      streamingViews = Math.round((budgetVal / 5) * viewMultiplier * 15 * sentiment);
    } else { // Hybrid
      domesticOffice = Math.round(budgetVal * domesticFactor * (sentiment * 0.9));
      internationalOffice = Math.round(budgetVal * internationalFactor * (sentiment * 1.0));
      streamingViews = Math.round((budgetVal / 8) * viewMultiplier * 8 * sentiment);
    }

    const totalBoxOffice = domesticOffice + internationalOffice;
    const roi = ((totalBoxOffice - budgetVal) / budgetVal) * 100;

    return {
      simulationResult: {
        title,
        genre,
        budget: budgetVal,
        target_sentiment: sentiment,
        release_strategy: strategy,
        projected_box_office_domestic: domesticOffice,
        projected_box_office_international: internationalOffice,
        projected_total_box_office: totalBoxOffice,
        projected_streaming_views: streamingViews,
        projected_roi: Number(roi.toFixed(2)),
        verdict: roi > 50 ? "Highly Lucrative Blockbuster" : roi > 0 ? "Moderately Profitable Release" : "High-Risk Deficit Project"
      }
    };
  }
  return { error: `Unknown tool: ${name}` };
}

// AI Agent Conversation Controller
app.post("/api/agent/chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing chat message." });
  }

  const isNvidia = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith("nvapi-"));
  if (!ai && !isNvidia) {
    return res.status(500).json({
      error: "AI Client is not initialized. Please verify your GEMINI_API_KEY."
    });
  }

  const systemInstruction = `
    You are 'Studio Intelligence Agent', an expert film studio financial analyst. You have access to a ClickHouse database containing movie performance records.
    
    You have the following highly advanced capabilities:
    1. SQL Analytics (get_table_schema, run_analytical_query): Query or aggregate metrics across movie performance records. Always call get_table_schema first if you are not sure of columns.
    2. Write & Load Movies (insert_movie): Add or insert real-world or simulated movie records with complete budget/box office stats directly into the active ClickHouse database.
    3. Real-time Wikipedia Search (web_search_movies): If the user asks about a real film that is not in our database, ALWAYS call web_search_movies to find the actual Wikipedia page summary, budget, domestic/international box office, and release date, and then offer to insert it into the database.
    4. Blockbuster ROI Forecasting (simulate_blockbuster_performance): Run hypothetical simulation tracks to forecast budget splits, projected domestic/international office returns, and streaming views under theatrical-first, streaming-first, or hybrid tracks.

    Formula for ROI: ((box_office_domestic + box_office_international - budget) / budget).
    Ensure you format monetary values, percentages, and views beautifully (e.g. $150.0M, 85.4% ROI, 12M views) for high-scannability readability.
    Do not print raw JSON output directly. Explain the numbers, highlight matched article titles, show simulated forecasts, and tell a compelling film analytics narrative.
  `;

  const contents: any[] = [];

  // Format history
  if (Array.isArray(history)) {
    for (const item of history) {
      contents.push({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }]
      });
    }
  }

  // Add active prompt
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const tools = [{ functionDeclarations: [getTableSchemaTool, runAnalyticalQueryTool, insertMovieTool, webSearchMoviesTool, simulateBlockbusterPerformanceTool] }];
  const toolLogs: { toolName: string; args: any; result: any }[] = [];

  // NVIDIA NIM proxy helper to convert Gemini format to standard OpenAI messages & call NVIDIA NIM
  async function generateWithNvidiaNim(payloadContents: any[]) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    const url = "https://integrate.api.nvidia.com/v1/chat/completions";

    const nvidiaTools = [
      {
        type: "function",
        function: {
          name: "get_table_schema",
          description: "Get the column names and data types of the movie_performance ClickHouse table.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "run_analytical_query",
          description: "Run a read-only SQL SELECT query on default.movie_performance and get results.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The SQL SELECT statement to run."
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_movie",
          description: "Inserts a new movie performance record directly into the ClickHouse database.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              genre: { type: "string" },
              release_date: { type: "string" },
              budget: { type: "number" },
              box_office_domestic: { type: "number" },
              box_office_international: { type: "number" },
              streaming_views: { type: "number" },
              sentiment_score: { type: "number" }
            },
            required: ["title", "genre", "release_date", "budget"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "web_search_movies",
          description: "Performs a live real-time query of Wikipedia to retrieve real-world details, summaries, budgets, or box office statistics for any movie.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "simulate_blockbuster_performance",
          description: "Simulates and forecasts the box office performance, international audience reach, and ROI of a hypothetical movie under theatrical, streaming, or hybrid release tracks.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              genre: { type: "string" },
              budget: { type: "number" },
              target_sentiment: { type: "number" },
              release_strategy: { type: "string" }
            },
            required: ["title", "genre", "budget"]
          }
        }
      }
    ];

    const messages: any[] = [
      { role: "system", content: systemInstruction }
    ];

    for (const turn of payloadContents) {
      const isModel = turn.role === "model";
      const isTool = turn.role === "tool";
      const parts = turn.parts || [];

      if (!isModel && !isTool) {
        const textPart = parts.find((p: any) => p.text);
        if (textPart) {
          messages.push({ role: "user", content: textPart.text });
        }
      } else if (isModel) {
        const textPart = parts.find((p: any) => p.text);
        const textContent = textPart ? textPart.text : "";

        const modelFunctionCalls = parts
          .filter((p: any) => p.functionCall)
          .map((p: any) => p.functionCall);

        if (modelFunctionCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: textContent || null,
            tool_calls: modelFunctionCalls.map((fc: any, idx: number) => ({
              id: `call_${fc.name}_${idx}`,
              type: "function",
              function: {
                name: fc.name,
                arguments: typeof fc.args === "string" ? fc.args : JSON.stringify(fc.args)
              }
            }))
          });
        } else {
          messages.push({ role: "assistant", content: textContent || "" });
        }
      } else if (isTool) {
        for (const [idx, part] of parts.entries()) {
          if (part.functionResponse) {
            messages.push({
              role: "tool",
              tool_call_id: `call_${part.functionResponse.name}_${idx}`,
              name: part.functionResponse.name,
              content: JSON.stringify(part.functionResponse.response.result)
            });
          }
        }
      }
    }

    let dynamicModels: string[] = [];
    try {
      console.log("[AI Agent] Fetching active models from NVIDIA Catalog...");
      const modelsResponse = await fetch("https://integrate.api.nvidia.com/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        if (modelsData && Array.isArray(modelsData.data)) {
          const availableIds = modelsData.data.map((m: any) => m.id);
          console.log(`[AI Agent] Total models found in catalog: ${availableIds.length}`);
          
          const candidates = availableIds.filter((id: string) => {
            const lower = id.toLowerCase();
            return (lower.includes("llama") || lower.includes("nemotron") || lower.includes("deepseek") || lower.includes("mistral")) &&
                   !lower.includes("vision") &&
                   !lower.includes("rerank") &&
                   !lower.includes("embed") &&
                   !lower.includes("safety") &&
                   !lower.includes("guard");
          });
          
          if (candidates.length > 0) {
            candidates.sort((a: string, b: string) => {
              const score = (id: string) => {
                const lower = id.toLowerCase();
                if (lower.includes("llama-3.3-70b")) return 10;
                if (lower.includes("llama-3.1-nemotron-70b")) return 9;
                if (lower.includes("llama-3.1-405b")) return 8;
                if (lower.includes("llama-3.1-70b")) return 7;
                if (lower.includes("llama-3.1-nemotron-51b")) return 6;
                if (lower.includes("deepseek-r1") || lower.includes("deepseek-v3")) return 5;
                if (lower.includes("llama-3.2-11b")) return 4;
                if (lower.includes("llama-3-70b")) return 3;
                if (lower.includes("llama-3-8b")) return 2;
                return 0;
              };
              return score(b) - score(a);
            });
            dynamicModels = candidates;
            console.log(`[AI Agent] Filtered and ranked candidates:`, dynamicModels.slice(0, 5));
          }
        }
      }
    } catch (e) {
      console.error("[AI Agent] Failed to dynamically query NVIDIA models: ", e);
    }

    const fallbackModels = [
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "nvidia/llama-3.1-nemotron-51b-instruct",
      "meta/llama-3-70b-instruct",
      "meta/llama-3-8b-instruct"
    ];

    // Limit models to try to a maximum of 3 highly-rated models to guarantee instant response times and prevent sequential timeouts
    const uniqueModels = Array.from(new Set(dynamicModels.length > 0 ? [...dynamicModels, ...fallbackModels] : fallbackModels));
    const modelsToTry = uniqueModels.slice(0, 3);

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Agent] Invoking NVIDIA NIM model: ${modelName}...`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            tools: nvidiaTools,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`NVIDIA NIM HTTP ${response.status}: ${errText}`);
        }

        const responseData: any = await response.json();
        const choice = responseData.choices?.[0];
        if (!choice) {
          throw new Error("Invalid response format from NVIDIA NIM API.");
        }

        const messageObj = choice.message;
        const functionCalls = messageObj.tool_calls ? messageObj.tool_calls.map((tc: any) => {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch (e) {
            parsedArgs = tc.function.arguments;
          }
          return {
            name: tc.function.name,
            args: parsedArgs,
            id: tc.id
          };
        }) : [];

        return {
          text: messageObj.content || "",
          functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  ...(messageObj.content ? [{ text: messageObj.content }] : []),
                  ...functionCalls.map((fc: any) => ({
                    functionCall: {
                      name: fc.name,
                      args: fc.args
                    }
                  }))
                ]
              }
            }
          ]
        };

      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Agent] NVIDIA NIM model ${modelName} failed:`, err.message || err);
      }
    }

    throw lastError || new Error("Failed to generate completions using NVIDIA NIM API.");
  }

  // Robust generation helper with automatic retry and stable fallback
  async function generateWithRetry(payloadContents: any[]) {
    if (isNvidia) {
      return generateWithNvidiaNim(payloadContents);
    }

    let lastError: any = null;
    const modelsToTry = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    const maxAttempts = 2;

    for (const modelName of modelsToTry) {
      for (let i = 0; i < maxAttempts; i++) {
        try {
          console.log(`[AI Agent] Invoking ${modelName} (Attempt ${i + 1}/${maxAttempts})...`);
          const response = await ai!.models.generateContent({
            model: modelName,
            contents: payloadContents,
            config: {
              systemInstruction: systemInstruction,
              tools: tools,
              temperature: 0.1,
            }
          });
          if (response) return response;
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Agent] Warning: ${modelName} returned error: ${err.message || err}`);
          // Exponential backoff wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)));
        }
      }
    }
    throw lastError || new Error("All active models are experiencing high demand. Please try again in a moment.");
  }

  try {
    let response = await generateWithRetry(contents);

    let functionCalls = response.functionCalls;
    let iterations = 0;
    const maxIterations = 5;

    while (functionCalls && functionCalls.length > 0 && iterations < maxIterations) {
      iterations++;
      console.log(`Agent Iteration ${iterations}: Model requested function call`, functionCalls);

      // Append model response containing function call request
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      // Execute function calls
      const functionResponseParts: any[] = [];
      for (const call of functionCalls) {
        const result = await executeAgentTool(call.name, call.args);
        toolLogs.push({
          toolName: call.name,
          args: call.args,
          result: result
        });

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: result }
          }
        });
      }

      // Append tool response
      contents.push({
        role: "tool",
        parts: functionResponseParts
      });

      // Query Gemini again with tool output
      response = await generateWithRetry(contents);

      functionCalls = response.functionCalls;
    }

    res.json({
      text: response.text || "I was unable to formulate a complete analysis.",
      toolLogs: toolLogs
    });

  } catch (err: any) {
    console.error("AI Agent Session Error:", err);
    
    // Check if error is related to NVIDIA API key permissions or account limits (e.g., 404 Function not found for account)
    const errStr = (err.message || String(err)).toLowerCase();
    if (errStr.includes("nvidia") || errStr.includes("nvapi") || errStr.includes("404") || errStr.includes("not found")) {
      const diagnosticMsg = `⚠️ **Studio Intelligence Agent - Connection Diagnostics**

I encountered an error trying to reach the AI models via NVIDIA NIM:
\`\`\`
${err.message || err}
\`\`\`

### 🔍 Root Cause Analysis
* **NVIDIA NIM HTTP 404/Not Found**: This specific error indicates that your NVIDIA Build account key is authenticated, but your **"Personal" Organization is missing the 'Public API Endpoints' permission** from NVIDIA, or the targeted model endpoint is restricted. 

### ⚡ Recommended Fixes
1. **Switch to Google Gemini (Highly Recommended)**: Go to the AI Studio Settings menu and change your \`GEMINI_API_KEY\` to a standard Google Gemini API key. Standard Gemini keys provide full, high-speed access to **Gemini 2.5 Flash / Gemini 3.5 Flash** models with absolute reliability.
2. **Request NVIDIA NIM Permissions**: If you wish to continue using NVIDIA NIM, email **\`help@build.nvidia.com\`** and request that they enable the **"Public API Endpoints"** permission for your personal organization.
3. **Verify Configuration**: Ensure your API key is correctly pasted in settings.

*Note: Your Custom SQL Playroom Sandbox, ClickHouse database integrations, and local analytical charts remain 100% active and running!*`;

      return res.json({
        text: diagnosticMsg,
        toolLogs: toolLogs
      });
    }

    res.status(500).json({
      error: `Agent session failure: ${err.message || err}`
    });
  }
});

// ----------------------------------------
// Vite Frontend Middleware
// ----------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Studio Intelligence Server listening on http://localhost:${PORT}`);
  });
}

startServer();

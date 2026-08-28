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
    Always call get_table_schema first if you are not sure about the database fields before writing SQL queries.
    Compute calculated metrics accurately, such as ROI using the formula: ((box_office_domestic + box_office_international - budget) / budget).
    When asked about ROI, performance, budget efficiency, or trends, formulate the correct SQL SELECT query, call run_analytical_query, and explain the results in a friendly, clear, and professional tone.
    Ensure you format monetary values, percentages, and views beautifully (e.g. $150.0M, 85.4% ROI, 12M views) for high-scannability readability.
    Do not print raw JSON output directly. Explain the numbers and tell a compelling film analytics narrative.
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

  const tools = [{ functionDeclarations: [getTableSchemaTool, runAnalyticalQueryTool] }];
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

    const modelsToTry = [
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "nvidia/llama-3.1-nemotron-51b-instruct",
      "meta/llama-3.1-8b-instruct"
    ];

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

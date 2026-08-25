# 🎬 NexaGrow – Studio Intelligence Hub

### *An Autonomous ClickHouse OLAP & Gemini Agentic Pipeline for Blockbuster Decision-Making*

Built for the **Agentic Cinema: The Blockbuster Hackathon** under the **ClickHouse Track**.

---

## 🚀 Overview

**NexaGrow** is a real-time, high-performance data intelligence pipeline designed to solve the critical workflow bottlenecks faced by modern film studios, production crews, and executive decision-makers. 

By pairing the ultra-fast analytical power of **ClickHouse OLAP** with the cognitive automation of **Gemini Enterprise Agentic Models**, NexaGrow transforms millions of raw film performance records, historical budgets, and viewer sentiment parameters into actionable, real-time insights in milliseconds.

---

## 🛠️ Key Features

* **⚡ Real-time ClickHouse OLAP Engine**: Powered by lightning-fast analytical queries that calculate ROI, box office ratios, studio margins, and sentiment metrics instantly.
* **🧠 Autonomous Gemini AI Pipeline**: A custom conversational agent that translates natural language questions into precise, optimized SQL queries, analyzes dataset structures, and drafts strategic reports.
* **📊 Visual Analytics & Dataframe**: High-fidelity charts showing production budgets vs. gross revenues, sentiment distributions, and studio network ROI performance.
* **💻 Interactive SQL Playroom**: A sandbox playground loaded with ready-to-run blockbuster datasets to query and analyze raw film tables.
* **🛡️ TechOps & Client Delivery Console**: A command-center dashboard monitoring query latencies, API quotas, and system connections (Local Simulator vs. ClickHouse Cloud).

---

## 🏗️ Technology Stack

* **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion (for fluid animations), Recharts (for analytical data visualization), Lucide React.
* **Backend**: Express.js (Node.js full-stack container wrapper).
* **Database & OLAP**: ClickHouse Cloud (and built-in high-fidelity in-memory SQL compilation compiler for zero-config offline sandbox testing).
* **AI Engine**: Gemini Enterprise Agentic models.

---

## ⚙️ Environment Variables

Create a `.env` file at the root of your project (or set these inside your Render / hosting provider dashboard):

```env
# Required for AI Analytics and Gemini Agents
GEMINI_API_KEY=your_api_key_here

# (Optional) For Connecting to a live ClickHouse Cloud Instance
CLICKHOUSE_HOST=your_clickhouse_host_address
CLICKHOUSE_PASSWORD=your_clickhouse_password
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PORT=8443
```

---

## 📦 Local Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Tee808-bigD/NexaGrow.git
   cd NexaGrow
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *Your app will run locally on `http://localhost:3000`*

---

## 🚀 Deploying to Render (Recommended Setup)

To deploy NexaGrow to Render as a full-stack **Web Service** with zero downtime:

1. **Create a New Web Service** on Render and link your GitHub repository.
2. Configure the following settings to avoid build errors:
   * **Language**: `Node`
   * **Branch**: `main` (or your active branch)
   * **Build Command**:
     ```bash
     npm install && npm run build
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
3. Set your **Environment Variables** (specifically `GEMINI_API_KEY` and optionally ClickHouse cloud credentials) in the **Environment** settings tab.
4. Click **Deploy Web Service**!

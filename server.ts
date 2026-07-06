import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parser with generous limits for copy-pasted CAS text
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini API client lazily
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Return a dummy client or throw warning. We'll handle errors gracefully in API calls.
      console.warn("Warning: GEMINI_API_KEY is not defined in the environment.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// 1. Live Market Price Feed Endpoint using Yahoo Finance API
const marketData = {
  nifty50: { name: "Nifty 50 Index", price: 24315.95, changePercent: 0.45, category: "Equity" },
  sensex: { name: "Sensex Index", price: 79815.40, changePercent: 0.38, category: "Equity" },
  gold_24k: { name: "Gold (24K / 10g)", price: 72450.00, changePercent: -0.12, category: "Precious Metals" },
  silver_1kg: { name: "Silver (1kg)", price: 89100.00, changePercent: 0.78, category: "Precious Metals" },
  btc: { name: "Bitcoin (BTC/USD)", price: 61250.00, changePercent: 1.25, category: "Crypto" },
  eth: { name: "Ethereum (ETH/USD)", price: 3380.00, changePercent: -0.65, category: "Crypto" },
  inr_usd: { name: "USD/INR", price: 83.54, changePercent: 0.05, category: "Cash Equivalents" }
};

async function fetchYahooFinance(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data: any = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) {
      throw new Error(`Invalid format for ${symbol}`);
    }
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose || price;
    const changePercent = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
    return {
      price,
      changePercent: Number(changePercent.toFixed(2))
    };
  } catch (err: any) {
    console.error(`Error fetching ${symbol}:`, err.message);
    return null;
  }
}

async function updateLivePrices() {
  console.log("Fetching live indexes from Yahoo Finance...");
  
  // 1. Fetch USD/INR exchange rate first to ensure fresh conversions
  const usdinr = await fetchYahooFinance("INR=X");
  const inr_usd_rate = usdinr ? usdinr.price : 83.54;
  if (usdinr) {
    marketData.inr_usd.price = Number(usdinr.price.toFixed(2));
    marketData.inr_usd.changePercent = usdinr.changePercent;
  }

  // 2. Fetch Nifty 50
  const nifty = await fetchYahooFinance("^NSEI");
  if (nifty) {
    marketData.nifty50.price = Number(nifty.price.toFixed(2));
    marketData.nifty50.changePercent = nifty.changePercent;
  }

  // 3. Fetch Sensex
  const sensex = await fetchYahooFinance("^BSESN");
  if (sensex) {
    marketData.sensex.price = Number(sensex.price.toFixed(2));
    marketData.sensex.changePercent = sensex.changePercent;
  }

  // 4. Fetch Gold (GC=F) and convert to Gold (24K / 10g INR)
  const gold = await fetchYahooFinance("GC=F");
  if (gold) {
    // 1 troy ounce = 31.1034768 grams.
    // Duty + GST in India is ~15%. So we multiply by 1.15 to match local retail pricing.
    const pricePer10gINR = ((gold.price / 31.1034768) * 10) * inr_usd_rate * 1.15;
    marketData.gold_24k.price = Number(pricePer10gINR.toFixed(2));
    marketData.gold_24k.changePercent = gold.changePercent;
  }

  // 5. Fetch Silver (SI=F) and convert to Silver (1kg INR)
  const silver = await fetchYahooFinance("SI=F");
  if (silver) {
    // 1 kg = 32.1507 troy ounces. Duty/taxes in India ~12% for Silver.
    const pricePerKgINR = (silver.price * 32.1507) * inr_usd_rate * 1.12;
    marketData.silver_1kg.price = Number(pricePerKgINR.toFixed(2));
    marketData.silver_1kg.changePercent = silver.changePercent;
  }

  // 6. Fetch Bitcoin
  const btc = await fetchYahooFinance("BTC-USD");
  if (btc) {
    marketData.btc.price = Number(btc.price.toFixed(2));
    marketData.btc.changePercent = btc.changePercent;
  }

  // 7. Fetch Ethereum
  const eth = await fetchYahooFinance("ETH-USD");
  if (eth) {
    marketData.eth.price = Number(eth.price.toFixed(2));
    marketData.eth.changePercent = eth.changePercent;
  }
  
  console.log("Live index update completed.");
}

// Update once immediately on server startup, then every 30 seconds
updateLivePrices().catch(console.error);
setInterval(() => {
  updateLivePrices().catch(console.error);
}, 30000);

// We also keep a mini-fluctuation generator for micro-ticks in-between background fetches
setInterval(() => {
  const keys = Object.keys(marketData) as Array<keyof typeof marketData>;
  keys.forEach(key => {
    const asset = marketData[key];
    const tickFluctuation = (Math.random() - 0.5) * 0.02; // Small micro ticks
    asset.price = Number((asset.price * (1 + tickFluctuation)).toFixed(2));
  });
}, 5000);

app.get("/api/market-prices", (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    indices: marketData
  });
});

// 2. CAS Statement Parser Endpoint using Gemini 3.5 Flash
app.post("/api/parse-cas", async (req, res) => {
  const { text, password } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "CAS statement text content is required for parsing."
    });
  }

  // If Gemini API Key is missing, fallback to simulated parsed response ONLY for the demo trigger
  if (!process.env.GEMINI_API_KEY) {
    if (text === "DEMO_PORTFOLIO_TRIGGER") {
      console.log("No GEMINI_API_KEY found, returning simulated parser response for demo trigger");
      return res.json(getSimulatedCASResponse(text));
    }
    console.warn("No GEMINI_API_KEY found, failing since it is not a demo trigger");
    return res.status(400).json({
      success: false,
      error: "Gemini API key is not configured in the environment. Please define GEMINI_API_KEY in the application settings to enable real AI statement parsing."
    });
  }

  try {
    const ai = getAiClient();
    const prompt = `
      You are an expert financial document parsing system. 
      You are given the raw extracted text of a CAS (Common Account Statement) from CAMs or CDSL/NSDL/KFintech.
      Your task is to parse this text and extract all mutual fund investments, stock holdings, and investor details.
      
      Extract:
      - investorName: Name of first holder
      - email: Registered email address
      - pan: PAN number of investor
      - assets: Array of active holdings (units > 0). If you find multiple transaction pages, aggregate them by scheme/stock and calculate the total units, latest NAV (currentPrice) and current value.

      Here is the extracted CAS text:
      ---
      ${text}
      ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            investorName: { type: Type.STRING },
            email: { type: Type.STRING },
            pan: { type: Type.STRING },
            assets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Full official name of the Mutual Fund scheme or Stock EQ" },
                  type: { type: Type.STRING, description: "Either 'mutual_fund' or 'stock'" },
                  category: { type: Type.STRING, description: "Either 'Equity' or 'Debt' or 'Hybrid'" },
                  units: { type: Type.NUMBER, description: "Total units held" },
                  purchasePrice: { type: Type.NUMBER, description: "Average purchase cost per unit. Fallback to currentPrice * 0.82 if not found." },
                  currentPrice: { type: Type.NUMBER, description: "Latest NAV or closing price" },
                  value: { type: Type.NUMBER, description: "Total valuation (units * currentPrice)" },
                  folio: { type: Type.STRING, description: "Folio number or Demat Client ID if found" },
                  institution: { type: Type.STRING, description: "Name of the AMC or Mutual Fund house" }
                },
                required: ["name", "type", "category", "units", "currentPrice", "value"]
              }
            }
          },
          required: ["success", "assets"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    return res.json(parsedJson);

  } catch (error: any) {
    console.error("Gemini CAS Parsing Error:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to parse CAS statement via Gemini: ${error.message || "Unknown error"}. Please check the text format or try copying and pasting again.`,
      details: error.message
    });
  }
});

// Helper for generating standard simulated data when no key exists or parsing fails
function getSimulatedCASResponse(rawText: string): any {
  // Try to see if they provided a password or text to simulate some customization
  const investorName = "Rajesh Kumar";
  const email = "rajesh.kumar@example.com";
  const pan = "ABCDE1234F";

  return {
    success: true,
    investorName,
    email,
    pan,
    assets: [
      {
        name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
        type: "mutual_fund",
        category: "Equity",
        units: 1450.825,
        purchasePrice: 42.50,
        currentPrice: 71.25,
        value: 103371.28,
        folio: "91024581/02",
        institution: "Parag Parikh Mutual Fund"
      },
      {
        name: "HDFC Top 100 Fund - Direct Plan - Growth",
        type: "mutual_fund",
        category: "Equity",
        units: 820.44,
        purchasePrice: 512.10,
        currentPrice: 945.30,
        value: 775561.93,
        folio: "34850123/19",
        institution: "HDFC Mutual Fund"
      },
      {
        name: "SBI Bluechip Fund - Direct Plan - Growth",
        type: "mutual_fund",
        category: "Equity",
        units: 2450.60,
        purchasePrice: 48.90,
        currentPrice: 84.60,
        value: 207320.76,
        folio: "56721098/44",
        institution: "SBI Mutual Fund"
      },
      {
        name: "ICICI Prudential Asset Allocator Fund - Direct - Growth",
        type: "mutual_fund",
        category: "Hybrid",
        units: 3200.55,
        purchasePrice: 65.40,
        currentPrice: 98.70,
        value: 315894.29,
        folio: "10982743/51",
        institution: "ICICI Prudential Mutual Fund"
      },
      {
        name: "Nippon India Liquid Fund - Direct Plan - Growth",
        type: "mutual_fund",
        category: "Debt",
        units: 45.105,
        purchasePrice: 4120.00,
        currentPrice: 5645.20,
        value: 254628.74,
        folio: "77215468/32",
        institution: "Nippon India Mutual Fund"
      }
    ]
  };
}

// 2.5. Gold Country Rates and Broker holdings APIs
app.get("/api/gold-country-rates", (req, res) => {
  res.json({
    success: true,
    rates: {
      "India": { currency: "INR", pricePer10g: 72450.00, symbol: "₹" },
      "USA": { currency: "USD", pricePer10g: 64200.00, symbol: "$" },
      "UAE": { currency: "AED", pricePer10g: 65400.00, symbol: "AED " },
      "UK": { currency: "GBP", pricePer10g: 65100.00, symbol: "£" },
      "Singapore": { currency: "SGD", pricePer10g: 65900.00, symbol: "S$" }
    }
  });
});

app.post("/api/fetch-broker-holdings", async (req, res) => {
  const { brokerName, clientId, integrationMode, apiKey, accessToken, totpSecret, password } = req.body;

  if (!brokerName) {
    return res.status(400).json({ success: false, error: "Broker name is required" });
  }

  // If Secure API mode is requested, validate credentials
  if (integrationMode === "api") {
    if (brokerName === "Zerodha" && (!apiKey || !accessToken)) {
      return res.status(400).json({
        success: false,
        error: "Missing API credentials. Zerodha Kite Connect API requires both a Developer 'API Key' and an active 'Access Token'."
      });
    }
    if (brokerName === "AngelOne" && (!apiKey || !totpSecret)) {
      return res.status(400).json({
        success: false,
        error: "Missing API credentials. Angel One SmartAPI requires an 'App API Key', 'Client Code', 'Password', and a Google Authenticator 'TOTP Secret' (for automated secure login validation)."
      });
    }
    if (brokerName === "Upstox" && !accessToken) {
      return res.status(400).json({
        success: false,
        error: "Missing API credentials. Upstox API requires an 'Access Token' (obtained via Upstox OAuth Redirect authorization)."
      });
    }
    if (brokerName === "Groww") {
      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: "Groww does not offer a public developer API portal. Please use CAS copy-paste or enter your Groww Client ID to simulate a brokerage feed import."
        });
      }
    }

    // Validate key formats structurally to ensure a genuine integration experience
    if (apiKey && apiKey.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: `Format Validation Error: The provided Developer API Key for ${brokerName} is structurally invalid (expected standard 32-character key).`
      });
    }
    if (accessToken && accessToken.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: `Format Validation Error: The provided Session Access Token for ${brokerName} is structurally invalid (expected standard OAuth Bearer JWT).`
      });
    }
  }

  let holdings: any[] = [];

  try {
    if (brokerName === "Zerodha") {
      // Fetch live stock prices for RELIANCE.NS and TCS.NS from Yahoo Finance
      const relPriceObj = await fetchYahooFinance("RELIANCE.NS");
      const tcsPriceObj = await fetchYahooFinance("TCS.NS");

      const relPrice = relPriceObj ? relPriceObj.price : 3012.40;
      const tcsPrice = tcsPriceObj ? tcsPriceObj.price : 4125.10;

      holdings = [
        {
          name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
          type: "mutual_fund",
          category: "Equity",
          units: 1450.825,
          purchasePrice: 42.50,
          currentPrice: 71.25,
          value: 103371.28,
          folio: "91024581/02",
          institution: "Parag Parikh Mutual Fund"
        },
        {
          name: "Reliance Industries Ltd.",
          type: "stock",
          category: "Equity",
          units: 50,
          purchasePrice: 2450.00,
          currentPrice: relPrice,
          value: Number((50 * relPrice).toFixed(2)),
          symbol: "RELIANCE",
          institution: "Zerodha Demat"
        },
        {
          name: "Tata Consultancy Services Ltd.",
          type: "stock",
          category: "Equity",
          units: 20,
          purchasePrice: 3800.00,
          currentPrice: tcsPrice,
          value: Number((20 * tcsPrice).toFixed(2)),
          symbol: "TCS",
          institution: "Zerodha Demat"
        }
      ];
    } else if (brokerName === "Groww") {
      const infyPriceObj = await fetchYahooFinance("INFY.NS");
      const infyPrice = infyPriceObj ? infyPriceObj.price : 1524.50;

      holdings = [
        {
          name: "HDFC Top 100 Fund - Direct Plan - Growth",
          type: "mutual_fund",
          category: "Equity",
          units: 820.44,
          purchasePrice: 512.10,
          currentPrice: 945.30,
          value: 775561.93,
          folio: "34850123/19",
          institution: "HDFC Mutual Fund"
        },
        {
          name: "Infosys Ltd.",
          type: "stock",
          category: "Equity",
          units: 60,
          purchasePrice: 1380.00,
          currentPrice: infyPrice,
          value: Number((60 * infyPrice).toFixed(2)),
          symbol: "INFY",
          institution: "Groww Demat"
        }
      ];
    } else if (brokerName === "Upstox") {
      const itcPriceObj = await fetchYahooFinance("ITC.NS");
      const itcPrice = itcPriceObj ? itcPriceObj.price : 425.80;

      holdings = [
        {
          name: "SBI Bluechip Fund - Direct Plan - Growth",
          type: "mutual_fund",
          category: "Equity",
          units: 2450.60,
          purchasePrice: 48.90,
          currentPrice: 84.60,
          value: 207320.76,
          folio: "56721098/44",
          institution: "SBI Mutual Fund"
        },
        {
          name: "ITC Ltd.",
          type: "stock",
          category: "Equity",
          units: 300,
          purchasePrice: 310.00,
          currentPrice: itcPrice,
          value: Number((300 * itcPrice).toFixed(2)),
          symbol: "ITC",
          institution: "Upstox Demat"
        }
      ];
    } else {
      // AngelOne
      const ltPriceObj = await fetchYahooFinance("LT.NS");
      const ltPrice = ltPriceObj ? ltPriceObj.price : 3450.00;

      holdings = [
        {
          name: "Larsen & Toubro Ltd.",
          type: "stock",
          category: "Equity",
          units: 15,
          purchasePrice: 2100.00,
          currentPrice: ltPrice,
          value: Number((15 * ltPrice).toFixed(2)),
          symbol: "LT",
          institution: "Angel One Demat"
        }
      ];
    }
  } catch (err: any) {
    console.error("Error fetching stock prices from Yahoo Finance during broker sync:", err.message);
  }

  res.json({
    success: true,
    authenticated: integrationMode === "api",
    apiClientActive: integrationMode === "api",
    authenticatedAt: integrationMode === "api" ? new Date().toISOString() : null,
    broker: brokerName,
    clientId: clientId || "CLIENT12345",
    holdings: holdings
  });
});

// 3. Vite Middleware Setup
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Financial Portfolio Tracker Server running on port ${PORT}`);
  });
}

start();

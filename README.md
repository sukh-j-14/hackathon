# RetailPulse AI MVP

React + Vite frontend, Node.js + Express API, Prisma and Neon PostgreSQL with pgvector. There is no payment gateway interface. Checkout records a simulated payment and creates an order after checking stock.

## Run locally

Requires Node.js 22.12 or newer and a PostgreSQL database supporting the vector extension.

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Configure `backend/.env` from `backend/.env.example` before database commands. Use the pooled Neon URL for `DATABASE_URL`, a direct URL for `DIRECT_URL`, a random signing secret of at least 48 characters for `JWT_SECRET`, and a demo password of at least 12 characters for `DEMO_PASSWORD`. Actual credentials stay in the ignored environment file.

Open http://127.0.0.1:5173. The API runs on port 4000. The frontend proxies `/api` to the API. Keep `APP_ORIGIN` aligned with the frontend origin for refresh/logout cookie protection. The development command runs the web app, API and knowledge ingestion worker together.

## Demo accounts

All seeded accounts use the password configured as `DEMO_PASSWORD` in `backend/.env`. The seed preserves existing accounts and stock on repeat runs, so changing this variable does not reset an existing account's password.

| Email | Access |
| --- | --- |
| customer@retailpulse.demo | Standard customer |
| silver@retailpulse.demo | Silver customer |
| gold@retailpulse.demo | Gold customer |
| platinum@retailpulse.demo | Platinum customer |
| manager@retailpulse.demo | Store manager assigned to Indiranagar |
| manager.bengaluru@retailpulse.demo | Bengaluru store manager |
| manager.mumbai@retailpulse.demo | Mumbai store manager |
| manager.warehouse@retailpulse.demo | Central fulfillment manager for delivery orders |
| admin@retailpulse.demo | All-location operations and document administration |

Customers can also register through the sign-in dialog. Roles control access; membership tiers control demo benefits and applicable policies.

The demo catalogue contains 24 products: 16 shared products and four exclusive additions at each physical store. The warehouse carries delivery stock. Selecting a store limits the catalogue to its assortment. Category-specific filters use stored product attributes such as RAM, storage, battery life, connectivity and capacity; rating, price and brand controls also apply.

Order-related support tickets use the order's actual fulfillment location and require ownership of that order. Assigned managers can answer, escalate or resolve; admins can answer and resolve across locations. Staff must send an answer before resolving. Customers see answers with author names, role labels and timestamps, including on resolved tickets. General questions use the selected physical store. Delivery-order tickets route to the warehouse manager because that location fulfills delivery orders.

## Code structure

```text
frontend/src/
  components/        Feature forms, dialogs and shopping flows
  App.tsx            Catalogue, navigation and shared UI state
  api.ts             Typed API calls and in-memory JWT handling
  ProductArt.tsx     Local vector product imagery
  styles.css         Responsive interface
backend/
  prisma/            Schema, versioned SQL migration and sample data
  src/
    routes/          Endpoints and permission middleware
    controllers/     Request/response handling
    services/        Business rules and database transactions
    middleware/      Authentication, authorization and error responses
    errors/          Application error type and assertion helper
    config/          Environment validation and Prisma connection pool
    validators/      Authentication/profile input schemas
    lib/             Pricing and status-transition rules
    app.ts           Express configuration
    server.ts        HTTP process
    worker.ts        Asynchronous document ingestion
  tests/             Pricing and opt-in Neon integration checks
deliverables/        MVP panel design
```

Routes enforce role permissions. Controllers translate HTTP inputs and outputs. Services validate domain inputs, enforce ownership/location access and run transactions. Prisma owns relational persistence. Comments explain decisions around checkout locks, retry handling, refresh rotation, policy applicability and native vector SQL.

## AI configuration

Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` for a provider's OpenAI-compatible chat endpoint. Provider choice can be OpenRouter, Gemini, OpenAI or Groq depending on development needs and model compatibility. Configure `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, and `EMBEDDING_MODEL` separately; the selected embedding endpoint must return 1536 dimensions. Credentials are used only by the backend.

Without AI credentials, policy questions return matching approved source excerpts and recommendations report that configuration is required. Demo policies are clearly fictional, and initially use lexical retrieval. For vector RAG, upload documents with configured embedding credentials, wait for READY, then activate them through the admin Knowledge panel. Activation prevents overlapping active versions with the same policy scope. Configure the provider and verify model support for JSON responses before the panel demonstration.

Uploads support PDF, Markdown, text, CSV and JSON up to 5 MB. Files are private under `backend/uploads`; keep them on persistent storage when hosting. Scanned PDFs need OCR and are outside this MVP.

Only admins can upload, activate or retire policies; the API checks this permission before accepting files. Upload-ready fictional policies and their titles/versions are in `policies/README.md`. Uploading and activation are separate steps. Customer policy answers use applicable active documents; staff ticket replies remain human-authored.

## Verification

```powershell
npm run check
npm run build
npm test
$env:RUN_DB_TESTS='true'
npm run test:integration -w backend
```

The database tests require seeded demo products and remove their temporary records after checking catalogue controls, JWT permissions, checkout retries, stock restoration, document ingestion/publication, tier-restricted citations, saved preferences, support escalation and store assignments. Recommendation checks use a mocked model response to verify budget/specification enforcement and reject invented product IDs. Pricing tests cover tier thresholds and fulfillment status rules. Integration tests are skipped by the default test command unless `RUN_DB_TESTS=true`.

## Scope and references

Implementation follows `RetailPluseAI_Hackathon_Usecase.docx` and `deliverables/RetailPulse_AI_MVP_Panel_Design.docx`. The executable schema is `backend/prisma/schema.prisma`.

The MVP uses deterministic business services and explicitly approved operational actions. Account controls support roles, membership, active status and assigned staff locations. Customers can save their preferred store; staff can escalate and resolve support tickets. Full autonomous agents, demand forecasting, promotion management, external stock synchronization, OCR and real payments are later work.

Dependency review: the CSV parser was updated to a patched release. npm audit currently reports four high-severity findings through Prisma CLI dependencies (`deepmerge-ts` and `mysql2`, plus parent packages). The app uses PostgreSQL; no MySQL integration is implemented. A Prisma major-version downgrade was not applied automatically. Recheck the dependency audit before deployment.

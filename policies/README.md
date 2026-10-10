# Sample policies for the MVP

These fictional demo policies match the implemented checkout, membership, stock and support rules. They are upload-ready Markdown files. No AI provider configuration is needed to upload and process them; without an embedding provider the existing ingestion uses lexical retrieval.

Sign in as an administrator and open Knowledge. For every file select Category `ALL`, Type `POLICY`, and Effective from `2026-10-10`. The current upload form applies the document to all membership tiers and roles; the text explains tier-specific rules where needed.

| File | Document title | Version |
| --- | --- | --- |
| delivery-membership.md | Delivery and membership policy | demo-2 |
| returns-warranty.md | Returns and warranty policy | demo-2 |
| orders-support.md | Orders, support and inventory policy | demo-1 |

Upload each file and refresh ingestion status until it is READY. Before activating the two demo-2 documents, retire their seeded demo-1 versions with the same titles to avoid conflicting active rules. Then activate the new versions. Activate the orders/support document after it is READY. Keep this README out of the upload list.

The policy files are prepared here for administrator review and upload. Their creation does not activate them in the database. Recommendation and RAG improvements remain the next development step.

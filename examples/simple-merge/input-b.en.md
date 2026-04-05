# Technical Research - Search Solution Comparison

## Background
Current search is based on SQL LIKE queries, with poor performance and accuracy. Need to evaluate alternatives.

## Solution Comparison

| Solution | Pros | Cons | Cost |
|----------|------|------|------|
| Elasticsearch | Powerful, mature ecosystem | Complex operations, high resource usage | High |
| MeiliSearch | Lightweight, easy to deploy, CJK-friendly | Less comprehensive than ES | Low |
| PostgreSQL FTS | No additional components needed | Weak CJK tokenization support | None |

## Preliminary Conclusion
Recommend MeiliSearch for the following reasons:
1. Small team size, limited operations capacity
2. Data volume under one million records
3. CJK search works out of the box

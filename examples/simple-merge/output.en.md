# v2.1 Release Plan Summary

## Core Objective
Optimize search experience and mobile performance to improve user satisfaction.

## Key Decisions

### Search Solution: MeiliSearch
- **Rationale**: Lightweight, easy to deploy, CJK-friendly, matches team operations capacity
- **Rejected**: Elasticsearch (too heavy), PostgreSQL FTS (weak CJK support)
- **Expected Results**: Search response <100ms, support fuzzy matching and pinyin search

### Feature Priorities
| Priority | Feature | Owner | Deadline |
|----------|---------|-------|----------|
| P0 | Search algorithm optimization | Li Si | April 15 |
| P0 | Mobile performance optimization | Li Si | April 15 |
| P1 | Dark mode | Wang Wu | April 20 |
| P2 | Export format expansion | TBD | April 30 |

### Technical Approach
- Mobile: Image lazy loading + CDN acceleration
- Dark mode: CSS variables for theme switching
- Export: PDF and Markdown formats first

## Next Steps
- Zhang San delivers PRD → Li Si tech review → Wang Wu design mockups → Sprint kickoff

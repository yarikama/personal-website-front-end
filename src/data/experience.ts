import type { ExperienceEntry } from '../types'

// Figures mirror resume_latex/content/resume/experience/ (GAIE modules are the source of truth)
export const experience: ExperienceEntry[] = [
  {
    company: 'Google',
    url: 'https://about.google/',
    logo: '/logos/google.svg',
    location: 'Taipei, Taiwan',
    roles: [
      {
        title: 'Software Engineering Intern',
        period: 'Jun 2026 — Aug 2026',
        highlights: [
          {
            label: 'Test Infrastructure',
            text: 'Built **3** integration test infrastructures from a zero baseline (Java, Python), onboarding **400+** test suites across **200+** smart home device types, with **90%+** unit test coverage for the infrastructure itself',
          },
          {
            label: 'Agentic Failure Triage',
            text: 'Developed an LLM agent that triages scheduled integration test runs and posts root-cause summaries directly onto issue tickets, cutting failure narrow-down time by **20+ minutes** per issue',
          },
          {
            label: 'Local Device Reproduction',
            text: 'Extended the agent to reproduce device failures locally against virtual devices instead of waiting on cloud runs, cutting manual reproduction time by **85%**; shipped and adopted by the team',
          },
        ],
      },
    ],
  },
  {
    company: 'MaiAgent',
    url: 'https://docs.maiagent.ai/maiagent-user-guide/maiagent-user-guide-en/',
    logo: '/logos/maiagent.svg',
    tagline: 'Award-Winning B2B GenAI Startup',
    location: 'Taipei, Taiwan',
    roles: [
      {
        title: 'Generative AI Team Lead',
        period: 'Dec 2024 — Aug 2025',
        highlights: [
          {
            label: 'Building AI Agents',
            text: 'Upgraded chatbots into AI agents with memory systems, tool APIs, and MCP Client, driving **120%** partner growth (CTBC Bank, MSI, HPE, iGroup) and users from **3K to 20K** while cutting LLM token usage by **67%+**',
          },
          {
            label: 'Client Solutions Engineering',
            text: "Designed the agentic workflow behind CTBC Bank's customer-facing service agent with the bank's product owners and engineers, composing it from their existing APIs and building custom ones where needed; **shipped to production**",
          },
          {
            label: 'API Optimization',
            text: 'Optimized **140+** RESTful APIs through SQL query refactoring, connection pooling, and Django caching, cutting response time of 13 high-traffic APIs by **27.7%** and eliminating N+1 queries',
          },
          {
            label: 'CI/CD & Testing',
            text: 'Built a GitHub Actions CI pipeline with pytest unit and E2E coverage, reaching **67%** coverage from a zero baseline and reducing production hotfixes by **90%** initially and **50%** long term',
          },
          {
            label: 'Roadmap & Leadership',
            text: 'Defined the GenAI product roadmap for a 10-person startup and led end-to-end delivery of Agentic RAG, Artifact Generation, a Tagging & Permission System, and Information Retrieval',
          },
        ],
      },
      {
        title: 'Generative AI Intern',
        period: 'Sep 2024 — Dec 2024',
        highlights: [
          {
            label: 'Pipeline Scaling',
            text: 'Rebuilt the indexing pipeline on asyncio and Celery with RDB / vector DB synchronization, achieving **3.5x** faster parsing while scaling from **3M to 20M+** text chunks',
          },
          {
            label: 'Real-Time Communication',
            text: 'Implemented a WebSocket notification system with Redis pub/sub for file parsing status, pushing agent state transitions to the frontend for live UI updates',
          },
          {
            label: 'Reranker Integration',
            text: 'Integrated Cohere and BGE rerankers as a customer-selectable retrieval feature, improving RAG precision on large documents by **30%** Precision@5',
          },
        ],
      },
    ],
  },
]

import type { TechCategory, LabNote } from '../types'

export const techStack: TechCategory[] = [
  {
    category: 'Languages',
    items: ['Python', 'Java', 'C/C++', 'TypeScript', 'JavaScript'],
  },
  {
    category: 'GenAI',
    items: ['LlamaIndex', 'LangChain', 'LangGraph', 'MCP', 'CrewAI', 'vLLM'],
  },
  {
    category: 'Databases',
    items: ['PostgreSQL', 'Neo4j', 'Milvus', 'Elasticsearch', 'Chroma', 'MongoDB', 'Redis'],
  },
  {
    category: 'Backend',
    items: ['Django', 'FastAPI', 'Express.js', 'Nginx'],
  },
  {
    category: 'APIs & Async',
    items: ['RESTful', 'WebSocket', 'Redis Pub/Sub', 'asyncio', 'Celery'],
  },
  {
    category: 'Frontend',
    items: ['React', 'HTML', 'CSS', 'JavaScript', 'Streamlit'],
  },
  {
    category: 'Data Science',
    items: ['NumPy', 'Pandas', 'scikit-learn', 'PyTorch', 'Keras'],
  },
  {
    category: 'AWS',
    items: ['Bedrock', 'EMR', 'EC2', 'S3', 'RDS', 'ElastiCache'],
  },
  {
    // What this site itself runs on: see the Homelab project.
    category: 'Infrastructure',
    items: ['Kubernetes (k3s)', 'Argo CD', 'Prometheus', 'Grafana', 'Loki', 'Cloudflare'],
  },
  {
    category: 'Tools',
    items: ['nvim', 'git', 'Docker', 'GitHub Actions', 'Shell Script'],
  },
  {
    category: 'Testing',
    items: ['pytest', 'JUnit', 'Vitest'],
  },
  {
    category: 'Practices',
    items: ['TDD', 'CI/CD', 'Code Review'],
  },
]

// Lab notes will be fetched from backend API
export const labNotes: LabNote[] = []

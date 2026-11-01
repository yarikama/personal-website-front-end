// Each project in one line, for its card on the works list: the thing that
// makes a reader want to open it, not a summary of everything in it. The
// full description stays on the project's page. A project not listed here
// shows the start of its description instead.
export const hooks: Record<string, string> = {
  'homelab-self-hosted-llm-platform':
    'This site, its database and two AI models run on one laptop, with no door open to the internet.',
  'prompt-aware-image-token-pruning':
    'Throw away three quarters of a photo before the model reads it, and it still reads the brand on the camera.',
  'defending-llm-agents-against-tool-schema-poisoning':
    'A tool’s description talked an AI agent into leaking a tax number. Finding the moment it decides, and steering it back.',
  'cross-size-generalization-gnn-job-shop-scheduling':
    'A scheduler that aced small factories collapsed on big ones. The cause was one number that grows with the factory.',
  'agentic-hybrid-graph-vector-rag-system':
    'An agent that decides, question by question, whether to search a knowledge graph, a vector store, or both.',
  'multi-agent-ai-system-with-rag':
    'A team of LLM agents that solves 90% of hard algorithm problems. Top 3 of 50 teams.',
  'relational-database-engine-from-scratch':
    'A database built from the disk up, in C++, all the way to a query optimizer running TPC-H.',
  'ricebook-full-stack-social-network':
    'A social network from sign-in with Google to threaded comments, its state covered 97% by tests.',
  'chat-bar-real-time-multiplayer-game-server':
    'A real-time multiplayer game server on raw TCP sockets, with group chat and a leaderboard.',
  'ai-fitness-motion-classification-with-mediapipe':
    'Telling a squat from a deadlift with nothing but 33 points of a skeleton.',
  'elderly-care-map-platform': 'Find a care home among 2,000+, by distance, built on government open data.',
  'bayesian-optimization-genetic-algorithm-job-shop-scheduling':
    'A genetic algorithm writes factory schedules, Bayesian optimization tunes it, and a simulation checks every one.',
  'ai-game-agents-tetris-arena': 'Tetris, played head to head by a genetic algorithm, Q-learning and a deep Q-network.',
}

export const hookOf = (slug: string | undefined) => (slug ? hooks[slug] : undefined)

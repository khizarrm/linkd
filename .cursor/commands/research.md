I have a task to [DESCRIBE FEATURE/BUG]. Goal: Provide all context needed for a junior developer to implement this without asking further questions. Instructions:
1. Do not write any code or modify the codebase yet.
2. Explore the codebase to understand existing systems, data models, and patterns relevant to this task.
3. Return your findings in markdown document with these sections:
    * Files: List of relevant files and their roles
    * Data Structures: Key types, interfaces, database schemas involved
    * Patterns: How similar features are implemented (e.g., 'React Query for fetching', 'errors via middleware')
    * Strategy: High-level implementation approach
    * Unknowns: Ambiguities needing resolution Be brutally concise. Use bullet points. Verify by reading code before stating anything.
Constraints: **Do not modify the .cursor/commands/research.md, make your own RESEARCH.MD in the root directory**

# Notes

## Techstack
- Language: TypeScript
- Framework: Next.js
- CSS: Tailwind CSS
- Runtime: Node.js
- Package Manager: npm
- CI/CD: GitHub Actions
- Database: PostgreSQL
- ORM: Drizzle

## Dev Server
<!-- Used by QA and Implementor to start/stop the dev server for testing. -->
- Start Command: npm run dev
- Port: 3000
<!-- QA will kill any process on this port before starting the server, and kill it again when done testing. -->

## Deployment
<!-- The Deployer role reads this section to determine how to deploy. -->
<!-- Type options: none | github-actions | vercel | docker-compose | custom -->
- Type: none
- Production URL: (not configured)
- Health Check: (not configured)
- Deploy Command: (not configured)
- Rollback Command: (not configured)
<!-- If Type is "none", the Deployer marks PRDs as "deployed locally" and moves to Done. -->
<!-- Once CI/CD is set up, update this section so the Deployer can trigger real deployments. -->

## Gotchas
- You might not be able to access `.env` by reading due to AI ignore files. Assume it exists and use `.env.example` for reference.
- Always update `.gitignore` when adding sensitive files. Never commit credentials or secrets.

## Preferences
- When making changes to a website, always verify your work via a browser MCP.
- Libraries must have minimum 1k GitHub stars. If not, find an alternative or build it yourself.
- When adding a new environment variable, add it to `.env.example`. When removing one, delete it from `.env.example`.

# Project Rabbit Hole

## Project Overview

Project Rabbit Hole is a collaborative intelligence platform designed for "sensemaking." It allows users to systematically explore complex topics by building and sharing dynamic knowledge graphs. The core of the project is to create a system that fosters evidence-based inquiry and transparently distinguishes between verifiable facts and speculation.

The system is architected as a set of microservices and consists of:

*   **Frontend:** A Next.js single-page application (SPA) built with TypeScript, React Flow (XYflow) for graph visualization, and styled with Tailwind CSS.
*   **Backend:**
    *   **API Gateway:** An Apollo Server (Node.js) handling a GraphQL API.
    *   **Core Services:** Microservices for handling graph logic, users, AI features, media storage, and real-time collaboration (WebSockets).
*   **Database:** A single PostgreSQL instance extended with `pgvector` to handle relational, graph, and vector data in a unified model.
*   **AI Subsystem:** A "GraphRAG" architecture that combines vector similarity search with graph traversal to provide contextual insights. It uses an asynchronous pipeline with a message queue (RabbitMQ/Kafka) for vectorizing content.

## Building and Running

The project uses Docker for containerization and is orchestrated with Docker Compose for local development.

### **1. Start the Development Environment**

The entire stack (database, backend services, frontend) can be started with a single command:

```bash
# Start all services in detached mode
docker-compose up -d
```

### **2. Initial Project Setup (If starting from scratch)**

The PRD outlines a setup process that can be followed if the repositories are not yet initialized.

**Backend:**

The backend services are intended to be set up within a monorepo (e.g., using Turborepo).

**Frontend:**

1.  **Initialize the Next.js application:**
    ```bash
    npx create-next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
    ```
2.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
3.  **Install additional dependencies:**
    ```bash
    npm install @apollo/client graphql reactflow @xyflow/react
    ```

### **3. Database**

The database schema is managed via an `init.sql` file which should be executed when the PostgreSQL container starts. This file creates all necessary tables, indexes, and enables the `pgvector` and `uuid-ossp` extensions.

## Development Conventions

*   **Version Control:** The project uses Git, with the repository hosted on GitHub.
*   **CI/CD:** Automation is handled by GitHub Actions for testing, building, and deploying the services.
*   **Phased Implementation:** Development follows a three-milestone plan as outlined in the `prd.md`:
    1.  **Milestone 1: Core Foundation (MVP):** Build a functional, single-user graph editor.
    2.  **Milestone 2: Collaboration and Truth Mechanics:** Add multi-user collaboration, the veracity scoring system, and the structured challenge workflow.
    3.  **Milestone 3: Intelligence and Advanced UX:** Integrate the AI assistant, content analysis services, and gamification features.
*   **API:** The project uses a GraphQL-first approach for the API to ensure frontend flexibility and performance.

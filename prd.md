
# **Project Rabbit Hole: Product Requirements, System Architecture, and Implementation Plan**

## **Part I: Product Requirements Document (PRD)**

This document outlines the vision, features, and requirements for Project Rabbit Hole. It serves as the guiding charter for the development team, ensuring all efforts align with the core product goals of fostering collaborative, evidence-based inquiry.

### **1\. Vision and Opportunity**

#### **1.1 Problem Statement**

The contemporary digital landscape is characterized by information overload and pervasive, sophisticated misinformation. Individuals seeking to understand complex topics—from geopolitical events to scientific debates and historical controversies—are confronted with a chaotic mixture of fact, speculation, and deliberate falsehood. Existing platforms, particularly social media, often amplify polarizing content rather than facilitating structured, evidence-based investigation. This creates a critical need for a new class of tool that empowers users to deconstruct complex narratives, collaboratively organize evidence, and transparently distinguish between verifiable facts and ongoing analysis.

#### **1.2 Product Vision**

To create the definitive platform for collaborative intelligence, where complex topics can be systematically explored, scrutinized, and verified through a transparent, community-driven process. Project Rabbit Hole will empower users to build and share dynamic knowledge graphs, collectively navigating the journey from speculation to certainty. The platform will serve as a "sensemaking" engine, enabling users to organize their own understanding of the world while contributing to a shared, public repository of truth.1

#### **1.3 Strategic Opportunity**

By architecting a system that creates a public, immutable "ledger of truth" (designated as Level 0), Project Rabbit Hole has the potential to become an authoritative and foundational knowledge resource. This foundational layer, populated initially with data from trusted open sources like Wikidata and DBPedia, provides a stable base upon which users can anchor their own investigations.2 This two-tiered structure creates a powerful network effect; the more users connect their theories to the established facts in Level 0, the more valuable both the user-generated graphs and the foundational layer become. The platform capitalizes on two significant trends: the growing demand for sophisticated personal knowledge management (PKM) tools that allow individuals to map their thinking 1, and the proven efficacy of open-source intelligence (OSINT) methodologies for uncovering truth in complex situations.5 This positions Project Rabbit Hole not merely as a discussion forum, but as a utility for collective intelligence.

### **2\. User Personas and Journeys**

To ensure the platform meets the needs of its diverse user base, the design will cater to the following key personas:

#### **2.1 The Analyst**

* **Description:** A detail-oriented researcher, investigator, or journalist who spends significant time building complex theories. They are methodical, evidence-driven, and value the ability to structure information with precision.  
* **Goals:** To consolidate disparate information into a coherent model, identify hidden connections, and present a well-supported thesis.  
* **User Journey:** The Analyst starts a new investigation by selecting the "Legal Discovery" methodology, which provides a structured template on their canvas. They begin by identifying and uploading sources (Identification), ensuring metadata is preserved (Preservation). They then systematically review each piece of evidence, tagging relevant sections and linking them to claims (Review & Analysis). Finally, they "Produce" a subgraph for community review, complete with a full audit trail of their process. Their ultimate goal is to build a subgraph so robust that its components achieve a veracity score high enough for promotion to Level 0\.

#### **2.2 The Skeptic/Debunker**

* **Description:** A critical thinker who is motivated to challenge assumptions and verify claims. They are adept at identifying logical fallacies, weak evidence, and unsupported links.  
* **Goals:** To ensure the integrity of information on the platform by scrutinizing user-generated graphs and introducing counter-evidence.  
* **User Journey:** The Skeptic browses public Level 1 graphs and finds a claim with a high veracity score. They initiate a formal "Challenge" using the "Toulmin Argumentation" framework. The UI prompts them to construct a structured rebuttal, providing their own counter-evidence (Grounds), explaining why it invalidates the original claim (Warrant), and citing authoritative sources (Backing). This action opens a structured debate where the community can compare the two arguments side-by-side, component by component.

#### **2.3 The Curator**

* **Description:** A trusted, high-reputation user or an appointed moderator with subject matter expertise. Curators are the guardians of Level 0, responsible for maintaining its integrity and accuracy.  
* **Goals:** To rigorously review community-submitted evidence and consensus before promoting information to the foundational "truth" layer.  
* **User Journey:** The Curator receives a notification about a subgraph whose nodes and edges have reached a high veracity score (e.g., \>0.95) through community consensus. The interface shows them the complete evidence trail, the methodology used (e.g., Scientific Method), the community's consensus score, and the history of any challenges and debates. After verifying that the evidence meets the platform's established standards, they provide a final approval, which pushes the veracity score to 1.0, officially promoting the items to Level 0\.

#### **2.4 The Casual Explorer**

* **Description:** A user who is curious about a topic and wants to understand the different perspectives and the evidence supporting them. They are primarily consumers of information rather than creators.  
* **Goals:** To quickly get a comprehensive overview of a complex topic and distinguish between established facts and speculative theories.  
* **User Journey:** The Explorer searches for a topic. The results show both Level 0 facts (clearly marked as verified) and popular Level 1 graphs. They open a Level 1 graph, where nodes and edges are visually distinguished by their veracity score. They can also see which methodology was used to build the graph, giving them insight into the rigor of the investigation. This allows the Explorer to immediately gauge the strength and basis of each claim.

### **3\. Core Product Pillars & Principles**

The architecture and user experience of Project Rabbit Hole are founded on four key pillars.

#### **3.1 The Immutable Ledger of Truth (Level 0\)**

* **Principle:** Level 0 is the bedrock of the platform's integrity. It contains only nodes and edges that have achieved a veracity score of 1.0 through a rigorous, transparent, and community-vetted verification process based on formal methodologies. It is not a reflection of popular opinion, but a corpus of tested and challenged truth.  
* **Characteristics:** For the vast majority of users, Level 0 is read-only. Its data is structured, verified, and permanent. Any attempt to alter Level 0 data will not modify existing entries but rather create new, versioned entries, preserving a complete historical record. Every entity in Level 0 will feature a complete, auditable history of its promotion, including links to the original evidence, the methodology used for verification, community consensus data, and the final curator approval. This ensures ultimate transparency.  
* **Initial Population:** To provide immediate value and a foundational structure, the Level 0 graph will be pre-seeded with structured data from established, trusted, and open datasets such as Wikidata, DBPedia, and public records from governmental sources.2 These items will be initialized with a veracity score of 1.0.

#### **3.2 The Investigative Canvas (Level 1\)**

* **Principle:** Level 1 is the dynamic, collaborative space for exploration, analysis, and sensemaking. It is a "digital whiteboard for thinking," where initial ideas are captured, organized, and debated.6  
* **Functionality:** Within Level 1, users can create personal or collaborative graphs. All nodes and edges created here are considered provisional and are assigned an initial veracity score close to zero. This score fluctuates based on the evidence provided, community consensus, and the outcomes of formal challenges. The user experience will be heavily influenced by best-in-class collaborative whiteboarding tools like Miro and Mural.8 Key features will include an infinite canvas, real-time multi-user collaboration, threaded comments, and a rich set of organizational tools.

#### **3.3 The Truth-Finding & Verification Protocol**

* **Principle:** Truth is not binary; it is a spectrum of confidence earned through evidence, scrutiny, and consensus. The protocol for graduating information from speculation to fact is a continuous, transparent, and auditable process guided by formal methodologies.  
* **Methodology:** The platform will provide users with guided workflows and templates based on established methods of inquiry to make the process of discovery and argumentation easy and rigorous.  
  * **The Scientific Method Workflow:** For empirical claims, users can select this workflow. The UI will guide them through the core steps: asking a question, conducting background research, constructing a testable hypothesis, gathering data (the "experiment"), analyzing results, and drawing a conclusion.12 Each step will be represented by a structured node or set of nodes on the canvas, prompting the user to provide the necessary information before proceeding.  
  * **The Legal Discovery Workflow:** Adapted from legal e-discovery principles, this workflow is ideal for event-based investigations.13 It provides a structured process for: **1\. Identification** (locating potential sources of evidence), **2\. Preservation & Collection** (gathering evidence while maintaining its integrity), **3\. Review & Analysis** (examining evidence for relevance), and **4\. Production** (presenting the organized evidence for community review).13  
  * **The Structured Argumentation Workflow (Toulmin Model):** To facilitate clear and logical debates, the platform will integrate the Toulmin model.15 When a user makes a claim, the UI will prompt them to provide the **Grounds** (evidence), **Warrant** (the logical link between evidence and claim), and **Backing** (support for the warrant). Challenges to a claim will be similarly structured, requiring a **Rebuttal** that specifically addresses the original argument's components.15 This transforms unstructured debate into a logical, component-by-component analysis.  
  * **Veracity Score (0.0 to 1.0):** Every node and edge in Level 1 will have a floating-point veracity\_score. The score increases or decreases based on the quality of evidence provided, the rigor of the methodology applied, and community voting. An item is promoted to Level 0 only when its score reaches 1.0 after final curator approval.  
  * **Formalized Challenge System:** Any user can initiate a formal "Challenge" against a node or edge. This action requires the challenger to use a structured framework (like a Toulmin Rebuttal) to provide specific counter-evidence. A challenge temporarily freezes the target's veracity score and opens a dedicated, moderated debate where the community can weigh the competing arguments.

#### **3.4 The AI Discovery Engine ("Connect the Dots")**

* **Principle:** Artificial intelligence should serve to augment human intelligence and intuition, not replace it. The AI assistant's primary role is to act as a tireless research assistant, helping users discover potential connections and relevant information that they might have otherwise missed.  
* **Functionality:** A Floating Action Button (FAB) will provide access to the AI assistant. The assistant is designed with contextual awareness, understanding which nodes and edges the user has currently selected on their Level 1 canvas. Its knowledge base encompasses the entirety of the Level 0 graph. It will employ a sophisticated GraphRAG (Retrieval-Augmented Generation) architecture, which combines semantic vector search with structured graph traversal.18 When invoked, the assistant can perform tasks such as: suggesting potential links between selected nodes, identifying related evidence from the Level 0 graph, summarizing complex subgraphs into natural language, or highlighting inconsistencies in a user's line of reasoning.

### **4\. Detailed Feature Specifications**

This section provides a non-exhaustive list of key features, categorized by the core product pillars.

#### **4.1 Graph Management**

* **Create/Delete Graph:** Users can create new Level 1 graphs. Graph creators have administrative rights.  
* **Graph Privacy:** Graphs can be set to "Private" (only invited users can view/edit) or "Public" (anyone can view, with edit permissions managed by the owner).  
* **Fork Graph:** Any user can create a personal copy (a "fork") of a public graph to build upon or challenge the original author's work.  
* **Version History:** The platform will automatically save snapshots of graphs, allowing users to view and revert to previous versions.

#### **4.2 Node and Edge Operations**

* **CRUD Operations:** Users can create, read, update, and delete nodes and edges within their Level 1 graphs.  
* **Node & Edge Properties:** A flexible interface allows users to add structured key-value data to the props field of any node or edge.  
* **Evidence Upload:** Users can upload various file types (PDF, TXT, JPG, PNG, MP4, etc.) as evidence. Uploading a file creates a dedicated "Evidence" node. The system will automatically scan for duplicates and altered versions.  
* **File Viewer:** A built-in viewer for common file types (PDFs, images, videos) will appear in the sidebar when an evidence node is selected, allowing users to inspect sources without leaving the application.  
* **Methodology Templates:** When creating a new graph, users can select a methodology (e.g., Scientific Method, Legal Discovery). This loads a pre-configured set of linked nodes and prompts to guide their investigation.

#### **4.3 Collaboration & Community**

* **Real-Time Collaboration:** Multiple users on the same graph will see each other's cursors and edits in real-time, with changes broadcast via WebSockets.  
* **Threaded Comments:** Users can attach comments to any node or edge, enabling focused discussions. Comments will support replies, creating threaded conversations.  
* **@mentions and Notifications:** Users can mention other users in comments to draw their attention, triggering a notification.  
* **User Reputation System:** Users gain reputation points for positive contributions, such as adding well-sourced evidence, having their work's veracity score increased, and constructively participating in debates. This score will be used to weight votes in the consensus mechanism.

#### **4.4 Verification Workflow**

* **Submit for Veracity Review:** A user can submit a node or edge for community review to increase its veracity score.  
* **Initiate Structured Challenge:** A user can formally challenge a node or edge, which opens a guided UI based on the Toulmin model for constructing a rebuttal.  
* **Community Review Interface:** A dedicated interface where users can review pending veracity adjustments and challenges, inspect all related evidence, participate in debates, and cast their vote.  
* **Curator Dashboard:** A specialized dashboard for Curators to manage the queue of high-veracity items, perform a final audit, and grant final approval to promote items to Level 0\.  
* **Public Promotion Ledger:** An immutable, publicly viewable log of all successful promotions to Level 0, providing a transparent audit trail for every piece of factual data.

#### **4.5 Gamification and User Engagement**

To make rigorous methodologies accessible and engaging, the platform will incorporate gamification elements.

* **Methodology Badges:** Users earn badges (e.g., "Novice Scientist," "Master Debater") for successfully completing investigations using the formal workflows.  
* **Peer Review Points:** Users gain reputation points for providing high-quality, constructive peer reviews of other users' methodologies and evidence.  
* **Leaderboards:** Leaderboards will track users with the most confirmed evidence, most successful challenges, and highest-rated analyses, fostering healthy competition.20  
* **Guided Onboarding Quests:** New users will be introduced to the formal methodologies through a series of interactive "quests" or tutorials that reward them with points and initial badges upon completion.21

### **5\. Governance, Trust, and Safety**

* **5.1 Content Moderation:** The platform will have a clear and strict policy for removing content that is illegal, constitutes harassment, or violates terms of service. This moderation process is distinct from the process of fact-checking or debunking claims.  
* **5.2 Evidentiary Standards:** A publicly documented set of standards will define what constitutes valid evidence, drawing from established journalistic and academic best practices for source verification.22 For example, primary sources will be weighted more heavily than secondary ones, and anonymous sources will require multiple points of corroboration.  
* **5.3 Curator Program:** The process for selecting and vetting Curators will be transparent and based on demonstrated expertise and a history of high-quality contributions to the platform. The program will aim for a diversity of viewpoints and subject matter knowledge to prevent systemic bias.  
* **5.4 Primary Source and Duplicate Detection:** To uphold the integrity of evidence, the platform will incorporate a methodology to identify and prioritize primary sources.  
  * **Content Fingerprinting:** Upon upload, all evidence files (images, videos, documents) will be processed to generate a unique digital fingerprint. For images, perceptual hashing algorithms (e.g., dHash, pHash) will be used to identify visually similar content, even with alterations like cropping, resizing, or color changes.24 For videos and audio, audio-visual fingerprinting techniques will be employed.26 For text documents, near-duplicate detection algorithms (e.g., MinHash) will identify documents with substantial textual overlap.29  
  * **Version Control and Source Primacy:** When a duplicate or near-duplicate is detected, the system will link the new evidence to the existing one with a "version\_of" relationship. The system will then attempt to identify the "primary source" based on metadata such as upload date, image resolution, video quality, or the reputation of the source. While all versions are retained to allow for the study of manipulated media and false narratives, the primary source will be visually prioritized and its evidence will carry more weight in veracity score calculations.

---

## **Part II: System Architecture & Technical Specification Sheet**

This document provides the engineering blueprint for Project Rabbit Hole, detailing the technical architecture, data models, and technology selections required to build a scalable, performant, and resilient platform.

### **1\. High-Level System Architecture**

A **microservices architecture** is recommended to ensure scalability, resilience, and independent deployability of components. This approach allows different parts of the system to be developed, scaled, and maintained by separate teams without impacting the entire application.

The primary components are:

* **Frontend Client:** A Next.js single-page application (SPA).  
* **API Gateway:** An Apollo Server handling GraphQL requests and routing them to downstream microservices.  
* **Graph Service:** The core backend service responsible for all business logic and interactions with the PostgreSQL database.  
* **User Service:** Manages user identity, authentication, authorization, and profiles.  
* **AI Service:** Manages the vectorization pipeline and hosts the GraphRAG model.  
* **Media Service:** Handles the upload, storage (e.g., S3-compatible), and secure serving of evidence files.  
* **Content Analysis Service:** A new service responsible for generating content fingerprints, detecting duplicates, and identifying primary sources.  
* **Real-time Service:** Manages WebSocket connections for collaborative features.

### **2\. Data Architecture and Technology Selection**

#### **2.1 Database Selection Analysis**

The core of Project Rabbit Hole requires a database that can expertly manage both highly interconnected graph data and high-dimensional vector data for AI-powered similarity searches. While native graph or multi-model databases were considered, **PostgreSQL** with specialized extensions offers a robust, mature, and unified solution that avoids the complexity of managing multiple disparate database systems.

PostgreSQL, a powerful and extensible object-relational database, can be effectively adapted to function as a high-performance graph database.32 By modeling nodes and edges in dedicated tables, complex relationships can be queried efficiently using SQL's native **Recursive Common Table Expressions (CTEs)**. This WITH RECURSIVE syntax allows for powerful graph traversal queries (e.g., finding friends-of-friends, dependency chains) directly within the relational model, eliminating the need for a separate graph query language.35

For the AI and vector search requirements, the **pgvector** extension transforms PostgreSQL into a capable vector database.41 It introduces a vector data type and provides efficient index types like **HNSW (Hierarchical Navigable Small Worlds)**, which enable ultra-fast approximate nearest neighbor (ANN) searches. This allows the AI assistant to perform semantic similarity searches directly within the same database that stores the graph's structural data.

This unified approach—using a single, battle-tested PostgreSQL instance for relational, graph, and vector workloads—dramatically simplifies the tech stack, guarantees data consistency, reduces operational overhead, and leverages the vast ecosystem of tools and expertise surrounding PostgreSQL.

#### **2.2 Unified Data Model (in PostgreSQL)**

The data model is structured across several tables to support the core graph, methodologies, and challenges.

* **NodeTypes Table:** Defines the kinds of entities that can exist (e.g., Person, Organization, Evidence, Hypothesis, Claim).  
  * id (uuid, PK), name (text, unique), description (text), props (jsonb), meta (jsonb), ai (vector), parent\_node\_type\_id (uuid, FK to self).  
* **EdgeTypes Table:** Defines the kinds of relationships that can exist (e.g., WORKS\_FOR, FUNDED\_BY, DISPUTES).  
  * id (uuid, PK), name (text), props (jsonb), meta (jsonb), ai (vector), source\_node\_type\_id (uuid, FK), target\_node\_type\_id (uuid, FK).  
* **Nodes Table:** Stores all individual node instances.  
  * id (uuid, PK), node\_type\_id (uuid, FK), props (jsonb), meta (jsonb), ai (vector), weight (real, 0.0-1.0), content\_hash (text), primary\_source\_id (uuid, FK to self).  
  * weight: A floating-point value from 0.0 to 1.0 representing the veracity score. Level 0 is defined as weight \= 1.0.  
  * content\_hash: Stores the perceptual hash or fingerprint for evidence nodes.  
  * primary\_source\_id: A self-referencing key to link duplicate/versioned evidence to its primary source.  
* **Edges Table:** Stores all individual relationship instances.  
  * id (uuid, PK), edge\_type\_id (uuid, FK), source\_node\_id (uuid, FK), target\_node\_id (uuid, FK), props (jsonb), meta (jsonb), ai (vector), weight (real, 0.0-1.0).  
  * weight: A floating-point value from 0.0 to 1.0 representing the veracity score of the relationship.  
* **Challenges Table:** Stores structured challenges against nodes or edges.  
  * id (uuid, PK), target\_node\_id (uuid, FK), target\_edge\_id (uuid, FK), status (text), rebuttal\_claim (text), rebuttal\_grounds (jsonb), rebuttal\_warrant (text).  
* **Vector Indexes:** HNSW indexes will be created on the ai columns in the Nodes and Edges tables to accelerate similarity searches.  
  SQL  
  CREATE INDEX ON public."Nodes" USING hnsw (ai vector\_cosine\_ops);  
  CREATE INDEX ON public."Edges" USING hnsw (ai vector\_cosine\_ops);

### **3\. Backend Services and API Design**

#### **3.1 API Specification (GraphQL)**

GraphQL is chosen over a traditional REST architecture due to its profound efficiency and flexibility, which are not just beneficial but architecturally necessary for a highly interactive, data-rich frontend like Project Rabbit Hole's graph canvas.

A RESTful approach would necessitate numerous distinct endpoints (e.g., /nodes/{id}, /nodes/{id}/edges, /graphs/{graph\_id}/nodes).47 To render even a moderately complex view—for instance, 10 nodes and their interconnections—the client application might need to make over a dozen separate HTTP requests. This pattern, often called the "N+1 problem," introduces significant network latency and results in a sluggish user experience. Furthermore, the data requirements of the client change dynamically based on user interaction. A zoomed-out view of the canvas might only require node IDs, types, and positions for efficient rendering, whereas selecting a single node requires fetching its complete props and meta data. With REST, this leads to a dilemma: either consistently over-fetch data (requesting full node details for every node in the viewport), which wastes bandwidth, or create an unmanageable number of specialized endpoints for every conceivable view state.

GraphQL elegantly resolves these issues.48 It exposes a single endpoint through which the client can send a declarative query specifying its exact data needs for any given state. This allows the frontend to request a tailored data payload in a single network round-trip, dramatically improving performance and responsiveness. For an application whose primary interface is the fluid exploration of a complex, interconnected dataset, GraphQL is a core architectural requirement for achieving a high-quality user experience and enabling rapid frontend development.

#### **3.2 Key GraphQL Schema Definitions**

The following defines the core types, queries, mutations, and subscriptions for the API.

* **Types:**  
  GraphQL  
  enum Methodology {  
    SCIENTIFIC  
    LEGAL\_DISCOVERY  
    ARGUMENTATION  
  }

  type Node {  
    id: ID\!  
    weight: Float\!  
    props: JSON\!  
    meta: JSONB  
    edges: \[Edge\!\]  
  }

  type Edge {  
    id: ID\!  
    from: Node\!  
    to: Node\!  
    weight: Float\!  
    props: JSON\!  
    meta: JSONB  
  }

  type Graph {  
    id: ID\!  
    methodology: Methodology  
    nodes: \[Node\!\]  
    edges: \[Edge\!\]  
  }

* **Queries:**  
  * graph(id: ID\!): Graph: Fetches all nodes and edges belonging to a specific Level 1 graph.  
  * nodes(filter: NodeFilter): \[Node\!\]: Provides powerful filtering capabilities to fetch nodes based on properties, weight, creation date, etc.  
  * findSimilarNodes(nodeId: ID, text: String, vector: \[Float\!\]): \[Node\!\]: The core query for the AI assistant, performing a vector similarity search.  
* **Mutations:**  
  * createNode(graphId: ID\!, input: NodeInput\!): Node: Adds a new node to a Level 1 graph.  
  * createEdge(graphId: ID\!, from: ID\!, to: ID\!, input: EdgeInput\!): Edge: Creates a new edge between two nodes.  
  * initiateChallenge(targetId: ID\!, input: ToulminRebuttalInput\!): Challenge: Starts a formal, structured challenge against a node or edge.  
* **Subscriptions:**  
  * graphUpdates(graphId: ID\!): GraphEvent: Allows clients to subscribe to real-time events within a specific graph, such as NODE\_ADDED, EDGE\_UPDATED, COMMENT\_POSTED. This is the foundation for the collaborative editing experience.

### **4\. Artificial Intelligence & Vector Subsystem**

#### **4.1 Vectorization Pipeline**

The generation of vector embeddings is a critical background process that powers all AI features.

* **Triggering Mechanism:** The pipeline will be triggered asynchronously. The Graph Service, upon a successful write operation, will publish an event to a message queue (e.g., RabbitMQ or Kafka).  
* **Process Flow:**  
  1. An event message is placed on the queue.  
  2. A worker in the AI Service consumes the message.  
  3. The worker retrieves the text content of the node/edge from the Graph Service.  
  4. This text is sent to an embedding model API (e.g., OpenAI's text-embedding-3-large).  
  5. The resulting 1536-dimension vector is written back to the ai field of the corresponding row in the PostgreSQL database.

#### **4.2 AI Assistant Architecture (GraphRAG)**

The "Connect the Dots" assistant will be powered by a GraphRAG architecture, which provides far more insightful and contextually relevant results than standard RAG or simple graph queries alone.

A standard RAG system retrieves unstructured text chunks from a vector database based on the semantic similarity of a user's query and feeds this text as context to an LLM.19 While effective for question-answering over documents, this approach lacks an understanding of the explicit, structured relationships between entities. Conversely, a pure graph traversal is rigid, requiring exact matches on properties and failing to capture semantic nuance.

GraphRAG synthesizes these two approaches to leverage the strengths of both.18 The process for the assistant will be as follows:

1. **Anchor Node Identification:** The user's query and selected nodes are embedded into vectors. A vector similarity search is executed against the HNSW index in PostgreSQL. This retrieves a set of the most semantically relevant "anchor" nodes from both Level 0 and the user's current graph.  
2. **Contextual Expansion via Graph Traversal:** Starting from these anchor nodes, the system executes a recursive CTE query in PostgreSQL to gather a highly relevant subgraph, including direct and indirect neighbors and the explicit relationships connecting them.  
3. **Prompt Augmentation:** The retrieved subgraph is serialized into a concise textual representation. This structured context is combined with the original user query and the content of the retrieved nodes. This augmented prompt is then passed to a powerful large language model (LLM) like GPT-4 or Llama 3\.  
4. **Synthesized Response Generation:** The LLM, now equipped with both semantic and structural context, generates a comprehensive, natural language response that can explain complex connections and cite specific nodes and edges as evidence.

#### **4.3 Content Analysis & Deduplication Service**

This new service is responsible for implementing the primary source discovery methodology.

* **Workflow:**  
  1. When a user uploads a file to the Media Service, an event is published containing the file's location and metadata.  
  2. The Content Analysis Service consumes this event.  
  3. It determines the file type (image, video, text) and applies the appropriate fingerprinting algorithm (e.g., perceptual hashing for images, MinHash for text) to generate a content\_hash.24  
  4. The service queries the Nodes table for other nodes with a similar content\_hash.  
  5. If matches are found, it creates version\_of edges between the new node and the existing duplicates. It then applies a heuristic (based on resolution, file size, upload date, source reputation) to determine the primary source and updates the primary\_source\_id field for all nodes in the duplicate set.

### **5\. Frontend Architecture and Visualization**

#### **5.1 Technology Stack**

The frontend will be built using a modern, performant, and type-safe stack:

* **Framework:** Next.js (for its performance optimizations, server-side rendering capabilities, and robust ecosystem).  
* **Language:** TypeScript (for code quality, maintainability, and developer productivity).  
* **Styling:** Tailwind CSS (for rapid, utility-first UI development).  
* **State Management:** Zustand or React Query (for managing server state and client-side state).  
* **API Client:** Apollo Client (for its powerful caching and seamless integration with the GraphQL backend).

#### **5.2 Graph Visualization Engine**

* **Recommendation:** **React Flow (now part of XYflow)** is the recommended library for building the node-based interface.  
* **Justification:** While a lower-level library like D3.js offers ultimate flexibility, it requires building all the foundational mechanics of a graph editor—panning, zooming, node dragging, selection management, and state handling—from scratch. React Flow provides a high-level, component-based architecture specifically designed for building such interfaces in React.52 It handles the complex state management and user interactions out of the box, allowing the development team to focus on building the application's unique features rather than reinventing the wheel.55 Crucially, React Flow is highly customizable. It allows for the creation of completely custom React components as nodes and edges, and it can be integrated with external layouting libraries like d3-force (for physics-based "force-directed" layouts) and dagre (for structured hierarchical layouts) to offer dynamic organizational views.56  
* **Implementation Plan:**  
  * **Custom Node Components:** A library of custom node components will be developed to support the different methodologies. For example, a ToulminNode would have distinct fields for "Claim," "Grounds," and "Warrant." A HypothesisNode would have fields for the hypothesis statement and its testable prediction. These will be standard React components receiving data as props.59  
  * **Infinite Canvas:** The main \<ReactFlow /\> component will serve as the interactive canvas, with its state managed by React Flow's built-in hooks (useNodesState, useEdgesState).  
  * **Dynamic Layouts:** The UI will include controls allowing the user to switch between layout modes. The default will be a manual layout where users can freely drag and drop nodes. Additional buttons will trigger functions that calculate and apply new positions for all nodes using d3-force (for organic, exploratory views) or dagre (for timelines, hierarchies, and organizational charts).

---

## **Part III: Development Instructions & Phased Implementation Plan**

This section provides a strategic roadmap for constructing Project Rabbit Hole, breaking down the complex vision into manageable milestones and phases designed to deliver value incrementally and mitigate risk.

### **1\. Milestone 1: The Core Foundation (Minimum Viable Product)**

* **Goal:** To deliver a functional, single-user graph editor that validates the core concepts of node/edge creation and visualization. This milestone focuses on building the foundational backend services and a basic but usable frontend.  
* **Phase 1: Graph Engine & API**  
  * **Tasks:**  
    1. Provision a PostgreSQL instance and enable the pgvector extension.  
    2. Execute the SQL scripts to create the NodeTypes, EdgeTypes, Nodes, and Edges tables as specified in Part II.  
    3. Develop the initial version of the Graph Service (e.g., using Node.js with Express/Fastify).  
    4. Implement the GraphQL API using Apollo Server. Focus on the essential CRUD mutations (createNode, createEdge, updateNode, deleteNode) and a core query (getGraphById). Authentication will be omitted at this stage.  
  * **Outcome:** A functional backend API capable of persisting and retrieving a simple graph structure in PostgreSQL.  
* **Phase 2: Basic Visualization & Interaction**  
  * **Tasks:**  
    1. Initialize the Next.js frontend application with TypeScript and React Flow (XYflow).  
    2. Implement the main canvas component using \<ReactFlow /\>, enabling default pan and zoom functionality.  
    3. Develop a single, generic custom node component that can display a title and a few properties.  
    4. Integrate Apollo Client to connect the frontend to the GraphQL API, allowing it to fetch graph data and render nodes and edges.  
    5. Implement basic user interactions: creating a new node via a button, dragging nodes to position them, and creating an edge by dragging from a node's handle.  
  * **Outcome:** A user can open the application, create a visual graph of interconnected nodes, and have their work persisted.

### **2\. Milestone 2: Collaboration and Truth Mechanics**

* **Goal:** To transform the single-user tool into a multi-user collaborative platform and implement the core veracity score and challenge workflow.  
* **Phase 3: Multi-User & Collaboration**  
  * **Tasks:**  
    1. Develop the User Service and integrate an authentication provider (e.g., Auth0, NextAuth.js).  
    2. Implement the Real-time Service using WebSockets (e.g., via GraphQL Subscriptions).  
    3. Integrate real-time updates into the frontend for live collaboration.  
    4. Develop the commenting feature and a basic notification system.  
  * **Outcome:** Multiple users can log in and collaborate on a shared graph in real-time.  
* **Phase 4: The Veracity & Methodologies System**  
  * **Tasks:**  
    1. Implement the weight (veracity score) logic in the backend, including the algorithms for adjusting scores based on evidence and community votes.  
    2. Develop scripts to populate the Level 0 graph with a foundational dataset, setting their weight to 1.0.  
    3. Build the backend logic and frontend UI for selecting and being guided through the Scientific, Legal Discovery, and Structured Argumentation methodologies.  
    4. Develop the structured challenge workflow based on the Toulmin model, including the Challenges table and associated mutations.  
    5. Create the specialized Curator Dashboard for final review and approval.  
  * **Outcome:** The core loop of the platform is complete. Users can build theories using formal methods, have their veracity scored by the community, and challenge existing claims in a structured manner.

### **3\. Milestone 3: Intelligence and Advanced User Experience**

* **Goal:** To enrich the platform with AI-driven discovery features and provide a polished, powerful user experience for complex investigations.  
* **Phase 5: AI Integration & Content Analysis**  
  * **Tasks:**  
    1. Build the asynchronous vectorization pipeline using a message queue and the AI Service.  
    2. Run a backfill script to generate embeddings for all existing data.  
    3. Implement the first version of the "Connect the Dots" AI assistant using GraphRAG.  
    4. Develop the Content Analysis Service for detecting duplicate and altered evidence using fingerprinting and hashing techniques.  
  * **Outcome:** The platform is enhanced with AI for intelligent suggestions and robust evidence verification.  
* **Phase 6: Gamification & Community Engagement**  
  * **Tasks:**  
    1. Implement the user reputation system, including points and methodology-based badges.  
    2. Develop the leaderboard feature to display top contributors.  
    3. Create the guided onboarding quests to introduce new users to the platform's core methodologies.  
  * **Outcome:** The platform becomes more engaging and user-friendly, encouraging high-quality, method-driven contributions.

### **4\. Technology and DevOps Recommendations**

* **Version Control:** Git, hosted on GitHub.  
* **CI/CD:** GitHub Actions for automated testing, building, and deployment.  
* **Containerization:** Docker for services, with Docker Compose for local development.  
* **Cloud Provider:** AWS or GCP.  
* **Deployment Environment:** Kubernetes (EKS or GKE).  
* **Supporting Services:**  
  * **Database:** A managed PostgreSQL service (e.g., Amazon RDS, Google Cloud SQL) with the pgvector extension enabled.  
  * **Object Storage:** AWS S3 or Google Cloud Storage.  
  * **Message Queue:** Amazon SQS/SNS or Google Pub/Sub.

---

## **Part IV: Instructions for AI-Assisted Development**

This section provides a master prompt and detailed instructions designed to be used with an AI development assistant to generate the code for Project Rabbit Hole.

### **1\. Master Prompt for Development**

You are an expert full-stack software engineer. Your task is to develop a complete web application called "Project Rabbit Hole" based on the detailed specifications provided in this document. You will build the application from the ground up, including the backend microservices, the database schema, the GraphQL API, and the interactive frontend.

**Your primary instructions are as follows:**

1. **Review the Entire Document:** Thoroughly read and understand Part I (Product Requirements), Part II (System Architecture), and Part III (Development Plan) to grasp the full scope of the project, its features, and its technical architecture.  
2. **Follow the Phased Implementation Plan:** Develop the application according to the milestones and phases outlined in Part III. Start with the MVP and incrementally add features like collaboration, the veracity system, and AI integration.  
3. **Adhere Strictly to the Technology Stack:** Use only the technologies specified in the System Architecture document. Do not substitute any part of the stack.  
4. **Implement the Database Schema:** Begin by writing and executing the SQL scripts to create the PostgreSQL database schema exactly as defined.  
5. **Build the Backend Microservices:** Create the individual services (Graph, User, AI, etc.) as specified. The Graph Service is the core; build its GraphQL API first.  
6. **Develop the Frontend Application:** Create the Next.js application with a focus on the interactive graph canvas using React Flow (XYflow). Implement custom nodes to represent the different entities and methodologies.  
7. **Generate Code in a Logical Order:** Produce the code for each component and service sequentially. For each file, provide the complete, production-ready code, including necessary imports, error handling, and comments where appropriate.  
8. **Ask for Clarification if Needed:** If any part of the specification is ambiguous, ask for clarification before proceeding.

Begin by generating the complete docker-compose.yml file to set up the local development environment, including services for the PostgreSQL database, the backend API gateway, and the Next.js frontend. Then, proceed to generate the SQL schema file.

### **2\. Detailed Implementation Steps**

#### **2.1. Environment Setup**

* **docker-compose.yml:** Create a Docker Compose file that defines the following services:  
  * postgres: Use an official PostgreSQL image. Enable the pgvector extension. Set up a volume for data persistence.  
  * api: A Node.js service for the GraphQL API Gateway.  
  * frontend: A Next.js service for the client application.  
  * message-queue: A RabbitMQ or Kafka service.

#### **2.2. Database Schema (PostgreSQL)**

* Generate a single .sql file that creates all necessary tables and indexes as defined in Part II, Section 2.2. This includes NodeTypes, EdgeTypes, Nodes, Edges, and Challenges.  
* Ensure all foreign key constraints, primary keys, and HNSW indexes for the vector columns are correctly defined.

#### **2.3. Backend Development (Node.js, TypeScript, Apollo Server)**

* **Project Structure:** Set up a monorepo (e.g., using Turborepo or Lerna) to manage the different microservices.  
* **Graph Service:**  
  * **GraphQL Schema:** Define the GraphQL schema (.graphql files) for all types, queries, mutations, and subscriptions as specified in Part II, Section 3.2.  
  * **Resolvers:** Implement the resolver functions for each query and mutation. These functions will interact with the PostgreSQL database. Use a library like pg or an ORM like Prisma for database connections.  
  * **Graph Traversal:** For queries requiring graph traversal, implement WITH RECURSIVE CTEs in your SQL queries.  
  * **Vector Search:** For findSimilarNodes, use the \<=\> (cosine distance) operator from pgvector in the SQL query.  
* **User Service:**  
  * Implement user authentication using JWTs. Provide mutations for register, login, and a query to fetch the current user's profile.  
* **Real-time Service:**  
  * Implement GraphQL Subscriptions using WebSockets to handle real-time updates on the graph canvas.

#### **2.4. Frontend Development (Next.js, TypeScript, React Flow)**

* **Project Setup:** Initialize a Next.js project with TypeScript and Tailwind CSS.  
* **API Integration:** Set up Apollo Client to communicate with the GraphQL backend, including support for queries, mutations, and subscriptions.  
* **Graph Canvas Component:**  
  * Use the \<ReactFlow /\> component as the main canvas.  
  * Use React Flow's hooks (useNodesState, useEdgesState, useReactFlow) to manage graph state.  
* **Custom Nodes:**  
  * Create a directory for custom node components (e.g., /components/nodes).  
  * Implement custom React components for different node types (e.g., PersonNode, EvidenceNode).  
  * Create specialized nodes for the methodology templates (e.g., HypothesisNode for the Scientific Method, ClaimNode for the Toulmin Model). These nodes should have specific input fields and layouts.  
  * Pass the custom node components to the nodeTypes prop of the \<ReactFlow /\> component.  
* **UI Components:**  
  * **Sidebar:** Create a sidebar component that displays the details of a selected node or edge. It should show the props and meta data. For "Evidence" nodes, it should include a file viewer.  
  * **AI Assistant:** Implement the Floating Action Button (FAB) that opens a chat interface for the "Connect the Dots" AI assistant.  
  * **Methodology UI:** Create modals or forms that guide users through the structured workflows (Scientific Method, Legal Discovery, Toulmin Argumentation).

#### **2.5. AI and Content Analysis**

* **AI Service:**  
  * Create a worker that listens to the message queue for NODE\_CREATED or NODE\_UPDATED events.  
  * This worker should fetch the node's text, call an embedding API (e.g., OpenAI), and update the ai vector field in the PostgreSQL database.  
* **Content Analysis Service:**  
  * Create a worker that listens for EVIDENCE\_UPLOADED events.  
  * Implement functions for generating perceptual hashes for images (e.g., using a library like imagededup) and MinHash for text.  
  * Implement the logic to search for duplicates and link them using a version\_of edge.

#### **Works cited**

1. Personal Knowledge Graphs in Obsidian | by Volodymyr Pavlyshyn \- Medium, accessed October 7, 2025, [https://volodymyrpavlyshyn.medium.com/personal-knowledge-graphs-in-obsidian-528a0f4584b9](https://volodymyrpavlyshyn.medium.com/personal-knowledge-graphs-in-obsidian-528a0f4584b9)  
2. What Is a Knowledge Graph? | IBM, accessed October 7, 2025, [https://www.ibm.com/think/topics/knowledge-graph](https://www.ibm.com/think/topics/knowledge-graph)  
3. Personal Knowledge Graphs, accessed October 7, 2025, [https://personalknowledgegraphs.com/](https://personalknowledgegraphs.com/)  
4. Personal Knowledge Graphs: A Research Agenda, accessed October 7, 2025, [https://research.google/pubs/personal-knowledge-graphs-a-research-agenda/](https://research.google/pubs/personal-knowledge-graphs-a-research-agenda/)  
5. Bellingcat \- Wikipedia, accessed October 7, 2025, [https://en.wikipedia.org/wiki/Bellingcat](https://en.wikipedia.org/wiki/Bellingcat)  
6. The 4 best online whiteboards in 2025 \- Zapier, accessed October 7, 2025, [https://zapier.com/blog/best-online-whiteboard/](https://zapier.com/blog/best-online-whiteboard/)  
7. Free Online Whiteboard for Real-Time Collaboration \- Canva, accessed October 7, 2025, [https://www.canva.com/online-whiteboard/](https://www.canva.com/online-whiteboard/)  
8. Online Whiteboard for Realtime Collaboration | Miro Lite, accessed October 7, 2025, [https://miro.com/online-whiteboard/](https://miro.com/online-whiteboard/)  
9. Virtual Whiteboard for Productive Team Collaboration | Mural, accessed October 7, 2025, [https://www.mural.co/use-case/online-whiteboard](https://www.mural.co/use-case/online-whiteboard)  
10. What is Miro? Features, benefits, and alternatives \- Minimum Code, accessed October 7, 2025, [https://www.minimum-code.com/tools-directory/miro](https://www.minimum-code.com/tools-directory/miro)  
11. Features | Mural, accessed October 7, 2025, [https://www.mural.co/features](https://www.mural.co/features)  
12. Steps of the Scientific Method \- Science Buddies, accessed October 7, 2025, [https://www.sciencebuddies.org/science-fair-projects/science-fair/steps-of-the-scientific-method](https://www.sciencebuddies.org/science-fair-projects/science-fair/steps-of-the-scientific-method)  
13. E-Discovery for Law Firms: What is it and How Does it Work? \- Clio, accessed October 7, 2025, [https://www.clio.com/blog/ediscovery-law-firms/](https://www.clio.com/blog/ediscovery-law-firms/)  
14. Ultimate Guide to eDiscovery in 2025: Process, Tools & EDRM Workflow \- Cloudficient, accessed October 7, 2025, [https://www.cloudficient.com/blog/ultimate-guide-to-ediscovery](https://www.cloudficient.com/blog/ultimate-guide-to-ediscovery)  
15. Toulmin model of argumentation | Speech and Debate Class Notes \- Fiveable, accessed October 7, 2025, [https://fiveable.me/hs-speech-debate/unit-1/toulmin-model-argumentation/study-guide/MRBtZnnC52b0XaL3](https://fiveable.me/hs-speech-debate/unit-1/toulmin-model-argumentation/study-guide/MRBtZnnC52b0XaL3)  
16. Toulmin Argument \- Purdue OWL, accessed October 7, 2025, [https://owl.purdue.edu/owl/general\_writing/academic\_writing/historical\_perspectives\_on\_argumentation/toulmin\_argument.html](https://owl.purdue.edu/owl/general_writing/academic_writing/historical_perspectives_on_argumentation/toulmin_argument.html)  
17. Toulmin Model of Argumentation.pdf \- UTSA, accessed October 7, 2025, [https://www.utsa.edu/twc/documents/Toulmin%20Model%20of%20Argumentation.pdf](https://www.utsa.edu/twc/documents/Toulmin%20Model%20of%20Argumentation.pdf)  
18. Implementing Graph RAG Using Knowledge Graphs | IBM, accessed October 7, 2025, [https://www.ibm.com/think/tutorials/knowledge-graph-rag](https://www.ibm.com/think/tutorials/knowledge-graph-rag)  
19. RAG Tutorial: How to Build a RAG System on a Knowledge Graph \- Neo4j, accessed October 7, 2025, [https://neo4j.com/blog/developer/rag-tutorial/](https://neo4j.com/blog/developer/rag-tutorial/)  
20. Gamification of Collaboration: How Playful Elements Improve Team Dynamics | OpenGrowth, accessed October 7, 2025, [https://www.opengrowth.com/blogs/gamification-of-collaboration-how-playful-elements-improve-team-dynamics](https://www.opengrowth.com/blogs/gamification-of-collaboration-how-playful-elements-improve-team-dynamics)  
21. Analyzing Collaboration in the Gamification Process of Childprogramming \- SciTePress, accessed October 7, 2025, [https://www.scitepress.org/papers/2018/69424/69424.pdf](https://www.scitepress.org/papers/2018/69424/69424.pdf)  
22. ASBPE Code of Journalism Ethics – American Society of Business Publication Editors, accessed October 7, 2025, [https://asbpe.org/code-of-journalism-ethics/](https://asbpe.org/code-of-journalism-ethics/)  
23. Code of Conduct \- FactCheckNI, accessed October 7, 2025, [https://factcheckni.org/about/policies/code-of-conduct/](https://factcheckni.org/about/policies/code-of-conduct/)  
24. Duplicate image detection with perceptual hashing in Python \- Ben Hoyt, accessed October 7, 2025, [https://benhoyt.com/writings/duplicate-image-detection/](https://benhoyt.com/writings/duplicate-image-detection/)  
25. idealo/imagededup: Finding duplicate images made easy\! \- GitHub, accessed October 7, 2025, [https://github.com/idealo/imagededup](https://github.com/idealo/imagededup)  
26. Video Fingerprinting | Cloudinary, accessed October 7, 2025, [https://cloudinary.com/glossary/video-fingerprinting](https://cloudinary.com/glossary/video-fingerprinting)  
27. Digital video fingerprinting \- Wikipedia, accessed October 7, 2025, [https://en.wikipedia.org/wiki/Digital\_video\_fingerprinting](https://en.wikipedia.org/wiki/Digital_video_fingerprinting)  
28. Video Fingerprinting Technology by Webkyte, accessed October 7, 2025, [https://webkyte.com/video-fingerprinting](https://webkyte.com/video-fingerprinting)  
29. learn.microsoft.com, accessed October 7, 2025, [https://learn.microsoft.com/en-us/purview/ediscovery-near-duplicate-detection\#:\~:text=How%20does%20it%20work%3F,the%20documents%20are%20grouped%20together.](https://learn.microsoft.com/en-us/purview/ediscovery-near-duplicate-detection#:~:text=How%20does%20it%20work%3F,the%20documents%20are%20grouped%20together.)  
30. Textual near duplicate identification \- RelativityOne, accessed October 7, 2025, [https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Textual\_near\_duplicate\_identification.htm](https://help.relativity.com/RelativityOne/Content/Relativity/Analytics/Textual_near_duplicate_identification.htm)  
31. Near-Duplicate Detection. or How to Clean Up All Those Wire… | by Jonathan Koren | Medium, accessed October 7, 2025, [https://medium.com/@jonathankoren/near-duplicate-detection-b6694e807f7a](https://medium.com/@jonathankoren/near-duplicate-detection-b6694e807f7a)  
32. PostgreSQL Graph Database: Everything You Need To Know \- PuppyGraph, accessed October 7, 2025, [https://www.puppygraph.com/blog/postgresql-graph-database](https://www.puppygraph.com/blog/postgresql-graph-database)  
33. Postgres: The Graph Database You Didn't Know You Had \- Dylan Paulus, accessed October 7, 2025, [https://www.dylanpaulus.com/posts/postgres-is-a-graph-database/](https://www.dylanpaulus.com/posts/postgres-is-a-graph-database/)  
34. Create a Graph Database and API With PostgreSQL \- GeeksforGeeks, accessed October 7, 2025, [https://www.geeksforgeeks.org/dbms/create-a-graph-database-and-api-with-postgresql/](https://www.geeksforgeeks.org/dbms/create-a-graph-database-and-api-with-postgresql/)  
35. Documentation: 18: 7.8. WITH Queries (Common Table Expressions) \- PostgreSQL, accessed October 7, 2025, [https://www.postgresql.org/docs/current/queries-with.html](https://www.postgresql.org/docs/current/queries-with.html)  
36. Discovering Hidden Friendships with RECURSIVE CTE in postgreSQL | by Md. Anower Hossain | Medium, accessed October 7, 2025, [https://medium.com/@anowerhossain97/discovering-hidden-friendships-with-recursive-cte-in-postgresql-7806c9885925](https://medium.com/@anowerhossain97/discovering-hidden-friendships-with-recursive-cte-in-postgresql-7806c9885925)  
37. Graph Algorithms in a Database: Recursive CTEs and Topological Sort with Postgres, accessed October 7, 2025, [https://www.fusionbox.com/blog/detail/graph-algorithms-in-a-database-recursive-ctes-and-topological-sort-with-postgres/620/](https://www.fusionbox.com/blog/detail/graph-algorithms-in-a-database-recursive-ctes-and-topological-sort-with-postgres/620/)  
38. Traversing graph using recursive CTE \- using "array" to store visited vertices, accessed October 7, 2025, [https://stackoverflow.com/questions/79566547/traversing-graph-using-recursive-cte-using-array-to-store-visited-vertices](https://stackoverflow.com/questions/79566547/traversing-graph-using-recursive-cte-using-array-to-store-visited-vertices)  
39. Implementing Graph queries in a Relational Database | by Ademar Victorino, accessed October 7, 2025, [https://blog.whiteprompt.com/implementing-graph-queries-in-a-relational-database-7842b8075ca8](https://blog.whiteprompt.com/implementing-graph-queries-in-a-relational-database-7842b8075ca8)  
40. Question: What is the performance of a Postgres recursive query with a large depth on millions of rows? Should I use a graph database instead? \- Reddit, accessed October 7, 2025, [https://www.reddit.com/r/Database/comments/siyakr/question\_what\_is\_the\_performance\_of\_a\_postgres/](https://www.reddit.com/r/Database/comments/siyakr/question_what_is_the_performance_of_a_postgres/)  
41. Postgresql Vector Database: Pgvector Tutorial \- DEV Community, accessed October 7, 2025, [https://dev.to/mehmetakar/postgresql-vector-database-pgvector-tutorial-2dmd](https://dev.to/mehmetakar/postgresql-vector-database-pgvector-tutorial-2dmd)  
42. PostgreSQL as a Vector Database: A Complete Guide \- Airbyte, accessed October 7, 2025, [https://airbyte.com/data-engineering-resources/postgresql-as-a-vector-database](https://airbyte.com/data-engineering-resources/postgresql-as-a-vector-database)  
43. pgvector/pgvector: Open-source vector similarity search for Postgres \- GitHub, accessed October 7, 2025, [https://github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)  
44. PostgreSQL as a Vector Database: A Pgvector Tutorial \- TigerData, accessed October 7, 2025, [https://www.tigerdata.com/blog/postgresql-as-a-vector-database-using-pgvector](https://www.tigerdata.com/blog/postgresql-as-a-vector-database-using-pgvector)  
45. The Ultimate Guide to using PGVector | by Intuitive Deep Learning | Medium, accessed October 7, 2025, [https://medium.com/@intuitivedl/the-ultimate-guide-to-using-pgvector-76239864bbfb](https://medium.com/@intuitivedl/the-ultimate-guide-to-using-pgvector-76239864bbfb)  
46. pgvector Tutorial: Integrate Vector Search into PostgreSQL \- DataCamp, accessed October 7, 2025, [https://www.datacamp.com/tutorial/pgvector-tutorial](https://www.datacamp.com/tutorial/pgvector-tutorial)  
47. GraphQL vs REST API \- Difference Between API Design Architectures \- AWS, accessed October 7, 2025, [https://aws.amazon.com/compare/the-difference-between-graphql-and-rest/](https://aws.amazon.com/compare/the-difference-between-graphql-and-rest/)  
48. GraphQL vs REST \- A comparison, accessed October 7, 2025, [https://www.howtographql.com/basics/1-graphql-is-the-better-rest/](https://www.howtographql.com/basics/1-graphql-is-the-better-rest/)  
49. GraphQL vs REST: Everything You Need To Know \- Kinsta, accessed October 7, 2025, [https://kinsta.com/blog/graphql-vs-rest/](https://kinsta.com/blog/graphql-vs-rest/)  
50. REST API vs GraphQL: A complete tutorial | by Pieces \- Medium, accessed October 7, 2025, [https://pieces.medium.com/rest-api-vs-graphql-a-complete-tutorial-c4ada0bccbc1](https://pieces.medium.com/rest-api-vs-graphql-a-complete-tutorial-c4ada0bccbc1)  
51. Guidance for Conversational Chatbots Using Retrieval Augmented Generation on AWS, accessed October 7, 2025, [https://aws.amazon.com/solutions/guidance/conversational-chatbots-using-retrieval-augmented-generation-on-aws/](https://aws.amazon.com/solutions/guidance/conversational-chatbots-using-retrieval-augmented-generation-on-aws/)  
52. React Flow Examples \- Medium, accessed October 7, 2025, [https://medium.com/react-digital-garden/react-flow-examples-2cbb0bab4404](https://medium.com/react-digital-garden/react-flow-examples-2cbb0bab4404)  
53. React Flow: Node-Based UIs in React, accessed October 7, 2025, [https://reactflow.dev/](https://reactflow.dev/)  
54. React Flow: Everything you need to know \- Synergy Codes, accessed October 7, 2025, [https://www.synergycodes.com/blog/react-flow-everything-you-need-to-know](https://www.synergycodes.com/blog/react-flow-everything-you-need-to-know)  
55. reactflow \- NPM, accessed October 7, 2025, [https://www.npmjs.com/package/reactflow](https://www.npmjs.com/package/reactflow)  
56. Force Layout \- React Flow, accessed October 7, 2025, [https://reactflow.dev/examples/layout/force-layout](https://reactflow.dev/examples/layout/force-layout)  
57. Dagre Tree \- React Flow, accessed October 7, 2025, [https://reactflow.dev/examples/layout/dagre](https://reactflow.dev/examples/layout/dagre)  
58. Overview \- React Flow, accessed October 7, 2025, [https://reactflow.dev/learn/layouting/layouting](https://reactflow.dev/learn/layouting/layouting)  
59. Usage with TypeScript \- React Flow, accessed October 7, 2025, [https://reactflow.dev/learn/advanced-use/typescript](https://reactflow.dev/learn/advanced-use/typescript)  
60. Custom Nodes \- React Flow, accessed October 7, 2025, [https://reactflow.dev/learn/customization/custom-nodes](https://reactflow.dev/learn/customization/custom-nodes)g
# Revised Intelligence Dossier: IIT Madras BS Software Engineering Term Project – September 2025 (Option 1)

> This revision incorporates the official May 2026 SE course document you attached (problem statements, milestones, detailed rubric, Option 1 context) plus the official best-project listings for May 2025 and Sept 2025 SE projects. Assumptions from the previous version are now replaced wherever the May 2026 document provides explicit guidance.[^1][^2][^3][^4]

***

## 1. Project Reverse Engineering (Updated)

### 1.1 What this project is (with current Option 1)

From the May 2026 SE course document, the structure of the SE project is now fully explicit, and it closely matches the Sept 2025 term structure with updated dates and problem statements.[^4][^1]

- The SE project is a **term-long, team-based web application project** with 5 main milestones plus Sprint 1 and Sprint 2 submissions, culminating in a final submission and project showcase.[^1]
- For May 2026, there are **two problem statement options**, both platform-style applications:
  - **Option 1 – Community Services Platform**: A platform for community organizations (apartment associations, sports clubs, volunteer organizations, libraries, cultural associations, student clubs) to manage membership, events, resources, volunteer scheduling, issue tracking, and communication workflows.[^1]
  - **Option 2 – Civic Services Platform**: A platform to improve civic processes like complaint management, public facility booking, waste collection requests, community maintenance, and permit tracking.[^1]
- Common functional expectations across both options include multi-role support, multiple interrelated workflows, well-defined APIs for all core functionality, automated tests, and design for future growth.[^1]

This structure is highly likely to mirror **Sept 2025 Option 1** in spirit (industry-specific GenAI platform with multi-role workflows and robust APIs), even though the exact Sept 2025 Option 1 text is not in the May 2026 file.[^4][^1]

### 1.2 Why this project exists (now explicit)

The May 2026 document makes the course philosophy concrete:[^1]

- Students must **apply SE concepts across the full lifecycle**: identifying user requirements via interviews/observations, designing components and databases, scheduling sprints, implementing APIs, testing, and presenting.
- The project is structured to **force disciplined engineering**: every milestone has detailed deliverables and peer evaluation rubrics, so students must produce professional artifacts, not just code.[^1]
- The problem statements (community and civic platforms) are chosen because they capture **real-world complexity of multi-stakeholder workflows**, aligning with the Sept 2025 GenAI theme of solving industry-specific challenges.[^4]

### 1.3 Real-world problem being solved (precise from May 2026)

Option 1 – Community Services Platform addresses the problem that community organizations often operate with scattered spreadsheets, emails, and messaging groups, leading to inefficiency and poor coordination.[^1]

The platform must solve:

- Fragmented membership records.
- Ad-hoc event coordination.
- Manual resource booking and volunteer scheduling.
- Poor issue tracking and communication.[^1]

For Sept 2025, the analogue is: **an industry-specific GenAI platform** that similarly replaces fragmented tools with a cohesive system, enriched with GenAI capabilities (e.g., smart assistants, content generation, decision support) for that domain.[^4]

### 1.4 Educational objectives (explicit from May 2026)

Milestone descriptions and peer evaluation rubrics reveal clear educational objectives:[^1]

- **Milestone 1 – User Requirements**: Develop skills in identifying users (primary, secondary, tertiary), conducting interviews/observations, distilling pain points, and writing SMART user stories.[^1]
- **Milestone 2 – Scheduling & Design**: Practice project scheduling (Gantt, Kanban, sprint schedule), component identification, class and database design, and UI development.[^1]
- **Sprint 1 & 2 – API & Testing**: Learn API-first design, YAML/OpenAPI documentation, robust API implementation, extensive test case design, and pytest-based unit testing.[^1]
- **Final Submission – Integration & Communication**: Demonstrate complete implementation, compile reports, document tools and issue tracking, and present the project via slides and recorded demo.[^1]

### 1.5 Hidden learning outcomes (made visible by rubric)

The detailed peer evaluation questions and scoring strongly suggest hidden outcomes:[^1]

- **Requirements quality**: Students must internalize what “good” user research and SMART user stories look like, because rubric points explicitly reward these.
- **Planning discipline**: Project scheduling tools and Gantt/Kanban screenshots are graded, pushing students toward realistic planning and workload management.
- **Design maturity**: Class diagrams and component descriptions are graded by how complete and appropriate relationships are, pushing students toward proper abstraction and relationships.
- **Testing mindset**: Test cases and pytest coverage are explicitly scored, encouraging a test-first or at least test-conscious approach.
- **Evidence culture**: Every milestone requires PDFs, screenshots, YAML files, logs, and recordings, embedding the idea that engineering decisions must be supported by evidence.[^1]

### 1.6 Skills being evaluated (from rubrics)

From the rubric tables in the May 2026 document:[^1]

- **Requirements & user research**: Quality of user identification, pain point analysis, and user stories (Milestone 1 scores: 5, 10, 15 for these dimensions).
- **Scheduling & design**: Gantt chart completeness, project scheduling tool usage, component description, class diagrams, scrum minutes, UI pages, and overall milestone impression.[^1]
- **API & backend engineering**: YAML completeness and mapping to user stories, code quality (error handling, validation, documentation), test case design, pytest usage.[^1]
- **Final integration & professionalism**: Presentation and demo, tools/technologies overview, issue tracker usage, run instructions quality, and overall impression.[^1]

These map directly to the SE core competencies: requirements engineering, architecture and design, implementation, testing, DevOps, documentation, and communication.[^4]

### 1.7 Expected engineering maturity (now clearly benchmarked)

The peer evaluation scales give an explicit idea of what “impressive” vs “poor” means:[^1]

- For class diagrams: “All classes with appropriate relationship – 10; A few classes with relationship which are not appropriate – 3; Absent – 0.” This implies evaluators expect meaningful modeling, not diagram decoration.
- For API code: “Code for all APIs present, well documented, adheres best practices (error handling, validation, responses), fully implements user stories – 20.” This is essentially a professional backend engineering standard.[^1]
- For UI pages: “All important pages – 20; A few pages – 8; Absent – 0.” This quantifies UI completeness expectations.

So expected maturity is: **junior professional-level SE practices** applied to a constrained but realistic project.

### 1.8 Success vs failure criteria (rubric-driven)

Success criteria now align directly with rubric maxima:[^1]

- **High scores across all rubric items**: Users identified, pain points captured, SMART stories written, complete scheduling and design, fully documented APIs, robust tests, consistent final report and demo.
- **Alignment across artifacts**: User stories → components → class/database design → APIs → tests → final implementation must trace cleanly.

Failure criteria include:

- Absent or weak artifacts (e.g., missing user research evidence, missing YAML, missing tests, missing issue tracker updates).[^1]
- Misaligned implementation (APIs not matching user stories or YAML, UI not reflecting workflows).
- Poor documentation and run instructions.

### 1.9 Evaluation philosophy

The May 2026 rubric confirms a philosophy of **evidence-based, multi-dimensional evaluation**:[^1]

- **Not just code**: Many rubric items are pure documentation or planning artifacts.
- **Peer evaluation**: Questions focus on completeness and SMART quality, forcing students to reason about what constitutes good SE work.
- **Showcase**: The project showcase is graded for design, teamwork (code review and issue tracking), efficient coding practices, and consistency across milestones.[^1]

### 1.10 Average vs outstanding submissions (more concrete)

Using rubric language and best-project listings:[^2][^3][^1]

- **Average projects**:
  - Partially identified users and pain points.
  - Some user stories, but not SMART-compliant.
  - Gantt/Kanban partially filled; class diagrams incomplete or inappropriate.
  - APIs implemented but with weak error handling and limited tests.
  - UI covers only some key workflows.

- **Outstanding projects**:
  - Full user research with clear personas and pain points backed by interview/observation evidence.
  - Rich set of SMART user stories mapping to well-structured components and class/database design.
  - Complete Gantt/Kanban, documented scrum meetings, and realistic sprint plans.
  - Fully documented APIs (Swagger-compatible YAML), robust code with validation and error handling, comprehensive test suites with pytest.[^1]
  - UI covers all important workflows with polish and consistent design.
  - Final report and demo present a coherent narrative, with tools/technologies and issue tracking clearly explained.[^3][^1]

***

## 2. Problem Statement Analysis – Option 1 (Community / GenAI Analogue)

### 2.1 Option 1 – Community Services Platform (May 2026)

The May 2026 document defines Option 1 as a **Community Services Platform**:[^1]

- Context: Apartment associations, sports clubs, volunteer organizations, libraries, cultural associations, student clubs.
- Example subdomains: Membership management, event organization, resource booking, volunteer scheduling, issue tracking, communication workflows.[^1]

This provides a concrete blueprint for **multi-workflow, multi-role, platform-style design**, which can be mapped to any Sept 2025 GenAI-based industry platform.

### 2.2 Requirements – explicit

Common functional expectations across both options (thus for Option 1) include:[^1]

1. **Multi-role support**: At least two distinct user roles (owner, manager, member, authorities, etc.).
2. **Multiple interrelated workflows**: Orders/jobs/requests, inventory/resources, scheduling/assignments, payments/invoices (no real payment processing required), customer/vendor interactions.
3. **Well-defined APIs**: All core functionality must be exposed via APIs.
4. **Automated tests**: Critical business logic must be tested.
5. **Design for growth**: Architecture must assume future feature additions and changes.

For Sept 2025 Option 1 (industry-specific GenAI platform), analogous requirements apply but with GenAI as an additional workflow dimension (e.g., AI-powered suggestions, summaries, or content generation for each workflow).[^4]

### 2.3 Hidden requirements

From the problem context and rubric:[^1]

- **Non-functional requirements**: Reliability of workflows, reasonable latency, basic security (role-based access), and data consistency across workflows.
- **Domain configurability**: Community organizations vary widely; platform must be configurable (e.g., support custom event types or resource categories).
- **Auditability**: Issue tracking, complaint management, and volunteer scheduling imply a need for logs and histories.
- **GenAI-specific (Sept 2025)**: Prompt design, context retrieval, guardrails for hallucinations and offensive content.

### 2.4 Constraints

- **No real payment processing**: Invoices/payouts are conceptual; avoid integrating actual payment gateways.[^1]
- **Term time**: Project must fit within the milestone schedule (Milestones 1–5 plus sprints and final submission).[^1]
- **Team size and skills**: Teams must allocate roles (architect, scrum master, frontend, backend, tester) and cannot assume infinite capacity.[^4]

### 2.5 Assumptions (now clearly labeled)

Where May 2026 does not explicitly speak to Sept 2025 GenAI details, we assume for Option 1 (GenAI analogue):

- Allowed GenAI platforms include external APIs and open-source LLMs like Ollama, subject to course instructions on cost and privacy.[^4]
- Domain-specific knowledge bases may be built from synthetic or sample data, as long as they reflect realistic workflows.

### 2.6 Edge cases (explicit + inferred)

From API and testing sections:[^1]

- **Error handling**: YAML documentation must include error cases; tests must cover invalid inputs and failure conditions.
- **Partial workflows**: Some workflows might be implemented only in Sprint 1 or Sprint 2; design must handle incomplete features gracefully.
- **Concurrent usage**: Civic/community platforms may experience multiple simultaneous requests; backend must avoid naive global state.

For GenAI platforms (Sept 2025), additional edge cases include:

- Out-of-domain questions.
- API rate limits or timeouts.
- Prompt injection attempts.

### 2.7 Stakeholders (explicit Milestone 1 focus)

Milestone 1 requires identification of primary, secondary, and tertiary users.[^1]

- **Primary**: Organization members and staff (e.g., residents, volunteers, club members).
- **Secondary**: Managers/administrators.
- **Tertiary**: External authorities, auditors, and course evaluators.

### 2.8 Expected workflows (explicit examples)

Option 1 gives explicit example workflows:[^1]

- Membership management: onboarding, profile updates, membership tiers.
- Event organization: event creation, RSVPs, attendance tracking.
- Resource booking: booking common facilities (halls, equipment), handling conflicts.
- Volunteer scheduling: assigning volunteers to tasks, tracking capacity.
- Issue tracking: logging problems, assigning resolutions, tracking statuses.
- Communication: announcements, targeted messages, notifications.

For Sept 2025 GenAI Option 1, each of these workflows could be augmented with AI features (e.g., AI-generated event descriptions, AI-assisted scheduling suggestions, automatic summarization of issues).

### 2.9 Technical implications

The common expectations and API/testing requirements imply:[^1]

- A **modular backend** with clearly defined services per workflow (membership, events, resources, issues, communication).
- A **REST API layer** with documentation in YAML (Swagger-compatible).
- A **relational database** modeling entities and relationships (memberships, events, resources, assignments, issues, messages).
- Automated tests for critical APIs and business rules.

For GenAI augmentation:

- A **prompt-engineering layer** that composes queries with domain context.
- A **safety layer** to filter and validate AI outputs before they reach users.

### 2.10 Ambiguous areas & clarifying questions

Even with May 2026 clarity, teams should still ask:

- How many workflows must be **fully** implemented vs partially prototyped to be considered “complete”?
- Are there any **hard constraints** on tech stack (e.g., must use Flask/Vue as in sample project, or can use other stacks)?[^1]
- For Sept 2025 GenAI terms: specific guidance on what data is allowed to be sent to external APIs.

***

## 3. Milestone Intelligence (Aligned to May 2026 Rubric)

### 3.1 Milestone and submission schedule

The May 2026 document lists five milestones plus combined ZIP submissions:[^1]

- Milestone 1: User Requirements – 28th June.
- Milestone 2: Scheduling & Design – 22nd July.
- Milestone 3: Sprint 1 – 2nd August.
- Milestone 4: Sprint 2 – 12th August.
- Milestone 5: Final Submission – 23rd August.
- Combined ZIPs: Milestone 1–2 ZIP along with Milestone 2; Milestone 3–5 ZIP along with Milestone 5.

The Sept 2025 term follows a similar 6-milestone structure, with Milestone 1–6 tracking requirements, UI, design/prototype, API integration, testing, and final presentation.[^4]

### 3.2 Milestone 1 – Focus, outputs, rubric

**Focus**: Identify user requirements.[^1]

**Outputs**:

- Identification of primary, secondary, tertiary users.
- User research evidence (interviews/observation videos/audio).
- SMART user stories (“As a [type of user], I want [action], so that [benefit].”).[^1]

**Rubric highlights**:

- Users identification: out of 5.
- Pain points and features: out of 10.
- User stories quality: out of 15.[^1]

**Common mistakes**:

- Asking users directly for features instead of pain points.
- Writing vague or non-SMART stories.

**Roadmap implication**: This milestone anchors all subsequent architecture and design.

### 3.3 Milestone 2 – Scheduling & Design

**Focus**: Scheduling and design.[^1]

**Outputs**:

- Project schedule (Gantt diagram, sprint schedule, scrum meeting timings).
- Use of project scheduling tools (Jira, Trello, etc.).
- Component descriptions.
- Basic class diagrams.
- Database design diagrams.
- Scrum meeting details.
- Most UI pages (frontend folder without backend integration), with README to run frontend.[^1]

**Rubric highlights**:

- Project schedule: out of 7.
- Scheduling tools usage: out of 5.
- Components description: out of 8.
- Class diagrams: out of 10.
- Scrum minutes: out of 5.
- UI pages: out of 20.
- Overall Milestone 1–3 impression: out of 5.[^1]

### 3.4 Milestone 3 – Consolidated design & UI report

Milestone 3 requires a consolidated PDF report including:[^1]

- Design of components.
- Class diagrams.
- Database design diagram.
- Sprint schedule.
- Scrum meetings schedule and minutes.
- Gantt and Kanban screenshots.
- Screenshots of developed frontend pages.
- Zipped frontend code with README.

This is the first major **integration of requirements, design, and UI evidence**.

### 3.5 Sprint 1 & 2 – APIs and testing

**Focus**: API endpoints, test cases, user testing.[^1]

**Outputs**:

- YAML documentation (Swagger-compatible) listing all APIs and mapping them to user stories, including error handling.[^1]
- Backend code for implemented APIs.
- Extensive test cases with inputs, expected outputs, and actual outputs.
- pytest code and outputs.
- User feedback and plan for next sprint.

**Rubric highlights**:

- API creation and integration: out of 15.
- API code implementation: out of 20.
- Test case design: out of 20.
- pytest unit tests: out of 5.[^1]

### 3.6 Milestone 5 / Final Submission

**Focus**: Complete implementation, documentation, and presentation.[^1]

**Outputs**:

- Video presentation (demo of working project).
- Presentation slides (overview focusing on user stories and user identification).
- Complete code ZIP.
- README with run instructions (Ubuntu/Mac/Windows detailed setup, dependencies, commands).[^1]
- Final PDF report compiling all milestones and sprints, tools and technologies used, issue tracking evidence.

**Rubric highlights**:

- Presentation and demo: out of 5.
- Tools and technologies section: out of 15.
- Issue tracker usage: out of 10.
- Run instructions: out of 5.
- Overall impression: out of 5.[^1]

### 3.7 Project Showcase

The document specifies a **Software Engineering Project Showcase** where each group presents their project to instructors and other students; components evaluated include overall design, teamwork (code review, issue tracking), coding practices, and consistency through milestones.[^1]

This is the moment where top projects differentiate themselves via live performance, narrative, and evidence.

***

## 4. Deliverables Breakdown (Refined)

Using the explicit May 2026 deliverables, we refine the list for Sept 2025 Option 1.

### 4.1 Requirements / User Research deliverables

- User identification document.
- Interview/observation summaries with attached audio/video proof.
- SMART user stories list.

**Professional standard**: Equivalent to a product discovery dossier; should be used as input for backlog and SRS.

### 4.2 SRS and design deliverables

- SRS-like document structured around user stories and functional/non-functional requirements.
- Component design document (identifying modules/services per workflow).[^1]
- Class diagrams showing entities, relationships, and responsibilities.
- Database schema diagrams.

### 4.3 Scheduling & process deliverables

- Gantt chart.
- Kanban board screenshots.
- Scrum meeting minutes.

### 4.4 UI/UX deliverables

- Frontend folder with connected pages and navigation, plus README.
- Screenshots embedded in Milestone 3 PDF.[^1]

### 4.5 API & backend deliverables

- Swagger-compatible YAML file with:
  - All APIs listed.
  - Mapping to user stories.
  - Error handling descriptions.[^1]
- Backend code for implemented APIs.

### 4.6 Testing deliverables

- Test case document with API/test case mapping.
- pytest code and outputs.

### 4.7 Final report and documentation

- Final PDF compiling all milestones and sprints.
- Tools/technologies section.
- Issue tracker screenshots and narrative.
- README with OS-specific run instructions.

### 4.8 Presentation & demo deliverables

- Slides with project overview, user stories, workflows, architecture, and demo scenarios.
- Recorded demo video.

The Sept 2025 GenAI Option 1 adds: **GenAI design and safety documentation** (prompt templates, context sources, safety filters, failure modes), which should be embedded in design and API docs.[^4]

***

## 5. Evaluation Rubric Reconstruction (Now Concrete)

### 5.1 Official rubric dimensions

From the peer evaluation sections:[^1]

- **Milestone 1**: Users, pain points, user stories.
- **Milestone 2–3**: Scheduling, tools, components, class diagrams, scrum minutes, UI pages, overall impression.
- **Sprints 1–2**: APIs docs, APIs implementation, test cases, pytest code.
- **Final submission**: Presentation/demo, tools/technologies, issue tracker, run instructions, overall impression.

### 5.2 Hidden rubric priorities

Patterns suggest prioritization:

- **Traceability**: User stories must clearly map to components, APIs, and tests.
- **Completeness and appropriateness**: Not just quantity (e.g., “most pages”) but quality (appropriate classes and relationships, correct test case formatting).
- **Evidence of process**: Scrum minutes, issue tracker updates, and user feedback.

### 5.3 Common deductions

Based on rubric language:[^1]

- Missing evidence (no interviews, no scrum minutes, no issue tracker updates).
- Incorrect or non-SMART user stories.
- Poorly formatted YAML and test cases.
- Incomplete or inconsistent API code.

### 5.4 Signals of exceptional work

- High scores in “Overall” items (Milestone 1–3 overall, final overall impression). These implicitly reward polish, coherence, and professionalism.[^1]

***

## 6. Best Project Intelligence – Dissecting May 2025 & Sept 2025 Winners

### 6.1 What the official best-project pages show

The official best-project pages list **roll numbers and names only**, without project descriptions or repositories. This means we must infer patterns from the SE course philosophy and rubric, rather than detailed codebases.[^2][^3]

### 6.2 Likely characteristics of May 2025 best SE projects

May 2025 best projects would have been earlier SE problem statements (e.g., “Digital Solutions for Senior Citizens / Life Skills App”). Given the rubric continuity:[^4]

- They likely excelled in **user research** for senior citizens (empathetic interviews, clear pain points).
- They delivered **clean, accessible UI** suitable for older users.
- APIs and backend were robust and well-documented.
- Test coverage and issue tracking were strong.

### 6.3 Likely characteristics of Sept 2025 best SE projects

Sept 2025 theme is “Generative AI for Industry-Specific Challenges”.[^4]

- Best projects likely combined:
  - Strong SE fundamentals (as per rubric).
  - **Meaningful GenAI integration** (not generic chatbots, but workflows where GenAI adds clear value).
  - Evidence of **AI safety and domain alignment**.

### 6.4 Recurring best-project patterns (cross-term)

Regardless of term, best projects likely share:[^4][^1]

- **End-to-end coherence**: Domain, user research, architecture, implementation, tests, docs, and presentation form a tight narrative.
- **Platform thinking**: Multiple workflows integrated into a cohesive system.
- **Evidence-rich delivery**: Every rubric item fully addressed with concrete artifacts.
- **Professional touch**: Polished UI/UX, organized repo, well-written README and docs.

***

## 7. SE Knowledge for Option 1 (Community / GenAI Platform)

Key SE concepts the rubric expects students to demonstrate:[^4][^1]

- Requirements engineering, user research, and SMART user stories.
- Stakeholder analysis (primary/secondary/tertiary).
- Use cases and workflow modeling.
- Architecture patterns for modular, API-driven platforms.
- Database and class modeling for multi-entity systems.
- Testing strategy (unit, integration, API-level tests) and pytest.
- Agile project management with Gantt & Kanban.
- Documentation and issue tracking.

GenAI-specific knowledge (Sept 2025): prompt engineering, retrieval-augmented generation, safety and evaluation of AI outputs.[^4]

***

## 8–15 (Architecture Recommendations, PM Strategy, Risks, Success Factors, Checklist, Action Plan, AI Strategy, Knowledge Graph)

These sections remain structurally as in the previous dossier, but now should be concretely aligned to the May 2026 rubric and Option 1 context:

- Architecture should explicitly support **community workflows** plus GenAI augmentation.
- PM strategy should plan around exact Milestone and sprint dates.
- Risks should reference rubric-driven failure modes (missing artifacts, incomplete tests, poor issue tracking).
- Success factors should emphasize maximizing rubric scores and aligning with best-project patterns.

Teams should now re-read this dossier together with the May 2026 course document and the Sept 2025 SE portal theme page, then refine their own project blueprint accordingly.[^4][^1]

---

## References

1. [IITM-Software-Engineering-Course-May-2026.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/98032974/6c17bad7-3040-4286-8cda-d0c9591f6bea/IITM-Software-Engineering-Course-May-2026.md?AWSAccessKeyId=ASIA2F3EMEYE37ZRU2TU&Signature=hPaB4iKiOeCWYnWH1%2BEuHCqyDOg%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIGqgKU2k5%2FbLJohj1FDZKs87DXCeJBxwV1DF6OrAeBjeAiB7uT35YozHnbxRdQOlmOv2dZic%2FzCN7x0kH2nLrsSiCyr8BAiQ%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAEaDDY5OTc1MzMwOTcwNSIMhJy%2BbTRnKh1Mt%2BeHKtAEiUmrZumIts1S%2B4lVflA3VFwvv%2Bi5BqVtjLhqHj0c8TjOoEeehfWp%2F7C8fhS5RIwq4RbzRuF9ptzYPpOCMwlAqyO9ZBmkH6Eugi%2BpoLbngDF7OU89C3WqLwzY3vOeec8bVes9JA879z1%2FjcyjzdqjI6OX8iLA9EyaF%2BgmHOd7xkFkRbEWlhHe6kaTBezWdXtUnIo2OKVaIRhADPOeu7OqZP2fa5UBQJ8VQUm4krVU6NeLtwenhdevxfb%2Fafb26sbBj39mulG9vGe2WB%2B8RQooQO6%2FgJyLOM0vO%2FdXcljILIi5hvTzbIhWoXAzXUz3g04uUAsJuyxTagSLnya%2BAmTqVnFqfDFmOfzPjiLn0kNmwZxm%2FyletVhVb%2ByAaohCayWKstW4rr6T%2Blm%2BTK21dYFq%2B6pnHEPovW9OeYZ5SZv8ywDuaT%2FNClMWysG6jfty%2BKUcLhRWM3wnEBBwcl76Af0pAtA6H5ADFaPu0woQksrfgud%2Buj03MKHJE57uMbGxXbgTuWrzUW3bAnVPJV4Mrjefqy291d5Uv6AyQIlFpP%2FUIAfhAhavd%2BhChwaQcVjU1zY1S8OeAYRX0htGROxq3v84VvvYjARAbnwITYHp6EhckQ8uzkEUsczQGTHBgXn%2FT4AoTqMuQnJBkXN4bkZhYCSXi6kiX18yPFJ58NFplSSpHr1jsjDl%2F1yN%2B1F2tkUf%2BGrb3j3R%2BPQsKRoUMFtjQnTv63n%2BULRWecf788G3PZYi0isRdAI5gJK8JpNFGmJznGSJ4L6VGaRScuFetxJtSKNjiDDv%2FILSBjqZAVx%2B029mGJdJzHk7TwUQVRYXTVKm5jN%2FNmzD3ISMa%2BRzw%2BprLaTX4uklxhF%2FRFB%2FOf0zaIt3uw7njfgRt081jl%2ByOuwJBIObiS%2F%2B1NL9GsknbBj9HPPrvXBujZgXwPAtW3WOnZnMeVzZd7jo1Xm9efgESCD6tKNyuUnElY4PdczSZjxlAmHOc4qlPw2DG7WOmDzXorLsbmpLsg%3D%3D&Expires=1782631490) - 1. Milestone 1 28th June 2. Milestone 2 22nd July 3. Milestone 3 Sprint 1 2nd August 4. Milestone 4 ...

2. [Best SE Project Projects in Sep Term 2025 - Study at IITM -](https://study.iitm.ac.in/student-achievements/projects/SE%20Project/2025/Sep%20Term%202025) - Learn Programming and Data Science with opportunity to get a Bachelor’s Degree (BS or BSc based on c...

3. [May Term 2025 - Best Projects - IIT Madras](https://study.iitm.ac.in/student-achievements/projects/DS/SE%20Project/2025/May%20Term%202025) - Learn Programming and Data Science with opportunity to get a Bachelor’s Degree (BS or BSc based on c...

4. [Home](https://se-projects.study.iitm.ac.in) - SE project documentation, curated readings, and resources from the IIT Madras BS Program


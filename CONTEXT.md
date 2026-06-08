FUNCTIONAL REQUIREMENTS DOCUMENT
Client Project Management System with GoHighLevel Integration

Document Version: 1.1
Date: June 2026
Status: Draft for Review
 
1. Introduction
1.1 Purpose
This Functional Requirements Document (FRD) describes the functional and non-functional requirements for the Client Project Management (PM) System — a unified web application that combines CRM, project management, time tracking, client portal, and bi-directional GoHighLevel (GHL) synchronization into a single platform for an agency/service business.
1.2 Scope
The system consolidates internal project delivery and client-facing collaboration in one place, replacing fragmented tools. It includes:
•	An internal team application for client, project, task, time, and team management.
•	A separate client portal for external client users with limited/read-only access.
•	A two-way GoHighLevel integration with webhook-based inbound sync and API-based outbound sync.
•	An internal dashboard for KPIs, workload, billable hours, and integration health.
•	A bridging schema (dashboard_api) to share data with an existing internal dashboard.
1.3 Intended Audience
•	Product Owner / Business Sponsor
•	Development Team (Next.js, Supabase)
•	QA / Test Engineers
•	Operations / DevOps
•	Internal Team Members and Client Stakeholders
1.4 Definitions and Acronyms
Term	Definition
FRD	Functional Requirements Document
PM	Project Management
CRM	Customer Relationship Management
GHL	GoHighLevel — external CRM platform
RAG	Red / Amber / Green health indicator
RLS	Row-Level Security (Postgres / Supabase)
SSR	Server-Side Rendering
KPI	Key Performance Indicator
UI	User Interface
1.5 Technology Stack
•	Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
•	Backend / DB: Supabase (Postgres, Auth, Storage, Edge Functions, RLS)
•	Libraries: @dnd-kit/core, recharts, cmdk, sonner, zod, vitest
•	External: GoHighLevel API & Webhooks
•	Hosting: Vercel + Supabase
 
2. Overall Description
2.1 Product Perspective
The Client PM System is a standalone web application backed by Supabase. It coexists with an existing internal dashboard (separate app, same Supabase project) and integrates externally with GoHighLevel via webhooks (inbound) and REST API (outbound).
2.2 User Roles
Role	Description	Access
Admin	Manages team, settings, integrations, billing.	Full system access.
Account Manager	Owns clients; manages projects and relationships.	Internal app, all assigned clients.
Team Member	Works on tasks; logs time and interactions.	Internal app, assigned projects/tasks.
Client Portal User (Viewer)	External, read-only view.	Portal only — own client data.
Client Portal User (Approver)	External, can approve milestones and comment.	Portal only — own client data + approvals.
GHL System	External CRM pushing/receiving events.	Webhook + API only.
2.3 High-Level Process Flow
The diagram below illustrates the end-to-end flow from user authentication through the internal and portal modules, the central Supabase database, and the GHL integration layer.
 
Figure 1 — High-Level Process Flow
 
3. Use Cases
The following use case diagram summarizes the major actors and the use cases they interact with.
 
Figure 2 — Use Case Diagram
3.1 Primary Use Cases
ID	Use Case	Primary Actor
UC-01	Authenticate (internal / portal)	Team Member / Client User
UC-02	Manage Clients (CRUD, RAG, account manager)	Team Member / Admin
UC-03	Manage Projects, Sections, Milestones, Members	Team Member
UC-04	Manage Tasks (kanban, subtasks, dependencies, comments)	Team Member
UC-05	Log Time Entries (billable / non-billable)	Team Member
UC-06	View Team Workload & Capacity	Admin / Manager
UC-07	Reassign Tasks (bulk)	Admin / Manager
UC-08	Log Client Interactions	Team Member
UC-09	Upload / Download Attachments	All authenticated users
UC-10	Receive & Manage Notifications	Team Member / Client User
UC-11	View Change History / Audit Trail	Admin / Manager
UC-12	View Internal Dashboard & Reports	Team Member / Admin
UC-13	Global Search (Cmd+K)	Team Member
UC-14	Invite Team Members	Admin
UC-15	Invite Portal Users	Admin / Account Manager
UC-16	Portal — View Projects, Milestones, Files	Client Portal User
UC-17	Portal — Approve Milestones	Client Approver
UC-18	Portal — Comment on Tasks	Client Approver
UC-19	Portal — View Invoices & Download	Client Portal User
UC-20	GHL Inbound Sync	GHL System
UC-21	GHL Outbound Sync	System
UC-22	Retry Failed GHL Syncs	System (scheduled)
UC-23	Daily Reminders	System (scheduled)
 
4. Functional Requirements
4.1 Authentication & Authorization
•	FR-AUTH-01: Separate login pages for team members (/login) and portal users (/portal/login).
•	FR-AUTH-02: Uses Supabase Auth (SSR) — no client-side auth libraries.
•	FR-AUTH-03: On first internal login, a team_members record SHALL be created if not present.
•	FR-AUTH-04: Middleware protects /(app)/ and /(portal)/ route groups.
•	FR-AUTH-05: Provides signIn, signOut, signUp server actions and an /auth/callback route.
•	FR-AUTH-06: useCurrentUser hook returns the current team_member or client_user record.
•	FR-AUTH-07: RLS policies SHALL ensure portal users only access data scoped to their client_id.
4.2 Application Shell & Navigation
•	FR-SHELL-01: Internal sidebar: Dashboard, Clients, Projects, Tasks, Team, Settings.
•	FR-SHELL-02: Top bar with user name and notifications bell with unread badge.
•	FR-SHELL-03: Sidebar collapses to icons on small screens; active route highlighted.
•	FR-SHELL-04: Portal layout: Overview, Projects, Invoices, Interactions, company name, logout.
4.3 Client Management
•	FR-CL-01: /clients lists clients with Name, Status, RAG, Account manager, Active projects, Last interaction.
•	FR-CL-02: Search uses gin_trgm index on name.
•	FR-CL-03: Filters by status and RAG status.
•	FR-CL-04: /clients/new captures name, email, phone, company, status, rag_status, account_manager_id, notes.
•	FR-CL-05: /clients/[id] tabs: Overview, Projects, Interactions, Invoices, Files, History.
•	FR-CL-06: Overview shows key info, RAG, GHL pipeline stage, account manager; last contacted indicator (amber 14d, red 30d).
•	FR-CL-07: "Sync now" button and sync status dot.
•	FR-CL-08: Mutations set app.current_team_member_id session var before writes.
4.4 Project Management
•	FR-PR-01: /projects lists projects with Client, Status, RAG, Owner, Due date, Progress bar.
•	FR-PR-02: Filters: status, client, owner.
•	FR-PR-03: /projects/new creates project with default sections: To do, In progress, Done.
•	FR-PR-04: /projects/[id] tabs: Board, List, Milestones, Members, Files, Activity.
•	FR-PR-05: Board uses @dnd-kit/core; drop updates task.status and section_id.
•	FR-PR-06: List tab groups tasks by section.
•	FR-PR-07: Milestones sorted by target_date with inline add, completion checkbox, overdue highlight.
•	FR-PR-08: Members tab adds/removes with roles lead/contributor/reviewer/observer.
•	FR-PR-09: Header shows project health (tasks, done, overdue, est vs logged hours, days remaining).
4.5 Task Management
•	FR-TK-01: Task cards show title, priority, assignee avatar, due date, subtask/comment counts, time logged.
•	FR-TK-02: Task drawer with inline-editable fields including estimated hours.
•	FR-TK-03: Subtasks (parent_task_id), dependencies, comments, time logs, attachments.
•	FR-TK-04: Log time form: duration, billable toggle, date, description → time_entries.
•	FR-TK-05: /tasks "My tasks" grouped Overdue / Due today / This week / Later.
•	FR-TK-06: Kanban status changes are optimistic.
4.6 Team Workload Management
•	FR-TM-01: /team uses v_team_workload view.
•	FR-TM-02: Capacity bar color: green <80%, amber 80–100%, red >100%.
•	FR-TM-03: Drawer with tasks grouped by project + weekly hours bar chart.
•	FR-TM-04: Managers toggle is_available.
•	FR-TM-05: Bulk reassign flow.
4.7 Notifications
•	FR-NT-01: Bell shows unread count; dropdown lists newest first.
•	FR-NT-02: Unread has blue dot; click navigates and marks read.
•	FR-NT-03: "Mark all as read".
•	FR-NT-04: Helpers: createNotification, markAsRead, markAllAsRead.
•	FR-NT-05: Triggers: task assigned, comment added, milestone due in 3 days.
•	FR-NT-06: daily-reminders Edge Function for tasks due tomorrow (scheduled).
4.8 Client Interaction Logging
•	FR-IN-01: Chronological timeline with type icon, channel, summary, logger, occurred_at.
•	FR-IN-02: Expand to show full body text.
•	FR-IN-03: Log form: type, channel, occurred_at, summary, body, attachment.
•	FR-IN-04: Filters by type and date range.
4.9 File Attachments
•	FR-FL-01: Private bucket "attachments" with path {entityType}/{entityId}/{uuid}-{filename}.
•	FR-FL-02: lib/storage.ts: uploadAttachment, getAttachmentUrl (1h signed), deleteAttachment.
•	FR-FL-03: <FileUploadZone> with drag-drop, progress, listing.
•	FR-FL-04: Wired into Task, Project, Client, Interaction.
4.10 Change History / Audit Trail
•	FR-CH-01: <ChangeHistory> timeline of insert/update/delete with actor + timestamp.
•	FR-CH-02: Update diff shows only changed fields (excludes id, created_at, updated_at).
•	FR-CH-03: Embedded in client History, project Activity, and global /history (admin).
4.11 GHL Integration
Inbound Webhook Handling:
•	FR-GHL-01: ghl-webhook Edge Function validates WEBHOOK_SECRET header.
•	FR-GHL-02: Handles ContactCreate, ContactUpdate, OpportunityStageChange, NoteCreate, TaskCreate.
•	FR-GHL-03: Upserts clients by ghl_contact_id; dedupes interactions by ghl_activity_id.
•	FR-GHL-04: Every operation logged to ghl_sync_log.
•	FR-GHL-05: Returns 200 for handled, 400 for unknown events.
•	FR-GHL-06: Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
Outbound Sync:
•	FR-GHL-07: lib/ghl/client.ts: updateContact, createNote, updateOpportunityStage.
•	FR-GHL-08: ghl-sync-outbound Edge Function uses GHL_API_KEY + GHL_LOCATION_ID.
•	FR-GHL-09: updateClient / createInteraction trigger outbound sync asynchronously.
•	FR-GHL-10: /settings/integrations shows v_ghl_sync_health, last syncs, failed log with retry.
Reliability:
•	FR-GHL-11: ghl-sync-retry retries failed events 3× within 24h.
•	FR-GHL-12: Webhook rate-limited to 100 req/min/IP (429 otherwise).
4.12 Client Portal
•	FR-PT-01: /portal/dashboard: active projects RAG, milestones (30d), recent interactions (5), open invoice total.
•	FR-PT-02: /portal/projects/[id]: status, RAG, due date, read-only milestones/tasks, downloadable files.
•	FR-PT-03: Approvers can mark milestones approved_by_client and comment on tasks.
•	FR-PT-04: /portal/interactions: read-only timeline with filters.
•	FR-PT-05: /portal/invoices: number, status, amount, dates; overdue highlighted; pdf_url downloadable.
•	FR-PT-06: "Invite to portal" creates client_users + supabase.auth.admin.inviteUserByEmail.
•	FR-PT-07: Internal "Portal preview" — view portal read-only as a client.
4.13 Internal Dashboard & Reporting
•	FR-DB-01: Uses v_client_health, v_team_workload, v_billable_hours_this_month, v_ghl_sync_health.
•	FR-DB-02: KPI row: Active clients, Open tasks, Overdue tasks (red if >0), Billable hours this month.
•	FR-DB-03: Client health table sorted by RAG (red first).
•	FR-DB-04: Team workload HorizontalBar (estimated remaining vs capacity), color coded.
•	FR-DB-05: Billable hours by client this month BarChart.
•	FR-DB-06: GHL sync health table with alert if failed > 0.
•	FR-DB-07: My tasks widget (overdue / due today).
•	FR-DB-08: Responsive 2-col desktop, 1-col mobile.
4.14 Existing Dashboard Integration
•	FR-BR-01: dashboard_api schema views: client_summary, project_summary, team_summary, recent_activity.
•	FR-BR-02: SELECT granted to anon and authenticated.
•	FR-BR-03: lib/dashboard-bridge.ts typed query functions.
•	FR-BR-04: DASHBOARD_INTEGRATION.md documents the view schemas.
4.15 Global Search
•	FR-SR-01: Cmd+K opens cmdk command palette.
•	FR-SR-02: Parallel search across clients, projects, tasks, team members.
•	FR-SR-03: Results grouped, ranked, with subtitles; navigate on click.
•	FR-SR-04: Recent searches in localStorage.
4.16 Settings & Administration
•	FR-ST-01: /settings/team: list, invite, toggle is_active, change role.
•	FR-ST-02: /settings/integrations: GHL controls.
•	FR-ST-03: Manage portal users from client detail page.
4.17 Error Handling, Loading States & UX Polish
•	FR-UX-01: error.tsx per route group with retry.
•	FR-UX-02: loading.tsx skeletons for /clients, /projects/[id], /dashboard.
•	FR-UX-03: sonner toasts on server action outcomes.
•	FR-UX-04: Optimistic updates: kanban, mark-as-read, milestone toggle.
•	FR-UX-05: Global error boundary with recovery UI.
 
5. Sequence Diagrams
5.1 GHL Inbound Webhook Processing
GHL events flow into the system, are deduplicated, persisted, and logged.
 
Figure 3 — Sequence: GHL Inbound Webhook
5.2 Task Creation, Assignment & Notification
Captures end-to-end flow when a team member creates and assigns a task.
 
Figure 4 — Sequence: Task Creation & Notification
5.3 Client Portal Milestone Approval
Portal login through RLS-scoped data access, milestone approval, and notification to the project owner.
 
Figure 5 — Sequence: Portal Milestone Approval
 
6. Activity Diagram — Project Lifecycle
The activity diagram below depicts the typical end-to-end project lifecycle from client onboarding through project execution, milestone approval, invoicing, and GHL synchronization.
 
Figure 6 — Activity: Project Lifecycle
 
7. Data Model Overview
The system persists data in Supabase Postgres. All mutation paths set app.current_team_member_id so the change_history trigger captures the actor.
Table	Purpose
clients	CRM clients with status, RAG, GHL linkage, account manager.
team_members	Internal staff users with role, capacity, availability.
projects	Projects tied to a client; owner, status, RAG, dates.
project_sections	Kanban columns within a project.
project_members	Project membership with role.
milestones	Project milestones with target_date and approved_by_client.
tasks	Tasks with section, status, priority, assignee, parent_task_id, estimates.
task_dependencies	Blocked-by relationships.
task_comments	Threaded comments on tasks.
time_entries	Time logs (duration, billable, date, description).
attachments	File metadata linked to entity; files in Supabase Storage.
interactions	Client interactions (type, channel, summary, occurred_at).
client_users	External portal users scoped to a client.
invoices	Invoice records with status, amount, dates, pdf_url.
notifications	Per-recipient notification records.
change_history	Audit trail with old/new values.
ghl_sync_log	Bi-directional GHL sync log.
7.1 Database Enums
client_status, rag_status, project_status, task_status, task_priority, interaction_type, interaction_channel, sync_direction, sync_status, notification_type, access_level, invoice_status, project_member_role, team_member_role, change_action.
7.2 Views
•	v_client_health
•	v_team_workload
•	v_billable_hours_this_month
•	v_ghl_sync_health
•	dashboard_api.client_summary / project_summary / team_summary / recent_activity
 
8. Non-Functional Requirements
Category	Requirement
Security	RLS on all routes; service-role key restricted to Edge Functions; webhooks validated; rate-limited 100/min/IP.
Validation	zod validation; no raw SQL interpolation; parameterised queries only.
Authorization	Server actions check permissions; portal users RLS-scoped.
Performance	recharts via next/dynamic; React.memo on task cards; cursor pagination + load more.
Reliability	Failed GHL syncs retried 3× / 24h; idempotent upserts.
Observability	change_history audit; ghl_sync_log; integrations dashboard.
Usability	Responsive, toasts, optimistic UI, command palette, dark-friendly Tailwind.
Maintainability	TypeScript; auto-generated types; vitest; README + DASHBOARD_INTEGRATION.md.
Deployment	Vercel + Supabase Edge Functions; cron jobs scheduled.
 
9. Environment & Deployment
9.1 Environment Variables
Variable	Purpose
NEXT_PUBLIC_SUPABASE_URL	Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY	Public anon key
SUPABASE_SERVICE_ROLE_KEY	Privileged Edge Function key
GHL_API_KEY	GoHighLevel API key
GHL_LOCATION_ID	GHL location identifier
GHL_WEBHOOK_SECRET	Webhook validation secret
NEXT_PUBLIC_APP_URL	Public app URL
9.2 Deployment Checklist
•	Env vars set in Vercel.
•	supabase functions deploy (ghl-webhook, ghl-sync-outbound, ghl-sync-retry, daily-reminders).
•	GHL webhook URL pointed at Edge Function URL.
•	RLS verified by portal user test.
•	Regenerate types: supabase gen types typescript --project-id <id> > lib/types/database.ts.
•	Cron configured for daily-reminders and ghl-sync-retry.
•	Supabase email confirmations enabled.
•	Full GHL sync cycle tested end-to-end.
 
10. Test Strategy
•	Unit Tests (vitest): GHL field mapping, dedup, failed sync logging.
•	Integration Tests: server actions with change_history capture.
•	RLS Tests: portal scoping; team permissions.
•	E2E: client → project → task → time → milestone → invoice → GHL sync.
•	Performance: pagination, kanban drag, dashboard recharts dynamic import.
11. Assumptions, Dependencies & Risks
11.1 Assumptions
•	Supabase project provisioned + migration applied.
•	GHL sandbox available.
•	SMTP / Supabase Auth email enabled.
11.2 Dependencies
•	GHL API availability and webhook contract stability.
•	Vercel and Supabase platform availability.
•	Existing dashboard consuming dashboard_api.
11.3 Risks
•	GHL API changes — mitigated by ghl_sync_log + retries.
•	Webhook flood — mitigated by rate limiting.
•	RLS misconfiguration — mitigated by mandatory RLS tests.
12. Approval
Role	Name	Signature	Date
Product Owner			
Tech Lead			
QA Lead			
Client Sponsor			


<!-- Sync Impact Report:
- Version change: 1.0.0 (Initial Ratification)
- Modified Principles: Replaced template placeholders with concrete Frontend rules (UI strictness, State Management, Interceptors, Type Safety)
- Added Sections: Project Tech Stack & Quality Gates
- Removed Sections: Generic backend testing references from template
- Templates requiring updates: ✅ tasks-template, ✅ plan-template, ✅ spec-template (Already aligned via Phase 0/1 specs)
- Follow-up TODOs: None
-->

# Galatk Workshop Management Frontend Constitution

## Core Principles

### I. Strict UI Fidelity (No Shadows)

The visual identity of this application relies on a modern, clean, white aesthetic.
The use of `box-shadow` or standard drop shadows is strictly prohibited (`shadow-none` must be enforced globally). Components must rely on borders, spacing, and typography for hierarchy. Use only clean, minimal icons (Lucide Vue Next).

### II. Centralized State & API Communication

All global application state (Authentication, User Profile) MUST be managed via Pinia stores.
All API communication MUST go through the central Axios instance (`src/services/api.ts`). Components should never make raw `fetch` or `axios` calls directly; they must use the defined service wrappers (e.g., `adminService`, `workerService`).

### III. Interceptor-Driven Authentication

Authentication state syncing is handled at the network layer.
The Axios request interceptor MUST automatically attach the JWT token to all outgoing requests. The response interceptor MUST automatically handle 401 Unauthorized errors by clearing local tokens and redirecting to the login view.

### IV. Strong Typing (TypeScript)

TypeScript is non-negotiable.
All API responses, component props, emits, and Pinia state MUST be strongly typed using the interfaces defined in `src/types/index.ts`. Avoid the use of `any`.

### V. Component Segregation by Persona

To maintain security and clean routing, Admin-specific components and Worker-specific components MUST be segregated into their respective directories (`src/components/admin` vs `src/components/worker`) and use distinct layout wrappers (`AdminLayout` vs `WorkerLayout`).

## Technology Stack Constraints

- Framework: Vue 3 (Composition API exclusively using `<script setup>`)
- Styling: Tailwind CSS v4
- Build Tool: Vite
- Icons: Lucide Vue Next
- State: Pinia
- API Client: Axios

## Development Workflow & Quality Gates

Code must pass the following checks before being merged:

1. TypeScript compilation (`tsc --noEmit`).
2. ESLint passing for Vue 3 and TypeScript rules.
3. Strict visual verification against Principle I (No shadows).
4. Forms must include client-side validation for required fields and logical constraints (e.g. no negative units).

## Governance

This Constitution supersedes all ad-hoc decisions. Amendments require documentation and explicit approval. All PRs/reviews must verify compliance with the UI Fidelity and Interceptor-Driven Authentication principles.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24

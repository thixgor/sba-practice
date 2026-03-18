// ---------------------------------------------------------------------------
// Role-Based Access Control (RBAC) for SBA Practice System
// ---------------------------------------------------------------------------
//
// This module defines a static permission matrix mapping each role to the
// set of actions it may perform on each resource. The matrix is evaluated
// at runtime by `checkPermission` and `assertPermission`.
//
// Resources and actions mirror the domain model described in the project
// specification (CLAUDE.md).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User roles supported by the system. */
export type Role = 'admin' | 'user';

/**
 * Protected resources that are subject to access control.
 *
 * - `users`       - User accounts
 * - `cursos`      - Courses
 * - `avaliacoes`  - Assessments / exams
 * - `questoes`    - Individual questions within an assessment
 * - `tentativas`  - Exam attempts
 * - `respostas`   - Individual answers
 * - `relatorios`  - Reports and analytics
 * - `admin`       - Admin panel and admin-only operations
 * - `auditLogs`   - Audit log entries
 */
export type Resource =
  | 'users'
  | 'cursos'
  | 'avaliacoes'
  | 'questoes'
  | 'tentativas'
  | 'respostas'
  | 'relatorios'
  | 'admin'
  | 'auditLogs';

/**
 * Actions that can be performed on a resource.
 *
 * - `create`  - Create a new record
 * - `read`    - Read / list records
 * - `update`  - Modify an existing record
 * - `delete`  - Remove a record
 * - `manage`  - Full control (implies all of the above + any special ops)
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

/** A set of allowed actions for a given resource. */
type PermissionSet = Set<Action>;

/** Maps each resource to its allowed actions. */
type RolePermissions = Record<Resource, PermissionSet>;

// ---------------------------------------------------------------------------
// Helper to define permission sets concisely
// ---------------------------------------------------------------------------

function actions(...acts: Action[]): PermissionSet {
  return new Set(acts);
}

/** All possible actions -- shorthand for admin-level full control. */
const ALL_ACTIONS: PermissionSet = actions('create', 'read', 'update', 'delete', 'manage');

/** No actions allowed. */
const NO_ACTIONS: PermissionSet = new Set<Action>();

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

const PERMISSIONS: Record<Role, RolePermissions> = {
  // -----------------------------------------------------------------------
  // ADMIN - unrestricted access to every resource
  // -----------------------------------------------------------------------
  admin: {
    users:      ALL_ACTIONS,
    cursos:     ALL_ACTIONS,
    avaliacoes: ALL_ACTIONS,
    questoes:   ALL_ACTIONS,
    tentativas: ALL_ACTIONS,
    respostas:  ALL_ACTIONS,
    relatorios: ALL_ACTIONS,
    admin:      ALL_ACTIONS,
    auditLogs:  ALL_ACTIONS,
  },

  // -----------------------------------------------------------------------
  // USER - limited, mostly read-only access plus own attempt management
  // -----------------------------------------------------------------------
  user: {
    // Users can read and update their OWN profile (ownership check is done
    // at the handler level, not here -- RBAC only checks role-level access).
    users:      actions('read', 'update'),

    // Users can browse available courses.
    cursos:     actions('read'),

    // Users can browse and take assessments.
    avaliacoes: actions('read'),

    // Users can read questions during an assessment (served by the API).
    questoes:   actions('read'),

    // Users can create (start), read, and update (submit answers to) their
    // own attempts.
    tentativas: actions('create', 'read', 'update'),

    // Users can create (submit) and read their own answers.
    respostas:  actions('create', 'read'),

    // Users can view their own reports and download PDFs.
    relatorios: actions('read'),

    // Users have no access to the admin panel.
    admin:      NO_ACTIONS,

    // Users cannot view audit logs.
    auditLogs:  NO_ACTIONS,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks whether a given role is allowed to perform an action on a resource.
 *
 * If the role has the `'manage'` action for the resource, it implicitly
 * grants all other actions as well.
 *
 * @param role     The user's role.
 * @param resource The resource being accessed.
 * @param action   The action being attempted.
 * @returns        `true` if the role is permitted to perform the action.
 *
 * @example
 * ```ts
 * if (!checkPermission(user.role, 'avaliacoes', 'create')) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * }
 * ```
 */
export function checkPermission(
  role: Role,
  resource: Resource,
  action: Action,
): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;

  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;

  // `manage` implies all other actions
  if (resourcePerms.has('manage')) return true;

  return resourcePerms.has(action);
}

/**
 * Same as `checkPermission` but throws an error when the check fails.
 * Useful in Server Actions and API routes where you want to fail fast.
 *
 * @throws {PermissionError} with a descriptive message and metadata.
 */
export function assertPermission(
  role: Role,
  resource: Resource,
  action: Action,
): void {
  if (!checkPermission(role, resource, action)) {
    throw new PermissionError(role, resource, action);
  }
}

// ---------------------------------------------------------------------------
// Permission error class
// ---------------------------------------------------------------------------

/**
 * Custom error thrown by `assertPermission` when a role check fails.
 * Handlers can catch this to return an appropriate 403 response.
 */
export class PermissionError extends Error {
  public readonly role: Role;
  public readonly resource: Resource;
  public readonly action: Action;

  constructor(role: Role, resource: Resource, action: Action) {
    super(
      `Role "${role}" is not allowed to "${action}" on resource "${resource}"`,
    );
    this.name = 'PermissionError';
    this.role = role;
    this.resource = resource;
    this.action = action;
  }
}

// ---------------------------------------------------------------------------
// Introspection helpers (useful for admin UIs showing role capabilities)
// ---------------------------------------------------------------------------

/**
 * Returns all actions a role is allowed to perform on a given resource.
 * If the role has `manage`, returns all five actions explicitly.
 */
export function getAllowedActions(role: Role, resource: Resource): Action[] {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return [];

  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return [];

  if (resourcePerms.has('manage')) {
    return ['create', 'read', 'update', 'delete', 'manage'];
  }

  return Array.from(resourcePerms);
}

/**
 * Returns the full permission map for a given role.
 * Useful for serializing to the client (e.g. to conditionally render UI).
 */
export function getRolePermissions(
  role: Role,
): Record<Resource, Action[]> {
  const result: Partial<Record<Resource, Action[]>> = {};
  const resources: Resource[] = [
    'users',
    'cursos',
    'avaliacoes',
    'questoes',
    'tentativas',
    'respostas',
    'relatorios',
    'admin',
    'auditLogs',
  ];

  for (const resource of resources) {
    result[resource] = getAllowedActions(role, resource);
  }

  return result as Record<Resource, Action[]>;
}

/**
 * Checks if a role has ANY permission on a given resource.
 * Useful for deciding whether to show a navigation item at all.
 */
export function hasAnyPermission(role: Role, resource: Resource): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;

  const resourcePerms = rolePerms[resource];
  return resourcePerms !== undefined && resourcePerms.size > 0;
}

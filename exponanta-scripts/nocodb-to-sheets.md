# Roles & Permissions Overview

In NocoDB, roles define what actions members can perform within a Workspace or Base. This document outlines the different roles, their privileges, and how they are applied.

## Roles

NocoDB utilizes the following roles:

*   **Owner**
*   **Creator**
*   **Editor**
*   **Commenter**
*   **Viewer**
*   **No Access**

**Role Precedence:** A role assigned at the Base level takes precedence over a role assigned at the Workspace level.

**Role Hierarchy:**  Higher-level roles inherit all privileges of lower-level roles.

## Role Assignment

Roles are assigned to members at two levels:

*   **Workspace Level:** When a member is invited to a Workspace, they are assigned a default role. This role applies to all Bases within that Workspace, unless overridden at the Base level.  The Workspace creator automatically becomes the Workspace Owner.
*   **Base Level:** Base Owners and Creators can customize permissions at the base level, overriding Workspace-level assignments.

## Role Descriptions

*   **Owner:**
    *   Automatically assigned to the creator of a Workspace or Base.
    *   Grants all privileges, including the ability to delete the Workspace or Base.
    *   There can be only one Owner per Workspace.
*   **Creator:**
    *   Shares all privileges with an Owner, EXCEPT for the ability to delete the Workspace or Base.
    *   Full administrative rights except deletion authority.
*   **Editor:**
    *   Can create and edit records.
    *   Cannot modify the Base schema (e.g., add/delete tables or fields).
*   **Commenter:**
    *   Cannot add or edit records.
    *   Can add comments to existing records.
*   **Viewer:**
    *   Can only view records and associated comments.
    *   Cannot add or edit records or comments.
*   **No Access:**
    *   **Base Level:** Revokes all access to a specific Base.
    *   **Workspace Level:**  Grants no default access to any Base within the Workspace.

## Workspace Level Permissions

The Workspace Owner manages Workspace-level permissions. When a member joins a Workspace, their assigned role applies to all Bases within the Workspace (unless overridden at the Base level).

| Task                             | Owner | Creator | Editor | Commenter | Viewer |
| -------------------------------- | ----- | ------- | ------ | --------- | ------ |
| Invite member to workspace      | ✔️    | ✔️      |        |           |        |
| Manage member access to workspace | ✔️    | ✔️      |        |           |        |
| Remove member access from workspace | ✔️    | ✔️      |        |           |        |
| View members in workspace       | ✔️    | ✔️      |        |           |        |
| Delete Workspace               | ✔️    |         |        |           |        |
| Billing & upgrade options       | ✔️    |         |        |           |        |
| Create a new base                | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
| Access existing bases at assigned roles | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |

## Base Level Permissions

Base Owners and Creators manage Base-level permissions.

### Collaboration

| Task                                     | Owner | Creator | Editor | Commenter | Viewer |
| ---------------------------------------- | ----- | ------- | ------ | --------- | ------ |
| Invite members to base at or below your role | ✔️    | ✔️      |        |           |        |
| Manage members access to base              | ✔️    | ✔️      |        |           |        |
| Remove member access from a base          | ✔️    | ✔️      |        |           |        |
| View members in a base                  | ✔️    | ✔️      |        |           |        |
| Share base                               | ✔️    | ✔️      |        |           |        |
| Share view                               | ✔️    | ✔️      |        |           |        |

### Table & View Operations

| Task                           | Owner | Creator | Editor | Commenter | Viewer |
| ------------------------------ | ----- | ------- | ------ | --------- | ------ |
| Add / modify / delete table    | ✔️    | ✔️      |        |           |        |
| Add / modify / delete fields   | ✔️    | ✔️      |        |           |        |
| Add / modify / delete views    | ✔️    | ✔️      |        |           |        |
| Hide / un-hide / reorder fields | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
| Add / modify / delete sort     | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
| Add / modify / delete filters  | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
| Add / modify / delete group-by | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |

### Record Operations

| Task                           | Owner | Creator | Editor | Commenter | Viewer |
| ------------------------------ | ----- | ------- | ------ | --------- | ------ |
| Add / modify / delete record   | ✔️    | ✔️      | ✔️     |          |        |
| View & add comment on a record  | ✔️    | ✔️      | ✔️     | ✔️        |        |
| View record                    | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |

### Automations & Advanced

| Task               | Owner | Creator | Editor | Commenter | Viewer |
| ------------------ | ----- | ------- | ------ | --------- | ------ |
| Add / modify / delete Webhook | ✔️    | ✔️      |        |           |        |
| ERD (Project & Table relations) | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
| API Snippet         | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
| API Token           | ✔️    | ✔️      | ✔️     | ✔️        | ✔️     |
# Security Specification - MAHALK

## Data Invariants
1. A Product must belong to a Store owned by the creator.
2. An Order can only be read by the customer who placed it or the merchant who owns the store.
3. Recharge codes can only be used once.
4. Admins are the only ones who can verify stores or update subscription status.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Create a store with `ownerId` of another user.
2. **Resource Poisoning**: Create an order with a 1MB string in the `id` field.
3. **Privilege Escalation**: Update a user profile to set `isAdmin: true` (blocked by default deny on fields).
4. **State Shortcutting**: Update an order status from `pending` directly to `delivered` by a non-owner.
5. **PII Leak**: A user attempting to read the `/customers` collection without being the owner.
6. **Orphaned Write**: Create a product for a non-existent store (relational sync check needed).
7. **Ghost Field Update**: Updating a store and adding a `verified: true` field.
8. **Impersonation**: Creating a notification for another user.
9. **Inventory Attack**: Reducing product inventory below zero.
10. **Recharge Reuse**: Updating a used recharge code status back to `active`.
11. **Promo Exploitation**: Updating a promo code to increase its `maxUses`.
12. **Status Lock Bypass**: Updating an order status after it has reached a terminal state (e.g. `cancelled`).

## Test Runner (Logic Check)
These will be verified in `firestore.rules.test.ts`.

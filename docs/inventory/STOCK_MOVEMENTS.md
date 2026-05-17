# Stock Movements

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/inventory/INVENTORY_ENGINE.md`

## Used When

- Implementing movement creation, transfers, damage, adjustments, opening balances, reservations, or inventory counts.

## Do Not Use For

- Cost algorithms; read `INVENTORY_VALUATION.md`.

## Movement Types

- IN.
- OUT.
- TRANSFER_IN.
- TRANSFER_OUT.
- ADJUSTMENT_IN.
- ADJUSTMENT_OUT.
- DAMAGE.
- RETURN_IN.
- RETURN_OUT.
- OPENING.

## Required Fields

- productId.
- warehouseId.
- movementDate.
- type.
- quantity.
- unitCost when valuation applies.
- totalCost when valuation applies.
- currency.
- exchangeRateSnapshot when financial.
- sourceType.
- sourceId.
- sourceLineId.
- notes.
- createdById.

## Rules

- quantity > 0.
- Movement type determines direction.
- Movement must have source.
- Movement cannot be edited after creation.
- Correction requires new movement.
- Financial movement must align with journal effect.

## Transfer Workflow

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> DISPATCHING -> IN_TRANSIT -> RECEIVING -> RECEIVED -> POSTED
```

- Same branch: OUT from source and IN to destination.
- Inter-branch: OUT/IN plus due-to/due-from journals.
- Partial receive only if policy allows.

## Inventory Count Workflow

```text
DRAFT -> COUNTING -> REVIEW -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED -> LOCKED
```

- Counted quantities editable only in COUNTING.
- Differences calculated server-side.
- POSTING creates adjustments for differences.

## Validations

- Product active.
- Warehouse active.
- Period open.
- Available stock sufficient unless override.
- Source document state allows movement.
- No duplicate source movement.

## Implementation Checklist

- [ ] Define source type.
- [ ] Validate movement direction.
- [ ] Lock stock balance.
- [ ] Write movement append-only.
- [ ] Update/rebuild stock balance cache.
- [ ] Add audit.

## Acceptance Criteria

- Every stock effect is traceable.
- Movement source link exists.
- Stock card can be rebuilt from movements.

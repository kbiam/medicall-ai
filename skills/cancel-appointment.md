# Cancel Appointment

Cancels an existing appointment and frees up the slot for others.

## Input
- `appointment_id` (required): The appointment ID to cancel

## Output
Returns success/failure status.

## Example

```sh
curl -s -X POST "http://localhost:3000/api/skills/cancel-appointment" \
  -H "Content-Type: application/json" \
  -d '{"appointment_id": "cmni456"}'
```

```json
{
  "success": true,
  "message": "Appointment cancelled"
}
```

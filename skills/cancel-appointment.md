# Cancel Appointment

Cancels an existing appointment and frees up the slot for others. The appointment record is kept for visibility but the slot becomes available again.

## Input
- `appointment_id` (required): The appointment ID to cancel

## Output
Returns success/failure status.

## Example

```sh
cancel-appointment --appointment_id cmni456
```

```json
{
  "success": true,
  "message": "Appointment cancelled"
}
```

If not found:
```json
{ "success": false, "error": "Appointment not found" }
```

## How to respond

NEVER say appointment_id to the patient.

On success (standalone cancellation):
"Your appointment with Dr. Rajesh Sharma on April 4th has been cancelled. Would you like to book a different time?"

On success (during reschedule):
Do NOT respond to the voice agent yet. Immediately call get-available-slots to find new times, then book the new slot, then respond with the full reschedule confirmation.

On failure:
"I wasn't able to find that appointment. Could you confirm which appointment you'd like to cancel?"

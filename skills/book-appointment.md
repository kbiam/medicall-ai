# Book Appointment

Books an appointment for a patient in a specific slot. Creates the patient record if they don't exist.

## Input
- `slot_id` (required): The slot ID from get-available-slots
- `patient_id` (optional): Existing patient ID
- `patient_name` (optional): For new patients
- `patient_phone` (optional): For new patients, E.164 format

Must provide either `patient_id` OR `patient_phone` + `patient_name`.

## Output
Returns booking confirmation with doctor, date, and time.

## Example

```sh
curl -s -X POST "http://localhost:3000/api/skills/book-appointment" \
  -H "Content-Type: application/json" \
  -d '{"slot_id": "cmni789", "patient_id": "cmni123"}'
```

```json
{
  "success": true,
  "appointment_id": "cmni456",
  "doctor": "Dr. Rajesh Sharma",
  "date": "2026-04-04",
  "time": "09:00"
}
```

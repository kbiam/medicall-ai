# Get Patient Info

Looks up a patient by phone number and returns their profile with upcoming appointments.

## Input
- `phone` (required): Patient phone number in E.164 format (e.g., +919876543210)

## Output
Returns patient name, ID, and list of upcoming appointments with doctor details.

## Example

```sh
curl -s "http://localhost:3000/api/skills/get-patient-info?phone=%2B919876543210"
```

```json
{
  "found": true,
  "patient_id": "cmni123",
  "name": "Kush Bang",
  "phone": "+918160376548",
  "appointments": [
    {
      "appointment_id": "cmni456",
      "date": "2026-04-04",
      "time": "09:00",
      "doctor": "Dr. Rajesh Sharma",
      "specialty": "Cardiology",
      "status": "scheduled"
    }
  ]
}
```

If not found:
```json
{ "found": false }
```

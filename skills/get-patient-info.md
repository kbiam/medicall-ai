# Get Patient Info

Looks up a patient by phone number and returns their profile with upcoming appointments.

## Input
- `phone` (required): Patient phone number in E.164 format (e.g., +919876543210)

## Output
Returns patient name, ID, and list of upcoming appointments with doctor details.

## Example

```sh
get-patient-info --phone +919876543210
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

## How to respond

After getting patient info, personalize your response. Use patient_id for booking and appointment_id for cancellation. NEVER say IDs aloud.

Patient found with appointments:
"Hi Kush! I can see you have an appointment with Dr. Rajesh Sharma on April 4th at 9 AM."

Patient found, no appointments:
"Hi Kush! You don't have any upcoming appointments. Would you like to book one?"

Patient not found:
"I couldn't find an account with that phone number. Could you please provide your name so I can set one up?"

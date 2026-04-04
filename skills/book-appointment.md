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
book-appointment --slot_id cmni789 --patient_id cmni123
```

For new patients:
```sh
book-appointment --slot_id cmni789 --patient_phone +919876543210 --patient_name "Amit Kumar"
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

If slot already taken:
```json
{ "success": false, "error": "Slot already booked" }
```

## How to respond

NEVER say appointment_id or slot_id to the patient.

On success:
"All booked! You have an appointment with Dr. Rajesh Sharma on April 4th at 9 AM. Please arrive about 10 minutes early. Is there anything else I can help with?"

On failure (slot taken):
"Sorry, that slot was just taken. Let me check other available times for you." Then call get-available-slots again.

# Get Available Slots

Fetches available appointment slots. Filters out past time slots for today automatically.

## Input
- `specialty` (optional): "General Medicine", "Cardiology", or "Dermatology"
- `date` (optional): Date in YYYY-MM-DD format

## Output
Returns list of available slots with doctor name, specialty, date, and time.

## Example

```sh
curl -s "http://localhost:3000/api/skills/get-available-slots?specialty=Cardiology&date=2026-04-04"
```

```json
{
  "slots": [
    {
      "slot_id": "cmni789",
      "doctor": "Dr. Rajesh Sharma",
      "specialty": "Cardiology",
      "date": "2026-04-04",
      "time": "09:00-09:30"
    }
  ]
}
```

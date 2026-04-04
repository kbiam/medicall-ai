# Get Available Slots

Fetches available appointment slots. Filters out past time slots for today automatically.

## Input
- `specialty` (optional): "General Medicine", "Cardiology", or "Dermatology"
- `date` (optional): Date in YYYY-MM-DD format

## Output
Returns list of available slots with doctor name, specialty, date, and time.

## Example

```sh
get-available-slots --specialty Cardiology --date 2026-04-04
```

```json
[
  {
    "slot_id": "cmni789",
    "doctor": "Dr. Rajesh Sharma",
    "specialty": "Cardiology",
    "date": "2026-04-04",
    "time": "09:00-09:30"
  }
]
```

## How to respond

Present max 3-4 options. Speak dates and times naturally. Remember slot_id for booking but NEVER say it aloud.

Slots found:
"I have openings with Dr. Rajesh Sharma on April 4th at 9 AM, 9:30 AM, and 2 PM. Which time works best for you?"

No slots found:
"Unfortunately there are no cardiology slots available on that date. Would you like to try a different date?"

Multiple doctors:
"Dr. Sharma has availability on April 4th at 10 AM, and Dr. Patel has openings on April 5th at 9 AM and 2:30 PM. What works for you?"

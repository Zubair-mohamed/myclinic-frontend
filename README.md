// ... existing content ...
### v1.2.3 - Robust Availability Handling
- **Fix:** Implemented strict manual reconstruction of the schedule payload in `views/Availability.tsx` to completely strip all unwanted fields (like internal Mongoose `_id`, `__v`) and ensure `hospital` is sent as a clean ID string or null.
- **Backend:** Added explicit validation for `userId` format in the `PUT /availability` route to prevent server crashes from invalid CastErrors.

### v1.3.0 - Appointments View Overhaul
- **Feature:** Separated "My Appointments" and "Book Appointment" into distinct tabs within the Appointments view.
- **UX:** Improved clarity by showing only one major task at a time (Viewing Schedule vs Booking), reducing visual clutter.
- **Flow:** Users navigating from the "Find Doctor" directory are automatically switched to the "Book Appointment" tab with prefilled data.

### v1.2.2 - Stability Fixes
// ... existing content ...

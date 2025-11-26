Red-Flagged Backend (Node.js, Express, MongoDB)

Quick start

1. Create a `.env` file:

PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/redhunt
JWT_SECRET=supersecretchangeit
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
MAIL_FROM=no-reply@example.com

2. Install dependencies and run seed:

```
npm install
npm run seed
npm run dev
```

API Overview

- Auth
  - POST `/api/auth/employer/register` { companyName, email, password }
  - POST `/api/auth/employer/login` { email, password }
  - POST `/api/auth/admin/register` { name, email, password }
  - POST `/api/auth/admin/login` { email, password }
  - POST `/api/auth/candidate/register` { name, email, password }
  - POST `/api/auth/candidate/login` { email, password }
  - POST `/api/auth/verify-email` { role: `employer|candidate`, email, otp }
  - POST `/api/auth/resend-otp` { role: `employer|candidate`, email }

  Email verification details:
  - Verify OTP
    - Endpoint: `POST /api/auth/verify-email`
    - Body (using email):
      ```json
      { "role": "employer", "email": "user@example.com", "otp": "123456" }
      ```
    - Body (using id):
      ```json
      { "role": "employer", "id": "user_id_here", "otp": "123456" }
      ```
    - Success: `{ "emailVerified": true }`
    - Errors:
      - 400: "role, email or id, and otp are required"
      - 400: "Invalid role"
      - 400: "OTP not requested"
      - 400: "OTP expired" (OTP expires after 10 minutes)
      - 400: "Invalid OTP"
      - 404: "Not found"
  - Resend OTP
    - Endpoint: `POST /api/auth/resend-otp`
    - Body (using email):
      ```json
      { "role": "candidate", "email": "user@example.com" }
      ```
    - Body (using id):
      ```json
      { "role": "candidate", "id": "user_id_here" }
      ```
    - Success: `{ "sent": true }`
    - If already verified: `{ "emailVerified": true }`
    - Errors:
      - 400: "role and email or id are required"
      - 400: "Invalid role"
      - 404: "Not found"

- Admin (requires Bearer token of admin)
  - GET `/api/admin/employers`
  - PATCH `/api/admin/employers/:id/approve`
  - PATCH `/api/admin/employers/:id/reject`
  - PATCH `/api/admin/employers/:id/suspend`
  - PATCH `/api/admin/employers/:id/unsuspend`
  - GET `/api/admin/metrics`
  - GET `/api/admin/reports`
  - GET `/api/admin/candidates`
  - GET `/api/admin/candidate-users`
  - GET `/api/admin/candidate-users/pending`
  - GET `/api/admin/candidate-users/verified`
  - GET `/api/admin/candidate-users/:id`
  - PATCH `/api/admin/candidate-users/:id/approve`
  - PATCH `/api/admin/candidate-users/:id/reject`
  - PATCH `/api/admin/candidate-users/:id/suspend`
  - PATCH `/api/admin/candidate-users/:id/unsuspend`
  - PATCH `/api/admin/candidate-users/:id/status` { status: `pending|approved|rejected|suspended`, notes? }
  - PATCH `/api/admin/candidate-users/:id/update-history/:entryId` { date?, notes? }
  - DELETE `/api/admin/candidate-users/:id/update-history/:entryId`

- Employer (requires Bearer token of employer)
- POST `/api/employer/candidates` { name, uan?, panNumber?, email, mobile?, position?, offerDate?, designation?, currentCompany?, joiningDate?, reason?, notes? }
    - new records now default `joiningStatus` to `not_joined` (UI no longer collects offer status)
    - **NEW**: Automatically sends invitation email to candidate when added
  - GET `/api/employer/verify` (query: `uan` | `email` | `mobile`)
  - GET `/api/employer/candidates` (query: `search?` - optional search by email or UAN)
  - GET `/api/employer/candidates/search` (query: `q` - required search by email or UAN)
  - GET `/api/employer/metrics`
  - GET `/api/employer/reports`
  - GET `/api/employer/profile`
  - PUT `/api/employer/profile` { companyName?, industry?, hrName?, contactNumber?, email?, companyCode? }
  - PATCH `/api/employer/candidate-users/:id` { presentCompany?, designation?, workLocation?, currentCtc?, expectedHikePercentage?, noticePeriod?, negotiableDays?, skillSets?, verificationNotes?, notes? }
    - Updates only allowed fields on a verified candidate user
    - Appends an update-history entry with sequential point, date, employer HR/company name
  - PATCH `/api/employer/candidate-users/:id/update-history/:entryId` { date?, notes? }
    - Only allowed for entries created by this employer
  - DELETE `/api/employer/candidate-users/:id/update-history/:entryId`
    - Only allowed for entries created by this employer

Candidate (requires Bearer token of candidate)

- Notes
  - After registration, candidate must be approved by an admin before login succeeds.
  - Login requires verified email for employer and candidate. Use `/api/auth/verify-email` to verify.
  - All candidate endpoints below require `requireApprovedCandidate`.

- Dashboard APIs
  - GET `/api/candidate/me`
    - Returns the authenticated candidate profile (sans sensitive fields).
  - GET `/api/candidate/update-history`
    - Returns `updateHistory` timeline added by admin/employer.
  - PUT `/api/candidate/profile` { phone?, secondaryEmail?, currentAddress? }
    - Allows candidate to update only personal contact fields.
  - PATCH `/api/candidate/password` { currentPassword, newPassword }
    - Change password (min length 6). Verifies current password.

## Email Invitation System

When an employer adds a candidate through `POST /api/employer/candidates`, the system automatically:

1. **Sends Invitation Email**: A professional invitation email is sent to the candidate's email address
2. **Email Content**: 
   - Personalized greeting with candidate's name
   - Company and HR details
   - Explanation of Red-Flagged platform benefits
   - Direct registration link
   - Professional HTML template with branding

3. **Email Template Features**:
   - Responsive design
   - Company branding
   - Clear call-to-action button
   - Fallback text link
   - Professional styling

4. **Configuration**:
   - Set `FRONTEND_URL` environment variable for registration links
   - Email settings configured in `utils/mailer.js`
   - SMTP settings in environment variables

5. **Error Handling**:
   - Email failures don't affect candidate creation
   - Detailed logging for troubleshooting
   - Graceful degradation


## CandidateUser Update History

Each `CandidateUser` maintains a timeline of updates in `updateHistory`:

- points: Auto-incremented sequence (1, 2, 3, ...)
- date: ISO date when the update occurred
- updatedByRole: `admin | employer`
- updatedByName: Name of admin or HR
- companyName: Employer company name (when role is employer)
- employer: Employer ObjectId (when role is employer)
- admin: Admin ObjectId (when role is admin)
- notes: Optional context (e.g., "approved", "status: suspended")

Example entry:

```json
{
  "points": 3,
  "date": "2025-10-30T10:12:00.000Z",
  "updatedByRole": "employer",
  "updatedByName": "Rahul Verma",
  "companyName": "Acme Corp",
  "employer": "64d...",
  "admin": null,
  "notes": "designation updated to Senior Engineer"
}
```


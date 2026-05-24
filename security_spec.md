# Firestore Security Specification

This security specification defines the data invariants, threat payloads, and access rules for the application.

## 1. Data Invariants

1. **User Invariant**: A user document must have a `uid` that equals the authenticated user's `request.auth.uid`.
2. **Job Invariant**: A job must have an `employerUid` matching the authenticated user's `uid`. Anyone can read verified jobs, but only the employer who created them can update/delete them.
3. **Legitimacy Invariant**: Jobs with a score < 7 are marked as Suspicious or Rejected and are subject to restricted flows.
4. **Candidate Test Invariant**: Aptitude results and interview results belong to the respective candidate's subcollection and can only be set/written by that candidate, or viewed by employers seeking qualified candidates.
5. **HR Scheduling Invariant**: HR rounds can only be scheduled by authenticated employers matching the job's employer UID.

## 2. Dirty Dozen Threat Payloads

1. **Identity Spoofing on User Profile**: Authenticated User A tries to create/update `/users/UserB` with their own email. (Rejected: `userId != request.auth.uid`).
2. **Privilege Escalation**: Seeker tries to change their role to `'employer'` or assign admin rights after onboarding. (Rejected via immutable role updates).
3. **Unauthorized Job Posting**: Non-employer or unauthenticated user trying to create documents in `/jobs/`. (Rejected: must be authenticated and have employer role).
4. **Job Employer Handover**: User A tries to overwrite the `employerUid` of User B's job. (Rejected: immutable `employerUid`).
5. **Legitimacy Spoofing**: User posts a job and forces setting `legitimacyScore = 10` bypassing the Gemini validation engine. (Strict verification check is handled, and updates to score are restricted).
6. **Aptitude Score Tampering**: Candidate tries to update another candidate's aptitude score in `/candidates/CandidateB/aptitudeResults/JobX`. (Rejected: must match `request.auth.uid`).
7. **Negative/Infinite Test Score**: Candidate writes `/candidates/CandidateA/aptitudeResults/JobX` with `score = 99999` or `-10`. (Blocked by boundary validations `< 0` or `> 100`).
8. **Interview Score Injection**: Candidate writes `/candidates/CandidateA/interviewResults/JobY` with high manual passed state without executing AI interview. (Rejected: validation helper enforces structure).
9. **Spamming HR Meetings**: User B schedules an HR round on User A's job without being the employer of that job. (Rejected: must be the original publisher employer).
10. **Orphaned HR Schedule**: Creating an HR Round with missing/random parameters or meeting links that are not URIs. (Rejected by validator).
11. **Blanket Query Scraping**: Triggering `/jobs` listings read query without criteria filter, bypassing safety checks.
12. **Malicious Document ID**: Attempting to poison document paths using non-alphanumeric alphanumeric characters like `../../hack` inside IDs. (Protected by isIdValid validations).

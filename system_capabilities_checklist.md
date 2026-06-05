# EduVid — System Capabilities Checklist

Derived from `system_capabilities.md`. Use this to verify every capability is working.

---

## 1. User Authentication & Session Management

- [x] 1. Users can register and log in using Google accounts via OAuth 2.0
- [x] 2. Expired OAuth 2.0 access tokens are automatically refreshed without re-authentication
- [x] 3. API credentials and OAuth tokens are stored in environment variables, not in client-side code
- [x] 4. All client-server communications are encrypted using SSL/TLS
- [x] 5. Role-based permissions (Student, Peer Tutor, Administrator) are assigned upon authentication
- [x] 6. Users can log out and have their session tokens revoked immediately

---

## 2. Video Upload & Management

- [x] 7. Authenticated peer tutors can upload videos to the Dominion University YouTube channel through the app
- [x] 8. Mandatory academic metadata tagging (Department, Course Code, Level, Topic) is enforced before upload
- [x] 9. Uploaded video metadata is validated for completeness and correctness before processing
- [x] 10. Video metadata (title, description, uploader, tags, YouTube ID, upload date) is stored in Firestore
- [x] 11. Upload progress and confirmation status is displayed to the peer tutor during upload
- [x] 12. Peer tutors can edit metadata of their own previously uploaded videos

---

## 3. Link Integrity & Synchronization

- [ ] 13. The system periodically verifies existence and availability of each video on YouTube
- [ ] 14. Entries are automatically hidden/flagged if the YouTube video is deleted, private, or unavailable
- [ ] 15. Video metadata is updated if the source video's title or description is modified on YouTube
- [ ] 16. Synchronization events and errors are logged for administrative review

---

## 4. Search & Discovery

- [ ] 17. Users can search for videos by course code, department, level, topic, and academic keywords
- [ ] 18. Search and metadata query results are returned in under 2 seconds
- [ ] 19. Filtering options narrow results by Department, Course Code, Level, and Topic
- [ ] 20. Search results are displayed in ranked, relevant order based on user query
- [ ] 21. Users can browse videos by academic category (department or course) without a search query
- [ ] 22. Any course material can be located within 3 clicks from the home screen (3-click rule)

---

## 5. Video Playback & Viewing

- [ ] 23. YouTube-hosted videos are embedded and streamed directly within the application interface
- [ ] 24. Academic metadata (Department, Course Code, Level, Topic, Uploader) is displayed alongside each video
- [ ] 25. View counts are tracked and displayed for each video
- [ ] 26. YouTube's streaming infrastructure is leveraged for scalable, concurrent playback

---

## 6. Peer Interaction & Feedback

- [ ] 27. Authenticated students can post comments on individual videos
- [ ] 28. Authenticated students can rate videos for clarity and accuracy
- [ ] 29. Aggregated ratings (e.g., average clarity score) are displayed on each video
- [ ] 30. Comments and ratings synchronize in real time across all connected devices via Firestore
- [ ] 31. Commenter's name, timestamp, and comment content are displayed for each entry
- [ ] 32. Users can delete their own comments

---

## 7. Administrator Governance & Moderation

- [ ] 33. A dedicated administrator dashboard exists for content moderation and user management
- [ ] 34. Administrators can flag videos that violate content guidelines
- [ ] 35. Administrators can remove or hide flagged videos from public view
- [ ] 36. Administrators can manage user permissions (promote to Peer Tutor, revoke upload privileges)
- [ ] 37. Administrators can view reports on flagged content, user activity, and platform usage
- [ ] 38. Administrators can moderate and delete inappropriate comments

---

## 8. Course Management

- [ ] 39. A structured catalogue of departments, course codes, and academic levels is maintained
- [ ] 40. Administrators can add, edit, or remove courses and departments from the catalogue
- [ ] 41. Uploaded videos are associated with specific courses for organized browsing
- [ ] 42. Course-specific video libraries are displayed for each registered course

---

## 9. User Interface & Usability

- [ ] 43. Mobile-first responsive interface built with Bootstrap 5, works on smartphones, tablets, and desktops
- [ ] 44. Clean navigation structure adhering to the 3-click rule for accessing course material
- [ ] 45. User profile page displays uploaded videos, activity history, and account details
- [ ] 46. Clear visual feedback (loading indicators, success/error messages) for all user actions

---

## 10. Performance, Reliability & Availability

- [ ] 47. API errors and network timeouts are handled gracefully with user-friendly error messages
- [ ] 48. The system supports increasing concurrent users without service degradation
- [ ] 49. High availability with minimal interruptions, leveraging Google's cloud infrastructure
- [ ] 50. Retry logic is implemented for transient API failures (YouTube rate limits, Firestore connectivity)

---

## 11. Real-Time Data & Notifications

- [ ] 51. Video metadata, comments, and ratings synchronize in real time via Firestore listeners
- [ ] 52. Newly uploaded videos appear in search results and course libraries immediately after processing
- [ ] 53. Flagged/hidden video status updates across all user views in real time upon admin action

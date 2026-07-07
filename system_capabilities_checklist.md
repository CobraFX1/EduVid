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

- [x] 13. The system periodically verifies existence and availability of each video on YouTube
- [x] 14. Entries are automatically hidden/flagged if the YouTube video is deleted, private, or unavailable
- [x] 15. Video metadata is updated if the source video's title or description is modified on YouTube
- [x] 16. Synchronization events and errors are logged for administrative review

---

## 4. Search & Discovery

- [x] 17. Users can search for videos by title, topic, and course code via text search, with dropdown filters for Department, Course Code, and Level
- [x] 18. Search and metadata query results are returned in under 2 seconds
- [x] 19. Filtering options narrow results by Department, Course Code, and Level, with Topic discoverable via text search
- [x] 20. Search results are displayed sorted by recency or popularity (view count)
- [x] 21. Users can browse videos by academic category (department or course) without a search query
- [x] 22. Any course material can be located within 3 clicks from the home screen (3-click rule)

---

## 5. Video Playback & Viewing

- [x] 23. YouTube-hosted videos are embedded and streamed directly within the application interface
- [x] 24. Academic metadata (Department, Course Code, Level, Topic, Uploader) is displayed alongside each video
- [x] 25. View counts are tracked and displayed for each video
- [x] 26. YouTube's streaming infrastructure is leveraged for scalable, concurrent playback

---

## 6. Peer Interaction & Feedback

- [x] 27. Authenticated students can post comments on individual videos
- [x] 28. Authenticated students can rate videos for clarity and accuracy
- [x] 29. Aggregated ratings (e.g., average clarity score) are displayed on each video
- [x] 30. Comments and ratings synchronize in real time across all connected devices via Firestore
- [x] 31. Commenter's name, timestamp, and comment content are displayed for each entry
- [x] 32. Users can delete their own comments

---

## 7. Administrator Governance & Moderation

- [x] 33. A dedicated administrator dashboard exists for content moderation and user management
- [x] 34. Authenticated users can flag videos; administrators review and act on flags through the moderation queue
- [x] 35. Administrators can remove or hide flagged videos from public view
- [x] 36. Administrators can manage user permissions (promote to Peer Tutor, revoke upload privileges)
- [x] 37. Administrators can view aggregate platform analytics and review flagged content through dashboard panels
- [x] 38. Administrators can moderate and delete inappropriate comments

---

## 8. Course Management

- [x] 39. A structured catalogue of departments, course codes, and academic levels is maintained
- [x] 40. Administrators can add, edit, or remove courses and departments from the catalogue
- [x] 41. Uploaded videos are associated with specific courses for organized browsing
- [x] 42. Course-specific video libraries are displayed for each registered course

---

## 9. User Interface & Usability

- [x] 43. Responsive interface built with custom CSS3 and Bootstrap 5 utilities, works on smartphones, tablets, and desktops
- [x] 44. Clean navigation structure adhering to the 3-click rule for accessing course material
- [x] 45. User profile page displays uploaded videos, activity history, and account details
- [x] 46. Clear visual feedback (loading indicators, success/error messages) for all user actions

---

## 10. Performance, Reliability & Availability

- [x] 47. API errors and network timeouts are handled gracefully with user-friendly error messages
- [x] 48. The system supports increasing concurrent users without service degradation
- [x] 49. High availability with minimal interruptions, leveraging Google's cloud infrastructure
- [x] 50. Retry logic is implemented for transient API failures (YouTube rate limits, Firestore connectivity)

---

## 11. Real-Time Data & Notifications

- [x] 51. Video metadata, comments, and ratings synchronize in real time via Firestore listeners
- [x] 52. Newly uploaded videos appear in search results and course libraries immediately after processing
- [x] 53. Flagged/hidden video status updates across all user views in real time upon admin action

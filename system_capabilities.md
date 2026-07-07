# EduVid Platform — System Capabilities

A comprehensive list of specific actions and functionalities the system must be able to perform, derived from the project's functional requirements, non-functional requirements, and objectives.

---

## 1. User Authentication & Session Management

1. The system shall allow users to register and log in securely using their Google accounts via OAuth 2.0.
2. The system shall automatically refresh expired OAuth 2.0 access tokens to maintain active user sessions without requiring manual re-authentication.
3. The system shall securely store API credentials and OAuth tokens in environment variables, never exposing them in client-side code.
4. The system shall encrypt all client-server communications using SSL/TLS.
5. The system shall assign role-based permissions (Student, Peer Tutor, Administrator) upon successful authentication.
6. The system shall allow users to log out and have their session tokens revoked immediately.

---

## 2. Video Upload & Management

7. The system shall allow authenticated peer tutors to upload educational videos directly to the designated Dominion University YouTube channel through the application.
8. The system shall enforce mandatory academic metadata tagging (Department, Course Code, Level, and Topic) before a video upload can be submitted.
9. The system shall validate uploaded video metadata for completeness and correctness before processing.
10. The system shall store video metadata (title, description, uploader, tags, YouTube video ID, upload date) in Cloud Firestore upon successful upload.
11. The system shall display upload progress and confirmation status to the peer tutor during the upload process.
12. The system shall allow peer tutors to edit the metadata of their own previously uploaded videos.

---


## 3. Link Integrity & Synchronization

13. The system shall periodically verify the existence and availability of each video on YouTube.
14. The system shall automatically hide or flag entries in the application if the corresponding YouTube video has been deleted, made private, or otherwise becomes unavailable.
15. The system shall update video metadata in the application if the source video's title or description is modified on YouTube.
16. The system shall log synchronization events and errors for administrative review.



---

## 4. Search & Discovery

17. The system shall allow users to search for videos by title, topic, and course code via text search, with dropdown filters available for Department, Course Code, and Level.
18. The system shall return search and metadata query results in under 2 seconds.
19. The system shall provide filtering options to narrow results by Department, Course Code, and Level, with Topic discoverable via text search.
20. The system shall display search results sorted by recency or popularity (view count), with text matching applied to titles, topics, and course codes.
21. The system shall allow users to browse videos by academic category (department or course) without requiring a search query.
22. The system shall ensure that any course material can be located within 3 clicks or fewer from the home screen (3-click rule).

---

## 5. Video Playback & Viewing

23. The system shall embed and stream YouTube-hosted videos directly within the application interface.
24. The system shall display associated academic metadata (Department, Course Code, Level, Topic, Uploader) alongside each video.
25. The system shall track and display view counts for each video.
26. The system shall leverage YouTube's streaming infrastructure to support scalable, concurrent video playback.

---

## 6. Peer Interaction & Feedback

27. The system shall allow authenticated students to post comments on individual videos.
28. The system shall allow authenticated students to rate videos for clarity and accuracy.
29. The system shall display aggregated ratings (e.g., average clarity score, average accuracy score) on each video.
30. The system shall synchronize comments and ratings in real time across all connected user devices using Cloud Firestore.
31. The system shall display the commenter's name, timestamp, and comment content for each entry.
32. The system shall allow users to delete their own comments.

---

## 7. Administrator Governance & Moderation

33. The system shall provide a dedicated administrator dashboard for content moderation and user management.
34. The system shall allow authenticated users to flag videos that violate content guidelines, with administrators reviewing and acting on flagged content through a dedicated moderation queue.
35. The system shall allow administrators to remove or hide flagged videos from public view.
36. The system shall allow administrators to manage user permissions, including promoting users to Peer Tutor or revoking upload privileges.
37. The system shall allow administrators to view aggregate platform analytics and review flagged content through dedicated dashboard panels.
38. The system shall allow administrators to moderate and delete inappropriate comments.

---

## 8. Course Management

39. The system shall maintain a structured catalogue of departments, course codes, and academic levels.
40. The system shall allow administrators to add, edit, or remove courses and departments from the catalogue.
41. The system shall associate uploaded videos with specific courses to enable organized browsing and discovery.
42. The system shall display course-specific video libraries for each registered course.

---

## 9. User Interface & Usability

43. The system shall provide an intuitive, responsive interface built with custom CSS3 and Bootstrap 5 utilities that functions seamlessly on smartphones, tablets, and desktop PCs.
44. The system shall implement a clean navigation structure that adheres to the 3-click rule for accessing any course material.
45. The system shall provide a user profile page displaying the user's uploaded videos, activity history, and account details.
46. The system shall provide clear visual feedback (loading indicators, success/error messages) for all user actions.

---

## 10. Performance, Reliability & Availability

47. The system shall handle API errors and network timeouts gracefully, displaying user-friendly error messages without crashing the interface.
48. The system shall support an increasing number of concurrent users without degradation of service.
49. The system shall maintain high availability with minimal interruptions, leveraging Google's cloud infrastructure.
50. The system shall implement retry logic for transient API failures (e.g., YouTube API rate limits, Firestore connectivity issues).

---

## 11. Real-Time Data & Notifications

51. The system shall synchronize video metadata, comments, and ratings in real time across all active user sessions via Cloud Firestore listeners.
52. The system shall reflect newly uploaded videos in search results and course libraries immediately upon successful processing.
53. The system shall update flagged/hidden video status across all user views in real time when an administrator takes moderation action.

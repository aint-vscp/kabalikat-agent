import { LifeEvent, EventCategory } from "../types";

const REFRESH_URL = "https://oauth2.googleapis.com/token";
const BASE_URL = "https://classroom.googleapis.com/v1";

interface Course {
  id: string;
  name: string;
  alternateLink: string;
  courseState: string;
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  state: string;
  maxPoints?: number;
  workType?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  alternateLink: string;
  materials?: {
     driveFile?: { driveFile: { title: string; alternateLink: string } };
     youtubeVideo?: { title: string; alternateLink: string };
     link?: { title: string; url: string };
     form?: { title: string; formUrl: string };
  }[];
}

interface StudentSubmission {
  id: string;
  courseWorkId: string;
  state: string;
  assignedGrade?: number;
}

export class ClassroomService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const res = await fetch(REFRESH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Failed to refresh token: ${err.error_description || err.error}`);
      }

      const data = await res.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000);
      return this.accessToken!;
    } catch (e) {
      console.error("Auth Error", e);
      throw e;
    }
  }

  // Handle Pagination Automatically
  private async fetchPaged(endpoint: string, listKey: string): Promise<any[]> {
    let items: any[] = [];
    let pageToken: string | undefined = undefined;
    
    // Safety break to prevent infinite loops
    let pageCount = 0;
    const MAX_PAGES = 10;

    do {
       const separator = endpoint.includes('?') ? '&' : '?';
       const url = pageToken ? `${endpoint}${separator}pageToken=${pageToken}` : endpoint;
       
       try {
         const token = await this.getAccessToken();
         const res = await fetch(`${BASE_URL}${url}`, {
           headers: { Authorization: `Bearer ${token}` },
         });
         
         if (!res.ok) {
           console.warn(`Paged Fetch Error on ${url}: ${res.status}`);
           break; 
         }

         const data = await res.json();
         if (data[listKey]) {
            items = [...items, ...data[listKey]];
         }
         
         pageToken = data.nextPageToken;
         pageCount++;
       } catch (e) {
         console.error("Fetch Page Error", e);
         break;
       }
    } while (pageToken && pageCount < MAX_PAGES);

    return items;
  }

  private async fetchAPI(endpoint: string) {
    const token = await this.getAccessToken();
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`API Error ${res.status}: ${res.statusText}`);
    return res.json();
  }

  // --- Core Logic ---

  async fetchAllAssignments(): Promise<LifeEvent[]> {
    const events: LifeEvent[] = [];

    try {
      // Step 1: Get Courses (Paginated)
      const courses: Course[] = await this.fetchPaged("/courses?courseStates=ACTIVE", "courses");

      // Step 2: Loop through Courses
      for (const course of courses) {
        try {
          // Get Work (Paginated)
          const works: CourseWork[] = await this.fetchPaged(`/courses/${course.id}/courseWork?orderBy=dueDate`, "courseWork");

          for (const work of works) {
            // Filter out unpublished (though API query defaults usually handle this)
            if (work.state !== "PUBLISHED") continue;

            let isCompleted = false;
            let grade = undefined;

            try {
              // StudentSubmissions are special: Usually just 1 page for 'me'
              const subRes = await this.fetchAPI(`/courses/${course.id}/courseWork/${work.id}/studentSubmissions`);
              const subs: StudentSubmission[] = subRes.studentSubmissions || [];
              const mySub = subs[0]; 

              if (mySub) {
                // Check if turned in
                if (["TURNED_IN", "RETURNED"].includes(mySub.state)) {
                  isCompleted = true;
                }
                grade = mySub.assignedGrade;
              }
            } catch (e) {
              console.warn(`Failed to fetch subs for ${work.title}`, e);
            }

            // Construct LifeEvent
            if (work.dueDate) {
              const d = work.dueDate;
              const t = work.dueTime || { hours: 23, minutes: 59 };
              
              const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
              const timeStr = `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:00`;
              const startDateTime = `${dateStr}T${timeStr}`;
              
              // Parse Materials for Context
              let materialText = "";
              if (work.materials && work.materials.length > 0) {
                 materialText = "\n\nMaterials:\n";
                 work.materials.slice(0, 3).forEach(m => {
                    if (m.driveFile) materialText += `- [Drive] ${m.driveFile.driveFile.title}\n`;
                    if (m.link) materialText += `- [Link] ${m.link.title}: ${m.link.url}\n`;
                    if (m.youtubeVideo) materialText += `- [Video] ${m.youtubeVideo.title}\n`;
                 });
              }

              events.push({
                id: `classroom_${work.id}`,
                title: `${work.title} (${course.name})`,
                category: "Academic",
                start_time: startDateTime,
                end_time: startDateTime, // Due date is a point in time
                source: "classroom",
                completed: isCompleted,
                subject: course.name,
                room: work.alternateLink, // Use Room field for the direct Classroom Link
                recurrence: 'none'
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch work for course ${course.name}`, e);
        }
      }
    } catch (e) {
      console.error("Failed to fetch courses", e);
    }

    return events;
  }
}

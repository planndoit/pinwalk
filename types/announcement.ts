export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string | null;
  popup_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  body: string;
  published_at: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  publishedAt: string | null;
  popupEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

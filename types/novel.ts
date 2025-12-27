export type NovelStatus = "ONGOING" | "COMPLETED";

export interface Novel {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: NovelStatus;
  views: number;
  coverImage?: string | null;
  author?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

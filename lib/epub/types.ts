export interface EpubMetadata {
  title: string;
  author?: string;
}

export interface EpubChapter {
  title: string;
  order: number;
  contentHtml: string;
  imageUrls?: string[]; // Local image URLs extracted from EPUB
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
}

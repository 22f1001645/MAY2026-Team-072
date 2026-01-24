/**
 * EDITION TYPES
 * 
 * Complete TypeScript interfaces for the Editions system
 * Matches CMS schema from EDITION_PAGE_TEMPLATE_SPEC.md
 */

// Edition Status
export type EditionStatus = 'completed' | 'upcoming';

// Hero Section Data
export interface HeroData {
    type: 'video' | 'image';
    videoUrl?: string;
    videoPoster?: string;
    imageUrl?: string;
    title: string;
    subtitle: string;
    venue: string;
    ctaText?: string;
    ctaLink?: string;
    youtubeId?: string;
}

// Stats Section Data
export interface StatData {
    label: string;
    value: string;
    icon: string;
    color: string;
    description?: string;
}

// Gallery Section Data
export interface GalleryPhoto {
    url: string;
    caption: string;
    photographer?: string;
    timestamp?: string;
}

export interface GalleryData {
    photos: GalleryPhoto[];
    downloadLink?: string;
}

// Timeline Section Data
export interface TimelineEvent {
    time: string;
    title: string;
    description: string;
    photo?: string;
    highlight?: boolean;
    mood?: 'morning' | 'energetic' | 'calm' | 'electric';
}

// Testimonials Section Data
export interface Testimonial {
    name: string;
    quote: string;
    photo?: string;
    studentBody?: string;
    role?: string;
    videoUrl?: string;
}

// Aftermovie Section Data
export interface BehindTheScenes {
    photo: string;
    caption: string;
}

export interface AftermovieData {
    videoUrl: string;
    title: string;
    description: string;
    duration: string;
    downloadLink?: string;
    behindTheScenes?: BehindTheScenes[];
}

// Team Section Data
export interface Organizer {
    name: string;
    role: string;
    photo?: string;
    studentBody?: string;
}

export interface Partner {
    name: string;
    logo: string;
    type: 'society' | 'house' | 'sponsor';
}

export interface VolunteersData {
    count: number;
    photos?: string[];
}

export interface TeamData {
    organizers: Organizer[];
    partners: Partner[];
    volunteers: VolunteersData;
}

// Takeaways Section Data
export interface TakeawaySection {
    title: string;
    points: string[];
}

export interface TakeawayMetric {
    label: string;
    value: string;
    insight: string;
}

export interface TakeawaysData {
    headline: string;
    sections: TakeawaySection[];
    metrics?: TakeawayMetric[];
}

// Next Edition Section Data
export interface NextEditionData {
    city?: string;
    date?: string;
    ctaText: string;
    ctaLink: string;
}

// SEO Data
export interface SEOData {
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
    keywords: string[];
}

// Complete Edition Interface
export interface Edition {
    id: string;
    slug: string;
    city: string;
    year: string;
    status: EditionStatus;
    cardQuote?: string;

    hero: HeroData;
    stats: StatData[];
    gallery: GalleryData;
    timeline: TimelineEvent[];
    testimonials: Testimonial[];
    aftermovie: AftermovieData;
    team: TeamData;
    takeaways: TakeawaysData;
    nextEdition: NextEditionData;
    seo: SEOData;
}

// Dropdown Edition (simplified for navbar)
export interface DropdownEdition {
    id: string;
    slug: string;
    city: string;
    year: string;
    status: EditionStatus;
    date?: string;
}

/**
 * EDITIONS DATA
 * 
 * Hardcoded edition data for initial implementation
 * Replace with CMS fetch in production
 */

import type { Edition, DropdownEdition } from '@/types/edition';

// Dropdown editions list (for navbar)
export const EDITIONS_LIST: DropdownEdition[] = [
    {
        id: '1',
        slug: 'hyderabad-2025',
        city: 'Hyderabad',
        year: '2025',
        status: 'completed',
        date: 'Feb 15-16, 2025'
    },
    {
        id: '2',
        slug: 'bangalore-2025',
        city: 'Bangalore',
        year: '2025',
        status: 'upcoming',
        date: 'Q2 2025'
    },
    {
        id: '3',
        slug: 'delhi-2025',
        city: 'Delhi',
        year: '2025',
        status: 'upcoming',
        date: 'Q3 2025'
    },
    {
        id: '4',
        slug: 'mumbai-2025',
        city: 'Mumbai',
        year: '2025',
        status: 'upcoming',
        date: 'Q4 2025'
    }
];

// Full edition data
export const EDITIONS_DATA: Record<string, Edition> = {
    'hyderabad-2025': {
        id: '1',
        slug: 'hyderabad-2025',
        city: 'Hyderabad',
        year: '2025',
        status: 'completed',
        cardQuote: "The moment 230 strangers became one family",

        hero: {
            type: 'video',
            videoUrl: '/videos/ekatva-hyderabad-aftermovie.mp4',
            videoPoster: '/images/editions/hyderabad-poster.jpg',
            title: 'EKATVA Hyderabad',
            subtitle: 'February 2025',
            venue: 'Ripplez Events Space'
        },

        stats: [
            {
                label: 'Attendees',
                value: '230',
                icon: 'users',
                color: '#5CE6C9',
                description: 'Students from across Hyderabad'
            },
            {
                label: 'Hours of Fest',
                value: '9',
                icon: 'clock',
                color: '#FFCF96',
                description: 'One full day of non-stop celebration'
            },
            {
                label: 'Student Bodies Represented',
                value: '80%+',
                icon: 'groups',
                color: '#5CE6C9',
                description: 'Houses and societies participated'
            },
            {
                label: 'Engagement Rate',
                value: '100%',
                icon: 'trophy',
                color: '#FFCF96',
                description: 'Everyone stayed until DJ night'
            },
            {
                label: 'Meals Served',
                value: '266',
                icon: 'food',
                color: '#5CE6C9',
                description: 'Fresh-cooked on-site by professional chef'
            },
            {
                label: 'Students Transported',
                value: '171',
                icon: 'bus',
                color: '#FFCF96',
                description: '3 bus routes across Hyderabad for free'
            }
        ],

        gallery: {
            photos: [
                {
                    url: '/images/editions/hyderabad/gallery-1.jpg',
                    caption: 'Registration begins - First smiles of the day',
                    timestamp: '10:00 AM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-2.jpg',
                    caption: 'Speed conversations breaking the ice',
                    timestamp: '11:00 AM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-3.jpg',
                    caption: 'Team activities in full swing',
                    timestamp: '12:00 PM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-4.jpg',
                    caption: 'Lunch time - bonding over food',
                    timestamp: '1:00 PM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-5.jpg',
                    caption: 'Cultural performances begin',
                    timestamp: '3:00 PM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-6.jpg',
                    caption: 'Dance performances lighting up the stage',
                    timestamp: '4:00 PM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-7.jpg',
                    caption: 'Group photos capturing memories',
                    timestamp: '5:00 PM'
                },
                {
                    url: '/images/editions/hyderabad/gallery-8.jpg',
                    caption: 'DJ night - the grand finale',
                    timestamp: '6:00 PM'
                }
            ],
            downloadLink: '/downloads/hyderabad-2025-gallery.zip'
        },

        timeline: [
            {
                time: '10:00 AM',
                title: 'Registration Opens',
                description: 'The air buzzed with anticipation. Validating IDs wasn\'t a chore; it was the first handshake of a new community.',
                photo: '/images/editions/hyderabad/timeline/registration.png',
                mood: 'morning'
            },
            {
                time: '11:00 AM',
                title: 'Speed Conversations',
                description: 'Thirty minutes. Ten strangers. One rule: No silence. The room erupted in chaotic, beautiful noise.',
                photo: '/images/editions/hyderabad/timeline/ice-breaker.png',
                highlight: true,
                mood: 'energetic'
            },
            {
                time: '12:00 PM',
                title: 'Team Building',
                description: 'Barriers dissolved. We weren\'t seniors or juniors anymore. We were teammates pulling the same rope.',
                photo: '/images/editions/hyderabad/timeline/team-building.png',
                mood: 'energetic'
            },
            {
                time: '1:00 PM',
                title: 'Lunch & Mingling',
                description: 'More than just food. It was the sound of laughter over shared plates. The moment acquaintances became friends.',
                photo: '/images/editions/hyderabad/timeline/lunch.png',
                mood: 'calm'
            },
            {
                time: '3:00 PM',
                title: 'Cultural Showcase',
                description: 'A hush fell over the crowd. Then, pure awe. We didn\'t know our peers could sing like *that*.',
                photo: '/images/editions/hyderabad/timeline/cultural.png',
                highlight: true,
                mood: 'electric'
            },
            {
                time: '5:00 PM',
                title: 'Open Mic',
                description: 'Raw courage. Trembling hands but steady voices. The audience didn\'t judge; they cheered for every brave soul.',
                photo: '/images/editions/hyderabad/timeline/open-mic.png',
                mood: 'electric'
            },
            {
                time: '6:00 PM',
                title: 'DJ Night Finale',
                description: 'The grand crescendo. We danced until our feet hurt, united under the pulse of the music. Pure, unadulterated joy.',
                photo: '/images/editions/hyderabad/timeline/dj-night.png',
                highlight: true,
                mood: 'electric'
            }
        ],

        testimonials: [
            {
                name: 'Priya Sharma',
                quote: 'EKATVA made me realize I\'m not alone in this journey. Found my study group and lifelong friends here.',
                photo: '/images/editions/hyderabad/testimonial-1.jpg',
                studentBody: 'Pravāha',
                role: 'Attendee'
            },
            {
                name: 'Rahul Menon',
                quote: 'The speed conversations were genius. I made 10 genuine connections in just 30 minutes!',
                photo: '/images/editions/hyderabad/testimonial-2.jpg',
                studentBody: 'Paradox',
                role: 'Attendee'
            },
            {
                name: 'Ananya Reddy',
                quote: 'From nervous introvert to dancing at DJ night - that\'s what EKATVA did to me. No judgment, just vibes.',
                photo: '/images/editions/hyderabad/testimonial-3.jpg',
                studentBody: 'Akord',
                role: 'Volunteer'
            },
            {
                name: 'Karthik Iyer',
                quote: 'I came expecting a typical college fest. Left with a community that genuinely cares.',
                photo: '/images/editions/hyderabad/testimonial-4.jpg',
                studentBody: 'Elysium',
                role: 'Attendee'
            }
        ],

        aftermovie: {
            videoUrl: '/videos/hyderabad-full-aftermovie.mp4',
            title: '230 Students, One Unforgettable Day',
            description: 'Relive every moment of EKATVA Hyderabad through this 4-minute cinematic journey. From nervous hellos at registration to the euphoric DJ night finale.',
            duration: '3:45',
            downloadLink: '/downloads/hyderabad-aftermovie.mp4',
            behindTheScenes: [
                {
                    photo: '/images/editions/hyderabad/bts-1.jpg',
                    caption: 'Setting up at 6 AM - Hours before students arrived'
                },
                {
                    photo: '/images/editions/hyderabad/bts-2.jpg',
                    caption: 'Media team capturing every moment'
                },
                {
                    photo: '/images/editions/hyderabad/bts-3.jpg',
                    caption: 'Food prep for 266 meals'
                }
            ]
        },

        team: {
            organizers: [
                {
                    name: 'Sai Teja',
                    role: 'Lead Coordinator',
                    photo: '/images/editions/hyderabad/team-sai.jpg',
                    studentBody: 'Paradox'
                },
                {
                    name: 'Meera Krishnan',
                    role: 'Event Manager',
                    photo: '/images/editions/hyderabad/team-meera.jpg',
                    studentBody: 'Pravāha'
                },
                {
                    name: 'Arjun Nair',
                    role: 'Logistics Head',
                    photo: '/images/editions/hyderabad/team-arjun.jpg',
                    studentBody: 'Akord'
                },
                {
                    name: 'Divya Sharma',
                    role: 'Creative Director',
                    photo: '/images/editions/hyderabad/team-divya.jpg',
                    studentBody: 'Elysium'
                }
            ],
            partners: [
                { name: 'Pravāha', logo: '/images/logos/pravaha.png', type: 'society' },
                { name: 'Paradox', logo: '/images/logos/paradox.png', type: 'society' },
                { name: 'Akord', logo: '/images/logos/akord.png', type: 'society' },
                { name: 'Elysium', logo: '/images/logos/elysium.png', type: 'house' }
            ],
            volunteers: {
                count: 50,
                photos: [
                    '/images/editions/hyderabad/volunteers-1.jpg',
                    '/images/editions/hyderabad/volunteers-2.jpg'
                ]
            }
        },

        takeaways: {
            headline: 'What We Learned',
            sections: [
                {
                    title: 'What Worked Well',
                    points: [
                        'Speed conversations broke the ice faster than any planned activity',
                        'Free transport ensured 100% attendance from confirmed students',
                        'Cultural performances felt participatory, not just performances',
                        'Zero-elimination games made everyone feel included'
                    ]
                },
                {
                    title: 'Challenges We Overcame',
                    points: [
                        'Last-minute venue change 2 weeks before the event',
                        'Coordinating 3 bus routes across Hyderabad traffic',
                        'Managing dietary preferences for 266 meals',
                        'Sound system issues during cultural performances'
                    ]
                }
            ],
            metrics: [
                {
                    label: 'Engagement Rate',
                    value: '100%',
                    insight: 'Every single student stayed until the DJ night ended at 7 PM. Zero early departures.'
                },
                {
                    label: 'Return Intent',
                    value: '95%',
                    insight: 'Post-event survey showed 95% would attend again and recommend to friends.'
                }
            ]
        },

        nextEdition: {
            city: 'Bangalore',
            date: 'Q2 2025',
            ctaText: 'Explore Bangalore Edition',
            ctaLink: '/editions/bangalore-2025'
        },

        seo: {
            metaTitle: 'EKATVA Hyderabad 2025 | 230 Students, One Unforgettable Day',
            metaDescription: 'Relive EKATVA Hyderabad - the inaugural regional fest that brought 230 IITM BS students together for 9 hours of connection, culture, and community.',
            ogImage: '/images/editions/hyderabad-og.jpg',
            keywords: ['EKATVA', 'Hyderabad', 'IIT Madras BS', 'Regional Fest', '2025', 'Student Community']
        }
    },

    'bangalore-2025': {
        id: '2',
        slug: 'bangalore-2025',
        city: 'Bangalore',
        year: '2025',
        status: 'upcoming',
        cardQuote: "Your city. Your fest. Your moment.",

        hero: {
            type: 'image',
            imageUrl: '/images/editions/bangalore-venue.jpg',
            title: 'EKATVA Bangalore',
            subtitle: 'Coming Q2 2025',
            venue: 'Venue TBA, Bangalore',
            ctaText: 'Register Your Interest',
            ctaLink: '/register/bangalore'
        },

        stats: [
            {
                label: 'Expected Attendees',
                value: '300+',
                icon: 'users',
                color: '#5CE6C9'
            },
            {
                label: 'Hours of Fest',
                value: '10',
                icon: 'clock',
                color: '#FFCF96'
            },
            {
                label: 'Activities Planned',
                value: '15+',
                icon: 'calendar',
                color: '#5CE6C9'
            },
            {
                label: 'Meals Planned',
                value: '350+',
                icon: 'food',
                color: '#FFCF96'
            },
            {
                label: 'Transport Arranged',
                value: 'Yes',
                icon: 'bus',
                color: '#5CE6C9'
            }
        ],

        gallery: {
            photos: [],
            downloadLink: undefined
        },

        timeline: [
            {
                time: '10:00 AM',
                title: 'Registration Opens',
                description: 'Collect your EKATVA kit, meet organizing team, and start connecting.'
            },
            {
                time: '11:00 AM',
                title: 'Speed Conversations',
                description: 'Fast-paced ice breaking proven in Hyderabad. 10 new connections guaranteed.'
            },
            {
                time: '12:00 PM',
                title: 'Team Activities',
                description: 'Collaborative games designed for inclusion, not elimination.'
            },
            {
                time: '1:00 PM',
                title: 'Lunch & Networking',
                description: 'Free meals for all attendees. Connect over food.'
            },
            {
                time: '3:00 PM',
                title: 'Cultural Showcase',
                description: 'Celebrate Bangalore\'s diverse student talent.'
            },
            {
                time: '5:00 PM',
                title: 'Open Mic',
                description: 'Your moment to shine. All talents welcome.'
            },
            {
                time: '6:00 PM',
                title: 'Grand Finale',
                description: 'An evening to remember. Details coming soon.'
            }
        ],

        testimonials: [],

        aftermovie: {
            videoUrl: '',
            title: '',
            description: '',
            duration: ''
        },

        team: {
            organizers: [
                {
                    name: 'Regional Coordinator',
                    role: 'Lead Coordinator',
                    studentBody: 'TBA'
                }
            ],
            partners: [],
            volunteers: {
                count: 0
            }
        },

        takeaways: {
            headline: '',
            sections: []
        },

        nextEdition: {
            city: 'Delhi',
            date: 'Q3 2025',
            ctaText: 'Explore Delhi Edition',
            ctaLink: '/editions/delhi-2025'
        },

        seo: {
            metaTitle: 'EKATVA Bangalore 2025 | Coming Soon',
            metaDescription: 'EKATVA is coming to Bangalore in Q2 2025. Register your interest to be part of the tech capital\'s first regional fest.',
            ogImage: '/images/editions/bangalore-og.jpg',
            keywords: ['EKATVA', 'Bangalore', 'IIT Madras BS', 'Regional Fest', '2025', 'Upcoming']
        }
    }
};

// Helper function to get edition by slug
export function getEditionBySlug(slug: string): Edition | null {
    return EDITIONS_DATA[slug] || null;
}

// Get latest completed edition slug
export function getLatestCompletedEditionSlug(): string {
    const completed = EDITIONS_LIST.filter(e => e.status === 'completed');
    return completed.length > 0 ? completed[0].slug : EDITIONS_LIST[0].slug;
}

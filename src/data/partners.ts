// Partner Communities Data - Hyderabad Edition 2024-2025

export interface GBMember {
    name: string
    role: 'Secretary' | 'Deputy Secretary' | 'Web Admin'
}

export interface PartnerEntity {
    id: string
    name: string
    logo: string
    type: 'House' | 'Society'
    gbMembers: GBMember[]
}

export const PARTNER_ENTITIES: PartnerEntity[] = [
    {
        id: 'pravaha',
        name: 'Pravāha',
        logo: '/images/partners/pravaha.svg',
        type: 'House',
        gbMembers: [
            { name: 'Vishal Bhandari', role: 'Secretary' },
            { name: 'Praharsha Surampudi', role: 'Deputy Secretary' }
        ]
    },
    {
        id: 'boundless',
        name: 'Boundless',
        logo: '/images/partners/boundless.svg',
        type: 'Society',
        gbMembers: [
            { name: 'Sachin', role: 'Secretary' },
            { name: 'Anushka', role: 'Deputy Secretary' }
        ]
    },
    {
        id: 'namdapha',
        name: 'Namdapha',
        logo: '/images/partners/namdapha.svg',
        type: 'House',
        gbMembers: [
            { name: 'Sairaj', role: 'Web Admin' },
            { name: 'Mayank Verma', role: 'Deputy Secretary' }
        ]
    },
    {
        id: 'kanha',
        name: 'Kanha',
        logo: '/images/partners/kanha.svg',
        type: 'House',
        gbMembers: [
            { name: 'Drashti', role: 'Secretary' },
            { name: 'Ekansh Jindal', role: 'Web Admin' },
            { name: 'Shubh Ghiya', role: 'Deputy Secretary' }
        ]
    },
    {
        id: 'sunderbans',
        name: 'Sunderbans',
        logo: '/images/partners/sunderbans.svg',
        type: 'House',
        gbMembers: [
            { name: 'Shreyansh Mall', role: 'Secretary' }
        ]
    },
    {
        id: 'iris',
        name: 'IRIS',
        logo: '/images/partners/iris.svg',
        type: 'Society',
        gbMembers: [
            { name: 'Anshi Jain', role: 'Secretary' }
        ]
    },
    {
        id: 'wayanad',
        name: 'Wayanad',
        logo: '/images/partners/wayanad.svg',
        type: 'House',
        gbMembers: [
            { name: 'Shambhavi', role: 'Secretary' }
        ]
    },
    {
        id: 'kaziranga',
        name: 'Kaziranga',
        logo: '/images/partners/kaziranga.svg',
        type: 'House',
        gbMembers: [
            { name: 'Shiva Kumar', role: 'Deputy Secretary' }
        ]
    },
    {
        id: 'pichavaram',
        name: 'Pichavaram',
        logo: '/images/partners/pichavaram.svg',
        type: 'House',
        gbMembers: [
            { name: 'Chatrapal Singh Rathore', role: 'Secretary' }
        ]
    },
    {
        id: 'nilgiri',
        name: 'Nilgiri',
        logo: '/images/partners/nilgiri.svg',
        type: 'House',
        gbMembers: [
            { name: 'Somshankar Chakraborthy', role: 'Secretary' }
        ]
    },
    {
        id: 'akord',
        name: 'Akord',
        logo: '/images/partners/akord.svg',
        type: 'Society',
        gbMembers: [
            { name: 'Uday Sai', role: 'Secretary' }
        ]
    },
    {
        id: 'nallamala',
        name: 'Nallamala',
        logo: '/images/partners/nallamala.svg',
        type: 'House',
        gbMembers: [
            { name: 'Krishnan', role: 'Web Admin' }
        ]
    },
    {
        id: 'corbett',
        name: 'Corbett',
        logo: '/images/partners/corbett.svg',
        type: 'House',
        gbMembers: [
            { name: 'Harsh Kumar', role: 'Deputy Secretary' }
        ]
    }
]

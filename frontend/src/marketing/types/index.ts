// Component Props Types

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    children: React.ReactNode
}

export interface CardProps {
    children: React.ReactNode
    className?: string
    hover?: boolean
    gradient?: boolean
}

export interface StatCardProps {
    value: string | number
    label: string
    color?: 'teal' | 'gold' | 'white'
    className?: string
}

// Section Types
export interface MemoryWallImage {
    src: string
    alt: string
    caption: string
}

export interface Stat {
    value: string | number
    label: string
    color?: 'teal' | 'gold' | 'white'
}

// Timeline Types
export interface TimelineEvent {
    time: string
    activity: string
    duration: string
    type: 'Logistical' | 'Networking' | 'Educational' | 'Activity' | 'Meal' | 'Entertainment' | 'Celebration' | 'Continuous'
}

// Team Types
export interface TeamMember {
    name: string
    role: string
    image?: string
}

// Event Types
export interface Event {
    id: string
    name: string
    city: string
    date: string
    status: 'completed' | 'upcoming' | 'planned'
    attendees?: number
    image?: string
    description?: string
}

// Form Types
export interface ContactFormData {
    name: string
    email: string
    phone: string
    organization: string
    interestedIn: 'sponsor' | 'partner' | 'organize' | 'general'
    message?: string
}

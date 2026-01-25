'use client'

import FooterValuePill from './FooterValuePill'

interface Value {
    name: string
    description?: string
}

interface FooterPillarProps {
    position: 'left' | 'right'
    values: Value[]
}

export default function FooterPillar({ position, values }: FooterPillarProps) {
    const theme = position === 'left' ? 'teal' : 'gold'
    const alignment = position === 'left' ? 'items-end' : 'items-start'

    return (
        <div className={`
      hidden lg:flex flex-col gap-3 justify-center ${alignment}
    `}>
            {values.map((value, index) => (
                <FooterValuePill
                    key={value.name}
                    value={value.name}
                    description={value.description}
                    theme={theme}
                    delay={0.1 * index}
                />
            ))}
        </div>
    )
}

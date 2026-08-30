import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'
import type { ButtonProps } from '../../types'

/**
 * Button component with variants matching EKATVA Brand Kit
 * - Primary: Teal background for main CTAs
 * - Secondary: Gold background for celebration accents
 * - Ghost: Transparent with white border
 * - Outline: Transparent with teal border
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            className,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles = cn(
            'inline-flex items-center justify-center gap-2',
            'font-bold uppercase tracking-wider rounded-lg',
            'transition-all duration-300 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-oneness-black',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
        )

        const variants = {
            primary: cn(
                'bg-ekatva-teal text-oneness-black',
                'hover:bg-accent-turquoise hover:scale-[1.02]',
                'focus:ring-ekatva-teal',
                'active:scale-[0.98]'
            ),
            secondary: cn(
                'bg-unity-gold text-oneness-black',
                'hover:bg-yellow-300 hover:scale-[1.02]',
                'focus:ring-unity-gold',
                'active:scale-[0.98]'
            ),
            ghost: cn(
                'bg-transparent text-white border-2 border-white',
                'hover:bg-white/10 hover:scale-[1.02]',
                'focus:ring-white',
                'active:scale-[0.98]'
            ),
            outline: cn(
                'bg-transparent text-ekatva-teal border-2 border-ekatva-teal',
                'hover:bg-ekatva-teal/10 hover:scale-[1.02]',
                'focus:ring-ekatva-teal',
                'active:scale-[0.98]'
            ),
        }

        const sizes = {
            sm: 'px-4 py-2 text-xs',
            md: 'px-6 py-3 text-sm',
            lg: 'px-8 py-4 text-base',
        }

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        )
    }
)

Button.displayName = 'Button'

export default Button

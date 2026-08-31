import { create } from 'zustand'
import { PLANET_CONFIGS, PlanetConfig } from '../data/planets'
import { calculateOrbitalPosition, OrbitalPosition } from '../lib/orbital-math'

const MAX_TRAIL_LENGTH = 20

/**
 * Planet runtime state (extends config with position and history)
 */
export interface PlanetState extends PlanetConfig {
    position: OrbitalPosition
    currentAngle: number
    positionHistory: OrbitalPosition[]
}

/**
 * Orbital system view modes
 */
export type ViewMode = 'orbit' | 'planet-expanded'

/**
 * Orbital store state
 */
interface OrbitalState {
    // Data
    planets: PlanetState[]

    // View state
    viewMode: ViewMode
    activePlanetId: string | null
    hoveredPlanetId: string | null
    focusedPlanetIndex: number
    isAnimating: boolean

    // Responsive
    orbitScale: number
    planetSize: number
    centerPosition: { x: number; y: number }

    // Actions
    setHoveredPlanet: (id: string | null) => void
    setActivePlanet: (id: string | null) => void
    setCoreActive: () => void
    updatePlanetAngle: (id: string, angle: number) => void
    updatePlanetPosition: (id: string, position: OrbitalPosition) => void
    setIsAnimating: (isAnimating: boolean) => void
    toggleAnimation: () => void
    setOrbitScale: (scale: number) => void
    setPlanetSize: (size: number) => void
    setCenterPosition: (x: number, y: number) => void
    closePanel: () => void
    focusNextPlanet: () => void
    focusPrevPlanet: () => void
    focusPlanetByIndex: (index: number) => void
    activateFocusedPlanet: () => void
}

// Initialize planets with starting positions
const initializePlanets = (): PlanetState[] => {
    return PLANET_CONFIGS.map((config) => {
        const position = calculateOrbitalPosition(
            config.orbital.radius,
            config.orbital.angle,
            config.orbital.eccentricity
        )
        return {
            ...config,
            position,
            currentAngle: config.orbital.angle,
            positionHistory: [position],
        }
    })
}

/**
 * Zustand store for orbital system state
 */
export const useOrbitalStore = create<OrbitalState>((set, get) => ({
    // Initial state
    planets: initializePlanets(),
    viewMode: 'orbit',
    activePlanetId: 'techno-cultural',  // Default to techno-cultural planet
    hoveredPlanetId: null,
    focusedPlanetIndex: 1,  // Techno-cultural is at index 1
    isAnimating: true,
    orbitScale: 1,
    planetSize: 100,
    centerPosition: { x: 400, y: 400 },

    // Actions
    setHoveredPlanet: (id) =>
        set({ hoveredPlanetId: id }),

    setActivePlanet: (id) =>
        set({
            activePlanetId: id,
            viewMode: id ? 'planet-expanded' : 'orbit',
            isAnimating: !id,
        }),

    setCoreActive: () =>
        set({
            activePlanetId: 'core',
            viewMode: 'planet-expanded',
            isAnimating: false,
        }),

    updatePlanetAngle: (id, angle) =>
        set((state) => ({
            planets: state.planets.map((p) =>
                p.id === id ? { ...p, currentAngle: angle } : p
            ),
        })),

    updatePlanetPosition: (id, position) =>
        set((state) => ({
            planets: state.planets.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        position,
                        positionHistory: [
                            position,
                            ...p.positionHistory.slice(0, MAX_TRAIL_LENGTH - 1),
                        ],
                    }
                    : p
            ),
        })),

    setIsAnimating: (isAnimating) =>
        set({ isAnimating }),

    toggleAnimation: () =>
        set((state) => ({ isAnimating: !state.isAnimating })),

    setOrbitScale: (scale) =>
        set({ orbitScale: scale }),

    setPlanetSize: (size) =>
        set({ planetSize: size }),

    setCenterPosition: (x, y) =>
        set({ centerPosition: { x, y } }),

    closePanel: () =>
        set({
            activePlanetId: 'techno-cultural',  // Reset to default planet
            viewMode: 'orbit',
            isAnimating: true,
        }),

    focusNextPlanet: () =>
        set((state) => ({
            focusedPlanetIndex: (state.focusedPlanetIndex + 1) % state.planets.length,
            hoveredPlanetId: state.planets[(state.focusedPlanetIndex + 1) % state.planets.length].id,
        })),

    focusPrevPlanet: () =>
        set((state) => ({
            focusedPlanetIndex:
                state.focusedPlanetIndex === 0
                    ? state.planets.length - 1
                    : state.focusedPlanetIndex - 1,
            hoveredPlanetId:
                state.planets[
                    state.focusedPlanetIndex === 0
                        ? state.planets.length - 1
                        : state.focusedPlanetIndex - 1
                ].id,
        })),

    focusPlanetByIndex: (index) => {
        const planets = get().planets
        if (index >= 0 && index < planets.length) {
            set({
                focusedPlanetIndex: index,
                hoveredPlanetId: planets[index].id,
            })
        }
    },

    activateFocusedPlanet: () => {
        const { planets, focusedPlanetIndex, setActivePlanet } = get()
        setActivePlanet(planets[focusedPlanetIndex].id)
    },
}))


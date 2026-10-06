import { buildTrajectory } from './physics/apophis.ts'

/** 2025–2036 arası, yakın geçişten iki yöne sayısal olarak entegre edilmiş yörünge. */
export const trajectory = buildTrajectory(4, 7)

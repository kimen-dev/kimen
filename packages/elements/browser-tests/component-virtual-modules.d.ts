declare module 'virtual:kimen-component-registrations' {
  export const componentTags: readonly `ki-${string}`[];
  export function defineAllComponents(): void;
}

declare module 'virtual:kimen-component-fixtures' {
  // Ambient declarations cannot import a relative module with an import statement.
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  export const componentFixtures: Record<string, import('./visual/galleries').ComponentFixture>;
}

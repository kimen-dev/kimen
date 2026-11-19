// Shared browser registration: the Vite plugin walks the source inventory and
// emits one direct import per built tag. A missing module fails the import;
// every cross-cutting test walks the same tags the docs demos register.
export { componentTags, defineAllComponents } from 'virtual:kimen-component-registrations';

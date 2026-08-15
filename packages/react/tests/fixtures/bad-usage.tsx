// S4 fixture: an out-of-union enum prop value that MUST fail to compile
// naming the prop (the manifest types flow through the wrapper).
import { KiButton } from '../../src/ki-button';

export const Bad = () => <KiButton variant="sparkly">Save</KiButton>;
